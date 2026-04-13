import * as d3 from 'd3';
import * as storage from './storage';
import {
    buildPrerequisiteModel,
    calculateProgressionMetrics,
    computeProgressMetrics,
    expandSkillToken,
    PROGRESS_STATUS,
    normalizeProgressStatus,
    transitiveReduceLinks,
} from './utils';
import {
    setupGraph, redrawGraph, renderPositions, updateGraphView,
    createLegend, applyHighlightFilter, findAndFocusNode,
    updateWeightGuides,
} from './graph';
import { getCategoryLabel, getLegacyGroup } from './config';
import type {
    SkillNode,
    SkillLink,
    RawEdge,
    Settings,
    ProgressStatus,
    ProgressState,
    LayoutMode,
    Theme,
    ReweightedSkillDataset,
    ReweightedSkillMetadata,
} from './types';

// --- Constants ---

const DEFAULT_SETTINGS: Settings = {
    theme: 'dark',
    nodeSize: 8,
    lineWidth: 1.5,
    arrowSize: 6,
    repulsion: -250,
    spacing: 100,
    progression: 0.56,
    canvasWidth: 150,
    canvasHeight: 170,
    layoutMode: 'growth-axis',
    transitiveReduction: false,
    progressMode: false,
    offOffDisplay: 'dim',
    snapToGuides: false,
};

const WEIGHT_MIN = 1;
const WEIGHT_MAX = 9;

const DROPDOWN_STATE_KEY = 'sidebarDropdownState';
const PROGRESS_STATE_KEY = 'skillGraphProgressState';
const ALL_SKILLS_LIST_STATE_KEY = 'skillsList:all';
const WORKING_ON_LIST_STATE_KEY = 'skillsList:working';
const NEXT_SKILLS_LIST_STATE_KEY = 'skillsList:next';

// --- Module-level State ---

let masterNodes: SkillNode[] = [];
let masterLinks: SkillLink[] = [];
let simulation: d3.Simulation<SkillNode, SkillLink> | null = null;
let settings: Settings = { ...DEFAULT_SETTINGS };
let edgeTypeByKey = new Map<string, 'required' | 'or'>();
let prerequisiteGroupsByTarget = new Map<string, string[][]>();
let progressState: ProgressState = storage.loadItem<ProgressState>(PROGRESS_STATE_KEY) ?? {};
let activeStudentIndex: number | null = null;
let studentNames: string[] = [];
let cachedSkills: Record<string, string> | null = null;
let reweightedBySkillId = new Map<string, ReweightedSkillMetadata>();
let functionalCategoryOrder = new Map<string, number>();
let continuumBandByWeight = new Map<number, string>();
let checklistFlashTimeoutId: number | null = null;

const dataFile = (fileName: string): string => `${import.meta.env.BASE_URL}data/${fileName}`;

// --- Normalizer Helpers ---

function normalizeLayoutMode(value: unknown): LayoutMode {
    if (value === 'free-force' || value === 'layered-lanes') return value;
    return 'growth-axis';
}

function normalizeTheme(value: unknown): Theme {
    return value === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
}

function applySimplifiedViewSettings(viewSettings: Partial<Settings> | null | undefined): Settings {
    const source = viewSettings ?? {};
    return {
        ...DEFAULT_SETTINGS,
        ...source,
        theme: normalizeTheme(source.theme ?? DEFAULT_SETTINGS.theme),
        progressMode: Boolean(source.progressMode ?? DEFAULT_SETTINGS.progressMode),
        nodeSize: DEFAULT_SETTINGS.nodeSize,
        lineWidth: DEFAULT_SETTINGS.lineWidth,
        arrowSize: DEFAULT_SETTINGS.arrowSize,
        repulsion: DEFAULT_SETTINGS.repulsion,
        spacing: DEFAULT_SETTINGS.spacing,
        progression: DEFAULT_SETTINGS.progression,
        canvasWidth: DEFAULT_SETTINGS.canvasWidth,
        canvasHeight: DEFAULT_SETTINGS.canvasHeight,
        layoutMode: DEFAULT_SETTINGS.layoutMode,
        transitiveReduction: DEFAULT_SETTINGS.transitiveReduction,
        offOffDisplay: DEFAULT_SETTINGS.offOffDisplay,
        snapToGuides: DEFAULT_SETTINGS.snapToGuides,
    };
}

function getViewSettings(): Settings {
    return applySimplifiedViewSettings(storage.loadViewSettings());
}

function getStatusForSkill(skillId: string): string {
    return normalizeProgressStatus(progressState[skillId]);
}

function setStatusForSkill(skillId: string, status: string): void {
    const normalized = normalizeProgressStatus(status);
    if (normalized === PROGRESS_STATUS.NOT_STARTED) {
        delete progressState[skillId];
    } else {
        progressState[skillId] = normalized;
    }
}

function hasActiveStudent(): boolean {
    return activeStudentIndex !== null;
}

function syncChecklistInputsFromProgress(): void {
    const rows = document.querySelectorAll('#skill-checklist-container .all-skills-body .list-item[data-id]');
    rows.forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        const skillId = row.dataset.id;
        if (!skillId) return;
        const status = getStatusForSkill(skillId);
        const workingToggle = row.querySelector('.skill-working-toggle');
        const masteredToggle = row.querySelector('.skill-mastered-toggle');
        if (workingToggle instanceof HTMLInputElement) {
            workingToggle.checked = status !== PROGRESS_STATUS.NOT_STARTED;
        }
        if (masteredToggle instanceof HTMLInputElement) {
            masteredToggle.checked = status === PROGRESS_STATUS.MASTERED;
        }
    });
}

function syncProgressInteractivity(): void {
    const progressEnabled = hasActiveStudent();

    const disableSelectors = [
        '#skill-checklist-container .skill-working-toggle',
        '#skill-checklist-container .skill-mastered-toggle',
        '#skill-checklist-container .category-check-btn',
    ];

    disableSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
                element.disabled = !progressEnabled;
            }
        });
    });
}

function clearChecklistFlash(): void {
    if (checklistFlashTimeoutId !== null) {
        window.clearTimeout(checklistFlashTimeoutId);
        checklistFlashTimeoutId = null;
    }

    document.querySelectorAll('#skill-checklist-container .list-item.checklist-focus').forEach((row) => {
        row.classList.remove('checklist-focus');
    });
}

function focusSkillInChecklist(skillId: string): void {
    if (!hasActiveStudent()) return;

    const checklistSection = document.getElementById('checklist-section');
    if (checklistSection instanceof HTMLDetailsElement) {
        checklistSection.open = true;
    }

    const allSkillsGroup = document.querySelector('#skill-checklist-container .skills-list-group[data-section="all-skills"]');
    if (allSkillsGroup instanceof HTMLDetailsElement) {
        allSkillsGroup.open = true;
        const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};
        if (savedDropdownState[ALL_SKILLS_LIST_STATE_KEY] !== true) {
            savedDropdownState[ALL_SKILLS_LIST_STATE_KEY] = true;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        }
    }

    const row = Array.from(
        document.querySelectorAll<HTMLElement>('#skill-checklist-container .all-skills-body .list-item[data-id]'),
    ).find((element) => element.dataset.id === skillId);
    if (!row) return;

    const categoryGroup = row.closest('.category-group');
    if (categoryGroup instanceof HTMLDetailsElement) {
        categoryGroup.open = true;
        const categoryKey = categoryGroup.dataset.category;
        if (categoryKey) {
            const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};
            if (savedDropdownState[categoryKey] !== true) {
                savedDropdownState[categoryKey] = true;
                storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
            }
        }
    }

    clearChecklistFlash();

    window.requestAnimationFrame(() => {
        row.classList.add('checklist-focus');
        row.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
        });

        checklistFlashTimeoutId = window.setTimeout(() => {
            row.classList.remove('checklist-focus');
            checklistFlashTimeoutId = null;
        }, 1800);
    });
}

function computeNextSkillIds(progressStateById: Map<string, ProgressStatus> | ProgressState): string[] {
    if (!hasActiveStudent()) return [];

    const rawStateMap: Map<string, ProgressStatus> = progressStateById instanceof Map
        ? progressStateById
        : new Map(Object.entries(progressStateById ?? {}) as Array<[string, ProgressStatus]>);

    return [...masterNodes]
        .sort(weightedSort)
        .filter((node) => {
            const status = normalizeProgressStatus(rawStateMap.get(node.id));
            if (status !== PROGRESS_STATUS.NOT_STARTED) return false;

            const prerequisiteGroups = prerequisiteGroupsByTarget.get(node.id) ?? [];
            return prerequisiteGroups.every((group) => {
                return group.some((alternativeId) => {
                    const alternativeStatus = normalizeProgressStatus(rawStateMap.get(alternativeId));
                    return alternativeStatus === PROGRESS_STATUS.IN_PROGRESS || alternativeStatus === PROGRESS_STATUS.MASTERED;
                });
            });
        })
        .map((node) => node.id);
}

function computeWorkingSkillIds(progressStateById: Map<string, ProgressStatus> | ProgressState): string[] {
    if (!hasActiveStudent()) return [];

    const rawStateMap: Map<string, ProgressStatus> = progressStateById instanceof Map
        ? progressStateById
        : new Map(Object.entries(progressStateById ?? {}) as Array<[string, ProgressStatus]>);

    return [...masterNodes]
        .sort(weightedSort)
        .filter((node) => normalizeProgressStatus(rawStateMap.get(node.id)) === PROGRESS_STATUS.IN_PROGRESS)
        .map((node) => node.id);
}

function renderSkillSummaryList(
    selector: string,
    skillIds: string[],
    skills: Record<string, string>,
    emptyMessage: string,
): void {
    const listBody = d3.select(selector);
    if (listBody.empty()) return;

    listBody.html('');

    if (!hasActiveStudent()) {
        listBody.append('div')
            .attr('class', 'empty-list-message')
            .text('Select a student to view this list.');
        return;
    }

    if (skillIds.length === 0) {
        listBody.append('div')
            .attr('class', 'empty-list-message')
            .text(emptyMessage);
        return;
    }

    const items = listBody.selectAll<HTMLDivElement, string>('.list-item')
        .data(skillIds)
        .join('div')
        .attr('class', 'list-item summary-skill-item')
        .attr('data-id', (d) => d);

    const text = items.append('div').attr('class', 'skill-list-text');
    text.append('span').attr('class', 'code').text((d) => d);
    text.append('span').attr('class', 'skill').text((d) => String(skills[d] ?? ''));

    items
        .on('mouseover', (_event: MouseEvent, skillId: string) => applyHighlightFilter([skillId]))
        .on('mouseout', () => applyHighlightFilter([]))
        .on('click', (_event: MouseEvent, skillId: string) => {
            findAndFocusNode(skillId);
        });
}

function renderWorkingOnList(
    skills: Record<string, string>,
    progressStateById: Map<string, ProgressStatus> | ProgressState = progressState,
): void {
    renderSkillSummaryList(
        '#skill-checklist-container .working-on-body',
        computeWorkingSkillIds(progressStateById),
        skills,
        'No skills are marked as working on.',
    );
}

function renderNextSkillsList(
    skills: Record<string, string>,
    progressStateById: Map<string, ProgressStatus> | ProgressState = progressState,
): void {
    renderSkillSummaryList(
        '#skill-checklist-container .next-skills-body',
        computeNextSkillIds(progressStateById),
        skills,
        'No next skills available yet.',
    );
}

function getWeightRatio(weight: number): number {
    const span = Math.max(1, WEIGHT_MAX - WEIGHT_MIN);
    return Math.max(0, Math.min(1, (weight - WEIGHT_MIN) / span));
}

function getVisualGroupOrder(group: string): number {
    return functionalCategoryOrder.get(group) ?? Number.MAX_SAFE_INTEGER;
}

function hydrateNodeMetadata(node: SkillNode, derivedScore: number): void {
    const metadata = reweightedBySkillId.get(node.id);
    const legacyGroup = getLegacyGroup(node.id);
    const fallbackWeight = WEIGHT_MIN + Math.round(derivedScore * (WEIGHT_MAX - WEIGHT_MIN));

    node.visualGroup = metadata?.functionalCategory ?? legacyGroup;
    node.visualGroupOrder = getVisualGroupOrder(node.visualGroup);
    node.categoryWeight = metadata?.categoryWeight ?? fallbackWeight;
    node.continuumBand = metadata?.continuumBand ?? 'Derived continuum';
    node.continuumBandOrder = metadata?.continuumBandOrder ?? 0;
    node.priorityTier = metadata?.priorityTier ?? 'Core';
    node.safetyFlag = Boolean(metadata?.safetyFlag);
    node.originalFamily = metadata?.originalFamily ?? legacyGroup;
    node.originalLevel = metadata?.originalLevel ?? node.categoryWeight;
    node.scoreDelta = metadata?.scoreDelta ?? 0;
    node.weightingNote = metadata?.weightingNote ?? '';
    node.sourceCode = metadata?.sourceCode ?? node.id;
    node.sourceSkill = metadata?.sourceSkill ?? node.description;
    node.groupSize = metadata?.groupSize ?? 1;
    node.groupIndex = metadata?.groupIndex ?? 1;
    node.grouped = Boolean(metadata?.grouped);
    node.withinCategoryOrder = metadata?.withinCategoryOrder ?? 0;
    node.progressionScore = metadata ? getWeightRatio(node.categoryWeight) : derivedScore;
}

function getGraphViewport(): { width: number; height: number } {
    const graphContainer = document.getElementById('graph-container');
    const viewportRect = graphContainer?.getBoundingClientRect();
    if (viewportRect && viewportRect.width > 0 && viewportRect.height > 0) {
        return { width: viewportRect.width, height: viewportRect.height };
    }

    const graphElement = d3.select<SVGSVGElement, unknown>('#network-graph').node();
    const graphRect = graphElement?.getBoundingClientRect();
    return {
        width: graphRect?.width ?? 800,
        height: graphRect?.height ?? 600,
    };
}

function setGraphCanvasSize(width: number, height: number): void {
    const graphElement = document.getElementById('network-graph');
    if (!(graphElement instanceof SVGSVGElement)) return;
    graphElement.style.width = `${Math.max(1, Math.round(width))}px`;
    graphElement.style.height = `${Math.max(1, Math.round(height))}px`;
}

// --- Initialization ---

async function initializeApp(): Promise<void> {
    settings = getViewSettings();
    storage.saveViewSettings(settings);
    applyTheme(settings.theme);

    // 1. Load All Data
    let edgeData: RawEdge[] | undefined;
    let skillsData: Record<string, string> | undefined;
    let appendixAData: Record<string, string[]> | undefined;
    let appendixBData: Record<string, string[]> | undefined;
    let reweightedData: ReweightedSkillDataset | null | undefined = null;

    try {
        [edgeData, skillsData, appendixAData, appendixBData, reweightedData] = await Promise.all([
            d3.json<RawEdge[]>(dataFile('edges.json')),
            d3.json<Record<string, string>>(dataFile('skills.json')),
            d3.json<Record<string, string[]>>(dataFile('appendixA.json')),
            d3.json<Record<string, string[]>>(dataFile('appendixB.json')),
            d3.json<ReweightedSkillDataset>(dataFile('reweighted-skills.json')).catch((error) => {
                console.warn('Continuing without reweighted skill metadata.', error);
                return null;
            }),
        ]);
    } catch (error) {
        console.error("Failed to load data files. Ensure data/ folder is correct.", error);
        alert("Error: Could not load data files. Check console (F12).");
        return;
    }

    if (!edgeData || !skillsData || !appendixAData || !appendixBData) return;

    reweightedBySkillId = new Map(Object.entries(reweightedData?.bySkill ?? {}));
    functionalCategoryOrder = new Map(
        (reweightedData?.categories ?? []).map((category, index) => [category, index]),
    );
    continuumBandByWeight = new Map();
    if (reweightedData) {
        Object.values(reweightedData.bySkill).forEach((metadata) => {
            continuumBandByWeight.set(metadata.categoryWeight, metadata.continuumBand);
        });
    }

    // 2. Prepare Master Data Lists
    masterNodes = Object.keys(skillsData).map(id => ({
        id,
        description: skillsData[id] ?? '',
        prereqCount: appendixAData[id]?.length ?? 0,
        progressionScore: 0,
        progressionDepth: 0,
        visualGroup: getLegacyGroup(id),
        visualGroupOrder: Number.MAX_SAFE_INTEGER,
        categoryWeight: 0,
        continuumBand: 'Derived continuum',
        continuumBandOrder: 0,
        priorityTier: 'Core',
        safetyFlag: false,
        originalFamily: getLegacyGroup(id),
        originalLevel: 0,
        scoreDelta: 0,
        weightingNote: '',
        sourceCode: id,
        sourceSkill: skillsData[id] ?? '',
        groupSize: 1,
        groupIndex: 1,
        grouped: false,
        withinCategoryOrder: 0,
    }));

    const { scoreById, depthById } = calculateProgressionMetrics(masterNodes, edgeData as SkillLink[]);
    masterNodes.forEach((node) => {
        node.progressionDepth = depthById.get(node.id) ?? 0;
        hydrateNodeMetadata(node, scoreById.get(node.id) ?? 0.5);
    });

    const nodeMap = new Map(masterNodes.map(node => [node.id, node]));
    const prerequisiteModel = buildPrerequisiteModel(appendixAData, new Set(nodeMap.keys()));
    edgeTypeByKey = prerequisiteModel.edgeTypeByKey;
    prerequisiteGroupsByTarget = prerequisiteModel.groupsByTarget;

    masterLinks = edgeData
        .filter(d => nodeMap.has(d.source) && nodeMap.has(d.target))
        .map(d => ({ source: nodeMap.get(d.source)!, target: nodeMap.get(d.target)! }));

    // 3. Load Saved Positions
    const savedPositions = storage.loadPositions();
    if (savedPositions) {
        masterNodes.forEach(node => {
            const pos = savedPositions[node.id];
            if (pos) {
                Object.assign(node, pos);
            }
        });
    }

    // 4. Setup Sidebar
    cachedSkills = skillsData;
    populateSidebar(skillsData, appendixAData, appendixBData);

    // 5. Create the Force Simulation
    const { width, height } = getGraphViewport();
    setGraphCanvasSize(width, height);

    simulation = d3.forceSimulation<SkillNode, SkillLink>()
        .force("link", d3.forceLink<SkillNode, SkillLink>().id(d => d.id))
        .force("charge", d3.forceManyBody<SkillNode>())
        .force("x", d3.forceX<SkillNode>(width / 2).strength(0.05))
        .force("y", d3.forceY<SkillNode>(height / 2).strength(0.05))
        .force("collide", d3.forceCollide<SkillNode>())
        .on("tick", renderPositions);

    // 6. Setup Graph Canvas and Initial Draw
    setupGraph('#network-graph', simulation);
    updateActiveGraph();
    createLegend('#legend');
    setupUIListeners();
    setupStudentSlots();
    syncProgressInteractivity();
    updateActiveGraph();
}

/** Builds the active graph view from progress state and current display settings. */
function updateActiveGraph(): void {
    const effectiveSettings = applySimplifiedViewSettings(settings);

    const notStartedNodeIds = new Set(
        masterNodes
            .filter((node) => getStatusForSkill(node.id) === PROGRESS_STATUS.NOT_STARTED)
            .map((node) => node.id),
    );
    const removeOffOffNodes = effectiveSettings.offOffDisplay === 'remove';
    const activeNodeIds = removeOffOffNodes
        ? new Set(masterNodes.filter((node) => !notStartedNodeIds.has(node.id)).map((node) => node.id))
        : new Set(masterNodes.map((node) => node.id));

    const activeNodes = masterNodes.filter((node) => activeNodeIds.has(node.id));
    const filteredLinks = masterLinks.filter((link) => {
        const srcId = typeof link.source === 'string' ? link.source : link.source.id;
        const tgtId = typeof link.target === 'string' ? link.target : link.target.id;
        return activeNodeIds.has(srcId) && activeNodeIds.has(tgtId);
    });
    const activeLinks = effectiveSettings.transitiveReduction
        ? transitiveReduceLinks(activeNodes, filteredLinks)
        : filteredLinks;

    const progressMetrics = computeProgressMetrics(masterNodes, prerequisiteGroupsByTarget, progressState);
    const progressStateById = progressMetrics.stateById;
    const hiddenLinkKeys = getStudentHiddenLinkKeys(activeLinks, progressStateById, effectiveSettings.progressMode);

    redrawGraph(activeNodes, activeLinks, (allNodes) => {
        if (normalizeLayoutMode(effectiveSettings.layoutMode) === 'free-force') {
            storage.savePositions(allNodes);
            return;
        }

        applyLayoutForces(allNodes, effectiveSettings);
        storage.savePositions(allNodes);
        simulation?.alpha(0.08).restart();
    }, {
        edgeTypeByKey,
        progressMode: effectiveSettings.progressMode,
        progressStateById,
        readinessById: progressMetrics.readinessById,
        satisfiedById: progressMetrics.satisfiedById,
        totalById: progressMetrics.totalById,
        suppressedNodeIds: removeOffOffNodes ? new Set() : notStartedNodeIds,
        hiddenLinkKeys,
        onPrimarySelection: focusSkillInChecklist,
    });

    if (cachedSkills) {
        renderWorkingOnList(cachedSkills, progressStateById);
        renderNextSkillsList(cachedSkills, progressStateById);
    }

    applyLayoutForces(activeNodes, effectiveSettings);
    simulation!.alpha(0.18).restart();
}

function compareVisualGroups(left: string, right: string): number {
    const leftOrder = getVisualGroupOrder(left);
    const rightOrder = getVisualGroupOrder(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.localeCompare(right);
}

function weightedSort(a: SkillNode, b: SkillNode): number {
    const groupDiff = compareVisualGroups(a.visualGroup, b.visualGroup);
    if (groupDiff !== 0) return groupDiff;
    const orderDiff = a.withinCategoryOrder - b.withinCategoryOrder;
    if (orderDiff !== 0) return orderDiff;
    const weightDiff = a.categoryWeight - b.categoryWeight;
    if (weightDiff !== 0) return weightDiff;
    const sourceDiff = a.sourceCode.localeCompare(b.sourceCode, undefined, { numeric: true });
    if (sourceDiff !== 0) return sourceDiff;
    const groupedDiff = a.groupIndex - b.groupIndex;
    if (groupedDiff !== 0) return groupedDiff;
    return naturalSort(a, b);
}

function getLinkEndpointIds(link: SkillLink): { sourceId: string; targetId: string } {
    return {
        sourceId: typeof link.source === 'string' ? link.source : link.source.id,
        targetId: typeof link.target === 'string' ? link.target : link.target.id,
    };
}

function getLinkKey(link: SkillLink): string {
    const { sourceId, targetId } = getLinkEndpointIds(link);
    return `${sourceId}=>${targetId}`;
}

function getStudentHiddenLinkKeys(
    links: SkillLink[],
    progressStateById: Map<string, ProgressStatus>,
    progressModeEnabled: boolean,
): Set<string> {
    if (!progressModeEnabled || !hasActiveStudent()) {
        return new Set();
    }

    const engagedNodeIds = new Set(
        masterNodes
            .filter((node) => normalizeProgressStatus(progressStateById.get(node.id)) !== PROGRESS_STATUS.NOT_STARTED)
            .map((node) => node.id),
    );

    if (engagedNodeIds.size === 0) {
        return new Set(links.map(getLinkKey));
    }

    const hiddenLinkKeys = new Set(
        links
            .filter((link) => {
                const { sourceId, targetId } = getLinkEndpointIds(link);
                return !engagedNodeIds.has(sourceId) && !engagedNodeIds.has(targetId);
            })
            .map(getLinkKey),
    );

    return hiddenLinkKeys;
}

function buildContinuumBands(): Array<{ label: string; startLevel: number; endLevel: number }> {
    const bands: Array<{ label: string; startLevel: number; endLevel: number }> = [];
    let currentLabel = '';
    let bandStart = WEIGHT_MIN;

    for (let weight = WEIGHT_MIN; weight <= WEIGHT_MAX; weight += 1) {
        const nextLabel = continuumBandByWeight.get(weight) ?? `Weight ${weight}`;
        if (!currentLabel) {
            currentLabel = nextLabel;
            bandStart = weight;
            continue;
        }
        if (nextLabel !== currentLabel) {
            bands.push({ label: currentLabel, startLevel: bandStart, endLevel: weight - 1 });
            currentLabel = nextLabel;
            bandStart = weight;
        }
    }

    if (currentLabel) {
        bands.push({ label: currentLabel, startLevel: bandStart, endLevel: WEIGHT_MAX });
    }

    return bands;
}

function packLaneRows(nodesInLane: SkillNode[]): {
    rowByNodeId: Map<string, number>;
    rowCount: number;
} {
    const occupiedWeightsByRow: Array<Set<number>> = [];
    const rowByNodeId = new Map<string, number>();

    nodesInLane.forEach((node) => {
        const weight = node.categoryWeight;
        let rowIndex = occupiedWeightsByRow.findIndex((occupiedWeights) => !occupiedWeights.has(weight));

        if (rowIndex === -1) {
            rowIndex = occupiedWeightsByRow.length;
            occupiedWeightsByRow.push(new Set<number>());
        }

        occupiedWeightsByRow[rowIndex]!.add(weight);
        rowByNodeId.set(node.id, rowIndex);
    });

    return {
        rowByNodeId,
        rowCount: occupiedWeightsByRow.length,
    };
}

function buildLaneLayout(
    activeNodes: SkillNode[],
    config: {
        topInset: number;
        bottomInset: number;
        minCanvasHeight: number;
        laneGap: number;
        lanePadding: number;
        laneSpacer: number;
        laneLabelGap: number;
    },
): {
    laneTargets: Map<string, number>;
    lanes: Array<{ key: string; label: string; top: number; bottom: number }>;
    canvasHeight: number;
} {
    const categories = [...new Set(activeNodes.map((node) => node.visualGroup))].sort(compareVisualGroups);
    const rawTargets = new Map<string, number>();
    const rawLanes: Array<{ key: string; label: string; top: number; bottom: number }> = [];
    let cursor = config.topInset;

    categories.forEach((category) => {
        const nodesInLane = activeNodes
            .filter((node) => node.visualGroup === category)
            .sort(weightedSort);
        const { rowByNodeId, rowCount } = packLaneRows(nodesInLane);

        nodesInLane.forEach((node) => {
            const rowIndex = rowByNodeId.get(node.id) ?? 0;
            const y = cursor + config.lanePadding + config.laneLabelGap + rowIndex * config.laneGap;
            rawTargets.set(node.id, y);
        });

        const lastNodeY = rowCount > 0
            ? cursor + config.lanePadding + config.laneLabelGap + (rowCount - 1) * config.laneGap
            : cursor + config.lanePadding + config.laneLabelGap;
        const bottom = Math.max(
            cursor + config.lanePadding * 2 + config.laneLabelGap,
            lastNodeY + config.lanePadding,
        );

        rawLanes.push({
            key: category,
            label: getCategoryLabel(category),
            top: cursor,
            bottom,
        });

        cursor = bottom + config.laneSpacer;
    });

    const contentBottom = rawLanes.length > 0 ? rawLanes[rawLanes.length - 1]!.bottom : config.topInset;
    const canvasHeight = Math.max(config.minCanvasHeight, contentBottom + config.bottomInset);
    const extraSpace = Math.max(0, canvasHeight - (contentBottom + config.bottomInset));
    const verticalOffset = rawLanes.length > 0 ? extraSpace / 2 : 0;
    const laneTargets = new Map<string, number>();
    rawTargets.forEach((value, key) => laneTargets.set(key, value + verticalOffset));
    const lanes = rawLanes.map((lane) => ({
        ...lane,
        top: lane.top + verticalOffset,
        bottom: lane.bottom + verticalOffset,
    }));

    return { laneTargets, lanes, canvasHeight };
}

function buildColumnLayout(
    activeNodes: SkillNode[],
    config: {
        topInset: number;
        bottomInset: number;
        minCanvasHeight: number;
        rowGap: number;
        rowPadding: number;
    },
): {
    yTargets: Map<string, number>;
    canvasHeight: number;
} {
    const columns = new Map<number, SkillNode[]>();
    activeNodes.forEach((node) => {
        const nodes = columns.get(node.categoryWeight) ?? [];
        nodes.push(node);
        columns.set(node.categoryWeight, nodes);
    });
    columns.forEach((nodes) => nodes.sort(weightedSort));

    const maxColumnCount = Math.max(1, ...Array.from(columns.values(), (nodes) => nodes.length));
    const maxColumnHeight = config.rowPadding * 2 + Math.max(0, maxColumnCount - 1) * config.rowGap;
    const canvasHeight = Math.max(
        config.minCanvasHeight,
        config.topInset + config.bottomInset + maxColumnHeight,
    );

    const yTargets = new Map<string, number>();
    columns.forEach((nodes) => {
        const columnHeight = config.rowPadding * 2 + Math.max(0, nodes.length - 1) * config.rowGap;
        const startY = config.topInset + Math.max(0, (canvasHeight - config.topInset - config.bottomInset - columnHeight) / 2);
        nodes.forEach((node, index) => {
            yTargets.set(node.id, startY + config.rowPadding + index * config.rowGap);
        });
    });

    return { yTargets, canvasHeight };
}

/** Applies layout forces for the selected mode. */
function applyLayoutForces(activeNodes: SkillNode[], currentSettings: Settings): void {
    if (!simulation) return;

    const { width: viewportWidth, height: viewportHeight } = getGraphViewport();
    const mode = normalizeLayoutMode(currentSettings.layoutMode);
    const spacingFactor = Math.max(0.5, Math.min(2, currentSettings.spacing / 100));
    const baseCanvasWidth = Math.max(viewportWidth, viewportWidth * (currentSettings.canvasWidth / 100));
    const structuredHeightFactor = 1 + Math.max(0, (currentSettings.canvasHeight - 100) / 100) * 0.4;
    const baseCanvasHeight = Math.max(
        viewportHeight,
        viewportHeight * (mode === 'free-force' ? (currentSettings.canvasHeight / 100) : structuredHeightFactor),
    );
    const stepCount = Math.max(1, WEIGHT_MAX - WEIGHT_MIN);
    const horizontalPadding = Math.max(56, currentSettings.nodeSize * 6);
    const columnGap = Math.max(96, currentSettings.nodeSize * 6.4) * (0.78 + spacingFactor * 0.48);
    const minUsableWidth = stepCount * columnGap;
    const canvasWidth = Math.max(baseCanvasWidth, minUsableWidth + horizontalPadding * 2);
    const usableWidth = Math.max(1, canvasWidth - horizontalPadding * 2);
    const leftEdge = horizontalPadding;
    const progressionStrength = Math.max(0, Math.min(1, currentSettings.progression));
    const shouldSnapToGuides = mode !== 'free-force' && Boolean(currentSettings.snapToGuides);
    const stepWidth = usableWidth / stepCount;
    const topInset = mode === 'layered-lanes' ? 32 : 22;
    const bottomInset = mode === 'layered-lanes' ? 18 : 14;
    const laneGap = Math.max(18, currentSettings.nodeSize * 2.7) * (0.76 + spacingFactor * 0.26);
    const lanePadding = Math.max(12, currentSettings.nodeSize * 1.2);
    const laneSpacer = Math.max(12, laneGap * 0.48);
    const laneLabelGap = Math.max(16, currentSettings.nodeSize * 1.45);
    const rowGap = Math.max(18, currentSettings.nodeSize * 2.9) * (0.68 + spacingFactor * 0.22);
    const rowPadding = Math.max(12, currentSettings.nodeSize * 1.2);
    const snapRatioToGuides = (ratio: number): number => {
        const clamped = Math.max(0, Math.min(1, ratio));
        if (!shouldSnapToGuides) return clamped;
        return Math.round(clamped * stepCount) / stepCount;
    };
    const laneLayout = mode === 'layered-lanes'
        ? buildLaneLayout(activeNodes, {
            topInset,
            bottomInset,
            minCanvasHeight: baseCanvasHeight,
            laneGap,
            lanePadding,
            laneSpacer,
            laneLabelGap,
        })
        : null;
    const columnLayout = mode === 'growth-axis'
        ? buildColumnLayout(activeNodes, {
            topInset,
            bottomInset,
            minCanvasHeight: baseCanvasHeight,
            rowGap,
            rowPadding,
        })
        : null;
    const forceCanvasHeight = Math.max(
        baseCanvasHeight,
        viewportHeight + Math.sqrt(Math.max(1, activeNodes.length)) * laneGap * 2.2,
    );
    const canvasHeight = laneLayout?.canvasHeight ?? columnLayout?.canvasHeight ?? forceCanvasHeight;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    setGraphCanvasSize(canvasWidth, canvasHeight);
    const getWeightedX = (node: SkillNode): number => {
        const snappedRatio = snapRatioToGuides(getWeightRatio(node.categoryWeight));
        const anchor = leftEdge + snappedRatio * usableWidth;
        if (shouldSnapToGuides) return anchor;
        const progressionRatio = Math.max(0, Math.min(1, node.progressionScore ?? snappedRatio));
        const tieOffset = (progressionRatio - snappedRatio) * stepWidth * 0.55;
        return Math.max(leftEdge, Math.min(leftEdge + usableWidth, anchor + tieOffset));
    };
    const getTargetY = (node: SkillNode): number => {
        if (mode === 'layered-lanes') return laneLayout?.laneTargets.get(node.id) ?? centerY;
        if (mode === 'growth-axis') return columnLayout?.yTargets.get(node.id) ?? centerY;
        return centerY;
    };

    const chargeForce = simulation.force<d3.ForceManyBody<SkillNode>>('charge');
    chargeForce?.strength(mode === 'free-force' ? currentSettings.repulsion : 0);

    const collideForce = simulation.force<d3.ForceCollide<SkillNode>>('collide');
    collideForce?.radius(currentSettings.nodeSize + 10);

    const linkForce = simulation.force<d3.ForceLink<SkillNode, SkillLink>>('link');
    linkForce?.distance(40 * spacingFactor);

    if (mode === 'free-force') {
        simulation
            .force('x', d3.forceX<SkillNode>(centerX).strength(0.03))
            .force('y', d3.forceY<SkillNode>(centerY).strength(0.03));
    } else if (mode === 'layered-lanes') {
        simulation
            .force('x', d3.forceX<SkillNode>(getWeightedX).strength(Math.max(0.82, progressionStrength)))
            .force('y', d3.forceY<SkillNode>((node) => laneLayout?.laneTargets.get(node.id) ?? centerY).strength(0.34));
    } else {
        simulation
            .force('x', d3.forceX<SkillNode>(getWeightedX).strength(Math.max(0.55, progressionStrength)))
            .force('y', d3.forceY<SkillNode>(centerY).strength(0.05));
    }

    activeNodes.forEach((node) => {
        if (mode === 'free-force') {
            if (node.layoutPinned) {
                node.layoutPinned = false;
                node.fx = null;
                node.fy = null;
            }
            return;
        }

        const targetX = getWeightedX(node);
        const targetY = getTargetY(node);
        node.layoutPinned = true;
        node.fx = targetX;
        node.fy = targetY;
        node.x = targetX;
        node.y = targetY;
    });

    updateWeightGuides({
        visible: mode !== 'free-force',
        leftEdge,
        usableWidth,
        height: canvasHeight,
        topInset,
        bottomInset,
        minLevel: WEIGHT_MIN,
        maxLevel: WEIGHT_MAX,
        bands: buildContinuumBands(),
        lanes: mode === 'layered-lanes' ? laneLayout?.lanes ?? [] : [],
        snapNodes: shouldSnapToGuides,
    });

    simulation.nodes(activeNodes);
}

function saveProgressState(): void {
    storage.saveItem(PROGRESS_STATE_KEY, progressState);
}

// --- Sorting & Sidebar Management ---

function naturalSort(a: SkillNode, b: SkillNode): number {
    return a.id.localeCompare(b.id, undefined, { numeric: true });
}

type GroupedCategory<T> = {
    key: string;
    label: string;
    items: Array<[string, T]>;
};

function groupDataByCategory<T>(
    data: Record<string, T>,
    nodeObjects: SkillNode[],
): GroupedCategory<T>[] {
    const grouped = new Map<string, Array<[string, T]>>();
    const dataKeys = new Set(Object.keys(data));

    for (const node of nodeObjects) {
        if (!dataKeys.has(node.id)) continue;
        const category = node.visualGroup;
        const items = grouped.get(category) ?? [];
        items.push([node.id, data[node.id]]);
        grouped.set(category, items);
    }

    return [...grouped.entries()]
        .sort(([left], [right]) => compareVisualGroups(left, right))
        .map(([key, items]) => ({
            key,
            label: getCategoryLabel(key),
            items,
        }));
}

function populateSidebar(
    skills: Record<string, string>,
    appendixA: Record<string, string[]>,
    appendixB: Record<string, string[]>,
): void {
    renderSkillChecklist(skills);
    renderAppendix('#appendix-a-modal-container', appendixA, 'appendixA');
    renderAppendix('#appendix-b-modal-container', appendixB, 'appendixB');
}

function renderSkillChecklist(skills: Record<string, string>): void {
    clearChecklistFlash();
    const listContainer = d3.select('#skill-checklist-container');
    listContainer.html('');
    const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};

    const allSkillsGroup = listContainer.append('details')
        .attr('class', 'skills-list-group')
        .attr('data-section', 'all-skills')
        .property('open', savedDropdownState[ALL_SKILLS_LIST_STATE_KEY] ?? true);

    allSkillsGroup.append('summary')
        .attr('class', 'skills-list-summary')
        .text('All Skills Checklist')
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            savedDropdownState[ALL_SKILLS_LIST_STATE_KEY] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    const allSkillsBody = allSkillsGroup.append('div').attr('class', 'skills-list-body all-skills-body');

    const sortedMasterNodes = [...masterNodes].sort(weightedSort);
    const groupedSkills = groupDataByCategory(skills, sortedMasterNodes);

    const categoryGroups = allSkillsBody.selectAll<HTMLDetailsElement, GroupedCategory<string>>('.category-group')
        .data(groupedSkills)
        .join('details')
        .attr('class', 'category-group')
        .attr('data-category', (d) => d.key)
        .property('open', (d) => savedDropdownState[d.key] ?? true);

    const summaries = categoryGroups.append('summary').attr('class', 'category-summary')
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            const category = d3.select<HTMLDetailsElement, GroupedCategory<string>>(parent).datum().key;
            savedDropdownState[category] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    summaries.append('span').text((d) => d.label);

    const btnGroup = summaries.append('span').attr('class', 'category-btn-group');
    btnGroup.append('button')
        .attr('class', 'category-check-btn')
        .text('Clear')
        .on('click', (event: MouseEvent, d: GroupedCategory<string>) => {
            event.preventDefault();
            event.stopPropagation();
            if (!hasActiveStudent()) return;
            d.items.forEach(([id]) => setStatusForSkill(id, PROGRESS_STATUS.NOT_STARTED));
            saveProgressState();
            syncChecklistInputsFromProgress();
            updateActiveGraph();
        });

    const checklistHeaders = categoryGroups.append('div').attr('class', 'skill-checklist-header');
    const checklistToggleLabels = checklistHeaders.append('div').attr('class', 'skill-checklist-toggle-labels');
    checklistToggleLabels.append('span').text('Developing');
    checklistToggleLabels.append('span').text('Attained');
    checklistHeaders.append('div').attr('class', 'skill-checklist-header-skill').text('Skill');

    type SkillEntry = [string, string];

    const items = categoryGroups.selectAll<HTMLDivElement, SkillEntry>('.list-item')
        .data((d) => d.items)
        .join('div')
        .attr('class', 'list-item')
        .attr('data-id', (d) => d[0]);

    const stateControls = items.append('div').attr('class', 'skill-state-toggles');
    stateControls.append('input')
        .attr('type', 'checkbox')
        .attr('class', 'skill-working-toggle')
        .attr('title', 'Working on this skill');
    stateControls.append('input')
        .attr('type', 'checkbox')
        .attr('class', 'skill-mastered-toggle')
        .attr('title', 'Mastered this skill');

    const text = items.append('div').attr('class', 'skill-list-text');
    text.append('span').attr('class', 'code').text((d) => d[0]);
    text.append('span').attr('class', 'skill').text((d) => String(d[1]));

    const workingOnGroup = listContainer.append('details')
        .attr('class', 'skills-list-group')
        .attr('data-section', 'working-on')
        .property('open', savedDropdownState[WORKING_ON_LIST_STATE_KEY] ?? true);

    workingOnGroup.append('summary')
        .attr('class', 'skills-list-summary')
        .text('Working On List')
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            savedDropdownState[WORKING_ON_LIST_STATE_KEY] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    workingOnGroup.append('div').attr('class', 'skills-list-body working-on-body');

    const nextSkillsGroup = listContainer.append('details')
        .attr('class', 'skills-list-group')
        .attr('data-section', 'next-skills')
        .property('open', savedDropdownState[NEXT_SKILLS_LIST_STATE_KEY] ?? true);

    nextSkillsGroup.append('summary')
        .attr('class', 'skills-list-summary')
        .text('Next Skills List')
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            savedDropdownState[NEXT_SKILLS_LIST_STATE_KEY] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    nextSkillsGroup.append('div').attr('class', 'skills-list-body next-skills-body');

    listContainer.on('change', handleSkillStatusToggleChange);
    renderWorkingOnList(skills);
    renderNextSkillsList(skills);
    syncChecklistInputsFromProgress();
    syncProgressInteractivity();
}

function handleSkillStatusToggleChange(event: Event): void {
    if (!hasActiveStudent()) {
        syncChecklistInputsFromProgress();
        return;
    }

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains('skill-working-toggle') && !target.classList.contains('skill-mastered-toggle')) return;

    const row = target.closest('.list-item');
    if (!(row instanceof HTMLElement)) return;
    const skillId = row.dataset.id;
    if (!skillId) return;

    const workingToggle = row.querySelector('.skill-working-toggle');
    const masteredToggle = row.querySelector('.skill-mastered-toggle');
    const workingChecked = workingToggle instanceof HTMLInputElement ? workingToggle.checked : false;
    const masteredChecked = masteredToggle instanceof HTMLInputElement ? masteredToggle.checked : false;

    if (masteredChecked) {
        setStatusForSkill(skillId, PROGRESS_STATUS.MASTERED);
    } else if (workingChecked) {
        setStatusForSkill(skillId, PROGRESS_STATUS.IN_PROGRESS);
    } else {
        setStatusForSkill(skillId, PROGRESS_STATUS.NOT_STARTED);
    }

    saveProgressState();
    syncChecklistInputsFromProgress();
    updateActiveGraph();
}

function renderAppendix(selector: string, data: Record<string, string[]>, stateKeyPrefix: string): void {
    const listContainer = d3.select(selector);
    listContainer.html('');
    const groupedData = groupDataByCategory(data, [...masterNodes].sort(weightedSort));
    const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};

    const categoryGroups = listContainer.selectAll<HTMLDetailsElement, GroupedCategory<string[]>>('.category-group')
        .data(groupedData)
        .join('details').attr('class', 'category-group')
        .property('open', (d) => savedDropdownState[`${stateKeyPrefix}:${d.key}`] ?? false);

    categoryGroups.append('summary').attr('class', 'category-summary').text((d) => d.label)
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            const category = d3.select<HTMLDetailsElement, GroupedCategory<string[]>>(parent).datum().key;
            savedDropdownState[`${stateKeyPrefix}:${category}`] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    type SkillEntry = [string, string[]];

    categoryGroups.selectAll<HTMLDivElement, SkillEntry>('.list-item')
        .data((d) => d.items)
        .join('div').attr('class', 'list-item')
        .attr('data-id', (d) => d[0])
        .on('mouseover', (_e: MouseEvent, d: SkillEntry) => applyHighlightFilter([d[0], ...parseRange(d[1])]))
        .on('mouseout', () => applyHighlightFilter([]))
        .html((d) => `<span class="code">${d[0]}</span><span class="skill">${String(d[1])}</span>`);
}

function parseRange(rangeString: unknown): string[] {
    if (Array.isArray(rangeString)) {
        return (rangeString as unknown[])
            .map((value) => String(value).trim())
            .filter(Boolean)
            .flatMap((token) => expandSkillToken(token));
    }

    const str = String(rangeString).trim();
    const expanded = expandSkillToken(str);
    return expanded.length > 0 ? expanded : [str].filter(Boolean);
}

// --- Sidebar Resize ---

function setupSidebarResize(): void {
    const sidebar = document.getElementById('sidebar');
    const handle = document.getElementById('sidebar-resize-handle');
    if (!sidebar || !handle) return;

    const MIN_WIDTH = 180;
    const MAX_WIDTH = 700;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let resizeFrame = 0;

    const queueLayoutRefresh = (): void => {
        if (resizeFrame !== 0) return;
        resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            if (!simulation) return;
            applyLayoutForces(simulation.nodes(), settings);
            simulation.alpha(0.08).restart();
        });
    };

    handle.addEventListener('mousedown', (e: MouseEvent) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX)));
        sidebar.style.width = `${newWidth}px`;
        queueLayoutRefresh();
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        queueLayoutRefresh();
    });
}

// --- UI Event Listeners ---

function setupUIListeners(): void {
    setupSidebarResize();

    const infoPanelCloseButton = document.getElementById('info-panel-close');
    if (infoPanelCloseButton instanceof HTMLButtonElement) {
        infoPanelCloseButton.addEventListener('click', () => {
            const infoPanel = document.getElementById('info-panel');
            if (infoPanel) infoPanel.style.display = 'none';
        });
    }

    settings = getViewSettings();
    storage.saveViewSettings(settings);
    applyTheme(settings.theme);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle instanceof HTMLInputElement) {
        themeToggle.checked = settings.theme === 'dark';
        themeToggle.addEventListener('change', () => {
            settings.theme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(settings.theme);
            updateGraphView(settings);
            storage.saveViewSettings(settings);
        });
    }

    window.addEventListener('resize', () => {
        applyLayoutForces(simulation!.nodes(), settings);
        simulation!.alpha(0.1).restart();
    });

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const viewAppendixesBtn = document.getElementById('view-appendixes-btn');
    const appendixModal = document.getElementById('appendix-modal');
    const appendixModalClose = document.getElementById('appendix-modal-close');

    const setAppendixModalOpen = (open: boolean): void => {
        if (!(appendixModal instanceof HTMLElement)) return;
        appendixModal.hidden = !open;
    };

    function handleSearch(): void {
        if (!(searchInput instanceof HTMLInputElement)) return;
        const query = searchInput.value.trim();
        if (!query) return;
        const found = findAndFocusNode(query);
        if (!found) {
            searchInput.classList.add('shake');
            setTimeout(() => searchInput.classList.remove('shake'), 500);
        }
    }

    if (searchBtn instanceof HTMLButtonElement) {
        searchBtn.addEventListener('click', handleSearch);
    }
    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    if (viewAppendixesBtn instanceof HTMLButtonElement) {
        viewAppendixesBtn.addEventListener('click', () => setAppendixModalOpen(true));
    }

    if (appendixModalClose instanceof HTMLButtonElement) {
        appendixModalClose.addEventListener('click', () => setAppendixModalOpen(false));
    }

    if (appendixModal instanceof HTMLElement) {
        appendixModal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === appendixModal) {
                setAppendixModalOpen(false);
            }
        });
    }

    document.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setAppendixModalOpen(false);
        }
    });
}

// --- Student Slots ---

function syncSettingsToUI(): void {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle instanceof HTMLInputElement) {
        themeToggle.checked = settings.theme === 'dark';
    }
    applyTheme(settings.theme);
    updateGraphView(settings);
    syncProgressInteractivity();
}

function switchToStudent(newIndex: number): void {
    if (activeStudentIndex === newIndex) {
        storage.saveStudentState(newIndex, masterNodes);
        activeStudentIndex = null;
        storage.saveActiveStudent(null);
        settings.progressMode = false;
        storage.saveViewSettings(settings);
        progressState = {};
        storage.saveItem(PROGRESS_STATE_KEY, progressState);
        syncSettingsToUI();
        syncChecklistInputsFromProgress();
        updateActiveGraph();
        if (cachedSkills) renderSkillChecklist(cachedSkills);
        updateStudentButtonStates();
        return;
    }

    if (activeStudentIndex !== null) {
        storage.saveStudentState(activeStudentIndex, masterNodes);
    }

    const newState = storage.loadStudentState(newIndex);

    storage.saveItem(DROPDOWN_STATE_KEY, newState.sidebarDropdownState ?? {});

    const globalTheme = settings.theme;
    Object.assign(settings, applySimplifiedViewSettings(newState.skillGraphViewSettings));
    settings.theme = globalTheme;
    settings.progressMode = true;
    storage.saveViewSettings(settings);

    progressState = newState.skillGraphProgressState ?? {};
    storage.saveItem(PROGRESS_STATE_KEY, progressState);

    const positions = newState.skillGraphPositions;
    masterNodes.forEach(node => {
        if (positions && positions[node.id]) {
            Object.assign(node, positions[node.id]);
        } else {
            node.fx = null;
            node.fy = null;
            node.x = undefined;
            node.y = undefined;
        }
    });
    if (positions) storage.saveItem('skillGraphPositions', positions);

    activeStudentIndex = newIndex;
    storage.saveActiveStudent(newIndex);

    syncSettingsToUI();
    updateActiveGraph();
    if (cachedSkills) renderSkillChecklist(cachedSkills);
    updateStudentButtonStates();
}

function updateStudentButtonStates(): void {
    const grid = document.getElementById('student-slots-grid');
    if (!grid) return;
    grid.querySelectorAll('.student-slot-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === activeStudentIndex);
    });
}

function startRename(btn: HTMLButtonElement, index: number): void {
    const nameSpan = btn.querySelector('.student-name');
    if (!nameSpan || btn.querySelector('.student-name-input')) return;

    const originalName = nameSpan.textContent ?? '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'student-name-input';
    input.value = originalName;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    function finishRename(): void {
        const newName = input.value.trim() || originalName;
        const span = document.createElement('span');
        span.className = 'student-name';
        span.textContent = newName;
        input.replaceWith(span);
        studentNames[index] = newName;
        storage.saveStudentNames(studentNames);
    }

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.value = originalName;
            input.blur();
        }
    });
}

function setupStudentSlots(): void {
    studentNames = storage.loadStudentNames();
    const savedActiveIndex = storage.loadActiveStudent();

    const grid = document.getElementById('student-slots-grid');
    if (!grid) return;
    grid.innerHTML = '';

    studentNames.forEach((name, index) => {
        const btn = document.createElement('button');
        btn.className = 'student-slot-btn';
        btn.type = 'button';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'student-name';
        nameSpan.textContent = name;
        btn.appendChild(nameSpan);

        btn.addEventListener('click', () => switchToStudent(index));
        btn.addEventListener('dblclick', (e: MouseEvent) => {
            e.stopPropagation();
            startRename(btn, index);
        });

        grid.appendChild(btn);
    });

    if (savedActiveIndex !== null) {
        activeStudentIndex = savedActiveIndex;
    } else {
        progressState = {};
        storage.saveItem(PROGRESS_STATE_KEY, progressState);
    }
    settings.progressMode = activeStudentIndex !== null;
    storage.saveViewSettings(settings);
    updateStudentButtonStates();
    syncProgressInteractivity();
}

// --- App Start ---
document.addEventListener('DOMContentLoaded', initializeApp);
