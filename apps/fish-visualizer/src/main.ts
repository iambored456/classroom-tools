import * as d3 from 'd3';
import * as storage from './storage';
import {
    buildPrerequisiteModel,
    calculateProgressionMetrics,
    computeProgressMetrics,
    PROGRESS_STATUS,
    normalizeProgressStatus,
    transitiveReduceLinks,
} from './utils';
import {
    setupGraph, redrawGraph, renderPositions, updateGraphView,
    createLegend, applyHighlightFilter, findAndFocusNode, getSelectedNodeIds,
    updateWeightGuides,
} from './graph';
import { CATEGORY_LABELS } from './config';
import type {
    SkillNode,
    SkillLink,
    RawEdge,
    Settings,
    ProgressState,
    ProgressMetrics,
    NumericSettingKey,
    LayoutMode,
    OffOffDisplay,
    Theme,
    SavedPositions,
} from './types';

// --- Constants ---

const DEFAULT_SETTINGS: Settings = {
    theme: 'dark',
    nodeSize: 8,
    lineWidth: 1.5,
    arrowSize: 6,
    repulsion: -250,
    spacing: 100,
    progression: 0.22,
    layoutMode: 'growth-axis',
    transitiveReduction: false,
    progressMode: false,
    offOffDisplay: 'dim',
    snapToGuides: false,
};

const DROPDOWN_STATE_KEY = 'sidebarDropdownState';
const SORT_STATE_KEY = 'skillSortState';
const PROGRESS_STATE_KEY = 'skillGraphProgressState';

// --- Module-level State ---

let masterNodes: SkillNode[] = [];
let masterLinks: SkillLink[] = [];
let simulation: d3.Simulation<SkillNode, SkillLink> | null = null;
let settings: Settings = { ...DEFAULT_SETTINGS };
let currentSortOrder: string = storage.loadItem<string>(SORT_STATE_KEY) ?? 'alpha';
let edgeTypeByKey = new Map<string, 'required' | 'or'>();
let prerequisiteGroupsByTarget = new Map<string, string[][]>();
let progressState: ProgressState = storage.loadItem<ProgressState>(PROGRESS_STATE_KEY) ?? {};
let activeStudentIndex: number | null = null;
let studentNames: string[] = [];
let cachedSkills: Record<string, string> | null = null;

const dataFile = (fileName: string): string => `${import.meta.env.BASE_URL}data/${fileName}`;

// --- Normalizer Helpers ---

function normalizeLayoutMode(value: unknown): LayoutMode {
    if (value === 'free-force' || value === 'layered-lanes') return value;
    return 'growth-axis';
}

function normalizeOffOffDisplay(value: unknown): OffOffDisplay {
    return value === 'remove' ? 'remove' : 'dim';
}

function normalizeTheme(value: unknown): Theme {
    return value === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
}

function getViewSettings(): Settings {
    const savedSettings = storage.loadViewSettings() ?? {};
    return {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        theme: normalizeTheme(savedSettings.theme ?? DEFAULT_SETTINGS.theme),
        layoutMode: normalizeLayoutMode(savedSettings.layoutMode ?? DEFAULT_SETTINGS.layoutMode),
        transitiveReduction: Boolean(savedSettings.transitiveReduction ?? DEFAULT_SETTINGS.transitiveReduction),
        progressMode: Boolean(savedSettings.progressMode ?? DEFAULT_SETTINGS.progressMode),
        offOffDisplay: normalizeOffOffDisplay(savedSettings.offOffDisplay ?? DEFAULT_SETTINGS.offOffDisplay),
        snapToGuides: Boolean(savedSettings.snapToGuides ?? DEFAULT_SETTINGS.snapToGuides),
    };
}

function formatSettingDisplay(key: NumericSettingKey, value: number): string {
    if (key === 'spacing') return `${Math.round(value)}%`;
    if (key === 'progression') return `${Math.round(value * 100)}%`;
    return String(value);
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

function syncChecklistInputsFromProgress(): void {
    const rows = document.querySelectorAll('#skill-checklist-container .list-item[data-id]');
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

// --- Initialization ---

async function initializeApp(): Promise<void> {
    applyTheme(getViewSettings().theme);

    // 1. Load All Data
    let edgeData: RawEdge[] | undefined;
    let skillsData: Record<string, string> | undefined;
    let appendixAData: Record<string, string[]> | undefined;
    let appendixBData: Record<string, string[]> | undefined;

    try {
        [edgeData, skillsData, appendixAData, appendixBData] = await Promise.all([
            d3.json<RawEdge[]>(dataFile('edges.json')),
            d3.json<Record<string, string>>(dataFile('skills.json')),
            d3.json<Record<string, string[]>>(dataFile('appendixA.json')),
            d3.json<Record<string, string[]>>(dataFile('appendixB.json')),
        ]);
    } catch (error) {
        console.error("Failed to load data files. Ensure data/ folder is correct.", error);
        alert("Error: Could not load data files. Check console (F12).");
        return;
    }

    if (!edgeData || !skillsData || !appendixAData || !appendixBData) return;

    // 2. Prepare Master Data Lists
    masterNodes = Object.keys(skillsData).map(id => ({
        id,
        description: skillsData[id] ?? '',
        prereqCount: appendixAData[id]?.length ?? 0,
        progressionScore: 0,
        progressionDepth: 0,
    }));

    const { scoreById, depthById } = calculateProgressionMetrics(masterNodes, edgeData as SkillLink[]);
    masterNodes.forEach((node) => {
        node.progressionScore = scoreById.get(node.id) ?? 0.5;
        node.progressionDepth = depthById.get(node.id) ?? 0;
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
    const graphEl = d3.select<SVGSVGElement, unknown>("#network-graph").node();
    const { width, height } = graphEl?.getBoundingClientRect() ?? { width: 800, height: 600 };

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
}

/** Builds the active graph view from progress state and current display settings. */
function updateActiveGraph(): void {
    const effectiveSettings: Settings = {
        ...DEFAULT_SETTINGS,
        ...settings,
        theme: normalizeTheme(settings.theme),
        layoutMode: normalizeLayoutMode(settings.layoutMode),
        transitiveReduction: Boolean(settings.transitiveReduction),
        progressMode: Boolean(settings.progressMode),
        offOffDisplay: normalizeOffOffDisplay(settings.offOffDisplay),
        snapToGuides: Boolean(settings.snapToGuides),
    };

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

    redrawGraph(activeNodes, activeLinks, (allNodes) => {
        storage.savePositions(allNodes);
    }, {
        edgeTypeByKey,
        progressMode: effectiveSettings.progressMode,
        progressStateById,
        readinessById: progressMetrics.readinessById,
        satisfiedById: progressMetrics.satisfiedById,
        totalById: progressMetrics.totalById,
        suppressedNodeIds: removeOffOffNodes ? new Set() : notStartedNodeIds,
    });

    updateEdgeSummary(activeLinks.length, filteredLinks.length, effectiveSettings.transitiveReduction);
    updateProgressPanel(progressMetrics, activeNodeIds, effectiveSettings.progressMode);

    applyLayoutForces(activeNodes, effectiveSettings);
    simulation!.alpha(0.18).restart();
}

/** Applies layout forces for the selected mode. */
function applyLayoutForces(activeNodes: SkillNode[], currentSettings: Settings): void {
    if (!simulation) return;

    const graphElement = d3.select<Element, unknown>('#network-graph').node();
    if (!graphElement) return;

    const { width, height } = graphElement.getBoundingClientRect();
    const spacingFactor = Math.max(0.5, Math.min(2, currentSettings.spacing / 100));
    const usableWidth = Math.min(width * 0.95, Math.max(width * 0.3, width * 0.82 * spacingFactor));
    const leftEdge = (width - usableWidth) / 2;
    const progressionStrength = Math.max(0, Math.min(1, currentSettings.progression));
    const mode = normalizeLayoutMode(currentSettings.layoutMode);
    const centerX = width / 2;
    const centerY = height / 2;
    const shouldSnapToGuides = mode !== 'free-force' && Boolean(currentSettings.snapToGuides);
    const snapRatioToGuides = (ratio: number): number => {
        const clamped = Math.max(0, Math.min(1, ratio));
        if (!shouldSnapToGuides) return clamped;
        return Math.round(clamped * 9) / 9;
    };

    const chargeForce = simulation.force<d3.ForceManyBody<SkillNode>>('charge');
    chargeForce?.strength(currentSettings.repulsion);

    const collideForce = simulation.force<d3.ForceCollide<SkillNode>>('collide');
    collideForce?.radius(currentSettings.nodeSize + 10);

    const linkForce = simulation.force<d3.ForceLink<SkillNode, SkillLink>>('link');
    linkForce?.distance(40 * spacingFactor);

    if (mode === 'free-force') {
        simulation
            .force('x', d3.forceX<SkillNode>(centerX).strength(0.03))
            .force('y', d3.forceY<SkillNode>(centerY).strength(0.03));
    } else if (mode === 'layered-lanes') {
        const activeMaxDepth = Math.max(1, ...activeNodes.map((node) => node.progressionDepth ?? 0));
        simulation
            .force('x', d3.forceX<SkillNode>((node) => {
                const depth = Math.max(0, node.progressionDepth ?? 0);
                const laneRatio = snapRatioToGuides(depth / activeMaxDepth);
                return leftEdge + laneRatio * usableWidth;
            }).strength(Math.max(0.75, progressionStrength)))
            .force('y', d3.forceY<SkillNode>(centerY).strength(0.05));
    } else {
        simulation
            .force('x', d3.forceX<SkillNode>((node) => {
                const ratio = snapRatioToGuides(node.progressionScore ?? 0.5);
                return leftEdge + ratio * usableWidth;
            }).strength(progressionStrength))
            .force('y', d3.forceY<SkillNode>(centerY).strength(0.05));
    }

    updateWeightGuides({
        visible: mode !== 'free-force',
        leftEdge,
        usableWidth,
        height,
        snapNodes: shouldSnapToGuides,
    });

    simulation.nodes(activeNodes);
}

function updateLayoutControls(currentSettings: Settings): void {
    const progressionSlider = document.getElementById('progression-slider');
    const progressionValue = document.getElementById('progression-value');
    if (!(progressionSlider instanceof HTMLInputElement) || !(progressionValue instanceof HTMLElement)) return;

    const isFreeMode = normalizeLayoutMode(currentSettings.layoutMode) === 'free-force';
    progressionSlider.disabled = isFreeMode;
    progressionValue.style.opacity = isFreeMode ? '0.55' : '1';
}

function saveProgressState(): void {
    storage.saveItem(PROGRESS_STATE_KEY, progressState);
}

function updateEdgeSummary(displayedEdges: number, fullEdges: number, reduced: boolean): void {
    const summaryElement = document.getElementById('edge-summary');
    if (!(summaryElement instanceof HTMLElement)) return;

    if (!reduced) {
        summaryElement.textContent = `Edges shown: ${displayedEdges}`;
        return;
    }

    const removed = Math.max(0, fullEdges - displayedEdges);
    const removedPct = fullEdges > 0 ? Math.round((removed / fullEdges) * 100) : 0;
    summaryElement.textContent = `Edges shown: ${displayedEdges}/${fullEdges} (${removedPct}% indirect removed)`;
}

function updateProgressPanel(progressMetrics: ProgressMetrics, activeNodeIds: Set<string>, progressModeEnabled: boolean): void {
    const summaryElement = document.getElementById('progress-summary');
    const readyListElement = document.getElementById('ready-list');
    const readyCountElement = document.getElementById('ready-count');

    if (!(summaryElement instanceof HTMLElement) || !(readyListElement instanceof HTMLElement) || !(readyCountElement instanceof HTMLElement)) {
        return;
    }

    const counts = progressMetrics.counts;
    summaryElement.textContent =
        `Mastered ${counts.mastered} • In Progress ${counts['in-progress']} • Not Started ${counts['not-started']}`;

    const readyIds = progressMetrics.readyNowIds
        .filter((nodeId) => activeNodeIds.has(nodeId))
        .sort((leftId, rightId) => {
            const leftTotal = progressMetrics.totalById.get(leftId) ?? 0;
            const rightTotal = progressMetrics.totalById.get(rightId) ?? 0;
            if (rightTotal !== leftTotal) return rightTotal - leftTotal;
            return leftId.localeCompare(rightId, undefined, { numeric: true });
        })
        .slice(0, 40);

    readyCountElement.textContent = progressModeEnabled
        ? `${readyIds.length} ready in current view`
        : `${readyIds.length} ready (enable mode to visualize)`;

    readyListElement.innerHTML = '';
    if (readyIds.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'ready-empty';
        emptyItem.textContent = 'No ready-now skills in current filter.';
        readyListElement.appendChild(emptyItem);
        return;
    }

    for (const nodeId of readyIds) {
        const listItem = document.createElement('li');
        const satisfied = progressMetrics.satisfiedById.get(nodeId) ?? 0;
        const total = progressMetrics.totalById.get(nodeId) ?? 0;
        const score = `${satisfied}/${total}`;
        listItem.innerHTML = `<span class="ready-id">${nodeId}</span><span class="ready-score">${score}</span>`;
        readyListElement.appendChild(listItem);
    }
}

function updateStatusForSelectedNodes(nextStatus: string): void {
    const selectedIds = getSelectedNodeIds();
    if (selectedIds.length === 0) {
        alert('Select one or more nodes first, then set a progress status.');
        return;
    }

    for (const nodeId of selectedIds) {
        setStatusForSkill(nodeId, nextStatus);
    }
    saveProgressState();
    syncChecklistInputsFromProgress();
    updateActiveGraph();
}

// --- Sorting & Sidebar Management ---

function naturalSort(a: SkillNode, b: SkillNode): number {
    return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function prereqSort(a: SkillNode, b: SkillNode): number {
    const countDiff = b.prereqCount - a.prereqCount;
    return countDiff !== 0 ? countDiff : naturalSort(a, b);
}

function groupDataByCategory(
    data: Record<string, unknown>,
    nodeObjects: SkillNode[],
): Record<string, Record<string, unknown>> {
    const grouped: Record<string, Record<string, unknown>> = {};
    const dataKeys = Object.keys(data);

    for (const node of nodeObjects) {
        if (dataKeys.includes(node.id)) {
            const category = node.id.split(' ')[0].replace('&', 'and');
            if (!grouped[category]) {
                grouped[category] = {};
            }
            grouped[category][node.id] = data[node.id];
        }
    }
    return grouped;
}

function populateSidebar(
    skills: Record<string, string>,
    appendixA: Record<string, string[]>,
    appendixB: Record<string, string[]>,
): void {
    const summary = d3.select("#checklist-section > summary");
    summary.append("button")
        .attr("class", "sort-button")
        .text(`Sort: ${currentSortOrder === 'alpha' ? 'A-Z' : '# Pre'}`)
        .on('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            currentSortOrder = currentSortOrder === 'alpha' ? 'prereq' : 'alpha';
            storage.saveItem(SORT_STATE_KEY, currentSortOrder);

            d3.select(event.currentTarget as Element).text(`Sort: ${currentSortOrder === 'alpha' ? 'A-Z' : '# Pre'}`);
            renderSkillChecklist(skills);
        });

    renderSkillChecklist(skills);
    renderAppendix('#appendix-a-container', appendixA);
    renderAppendix('#appendix-b-container', appendixB);
}

function renderSkillChecklist(skills: Record<string, string>): void {
    const listContainer = d3.select('#skill-checklist-container');
    listContainer.html('');
    const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};

    const checklistHeader = listContainer.append('div').attr('class', 'skill-checklist-header');
    const checklistToggleLabels = checklistHeader.append('div').attr('class', 'skill-checklist-toggle-labels');
    checklistToggleLabels.append('span').text('W');
    checklistToggleLabels.append('span').text('M');
    checklistHeader.append('div').attr('class', 'skill-checklist-header-skill').text('Skill');

    const sortedMasterNodes = [...masterNodes].sort(currentSortOrder === 'alpha' ? naturalSort : prereqSort);
    const groupedSkills = groupDataByCategory(skills, sortedMasterNodes);

    type CategoryEntry = [string, Record<string, unknown>];

    const categoryGroups = listContainer.selectAll<HTMLDetailsElement, CategoryEntry>('.category-group')
        .data(Object.entries(groupedSkills) as CategoryEntry[])
        .join('details')
        .attr('class', 'category-group')
        .property('open', (d) => savedDropdownState[d[0]] ?? true);

    const summaries = categoryGroups.append('summary').attr('class', 'category-summary')
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            const category = d3.select<HTMLDetailsElement, CategoryEntry>(parent).datum()[0];
            savedDropdownState[category] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    summaries.append('span').text((d) => CATEGORY_LABELS[d[0]] ?? d[0]);

    const btnGroup = summaries.append('span').attr('class', 'category-btn-group');
    btnGroup.append('button')
        .attr('class', 'category-check-btn')
        .text('Work All')
        .on('click', (event: MouseEvent, d: CategoryEntry) => {
            event.preventDefault();
            event.stopPropagation();
            Object.keys(d[1]).forEach((id) => {
                const status = getStatusForSkill(id);
                if (status !== PROGRESS_STATUS.MASTERED) {
                    setStatusForSkill(id, PROGRESS_STATUS.IN_PROGRESS);
                }
            });
            saveProgressState();
            syncChecklistInputsFromProgress();
            updateActiveGraph();
        });

    btnGroup.append('button')
        .attr('class', 'category-check-btn')
        .text('Clear All')
        .on('click', (event: MouseEvent, d: CategoryEntry) => {
            event.preventDefault();
            event.stopPropagation();
            Object.keys(d[1]).forEach((id) => setStatusForSkill(id, PROGRESS_STATUS.NOT_STARTED));
            saveProgressState();
            syncChecklistInputsFromProgress();
            updateActiveGraph();
        });

    type SkillEntry = [string, unknown];

    const items = categoryGroups.selectAll<HTMLDivElement, SkillEntry>('.list-item')
        .data((d) => Object.entries(d[1]) as SkillEntry[])
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

    listContainer.on('change', handleSkillStatusToggleChange);
    syncChecklistInputsFromProgress();
}

function handleSkillStatusToggleChange(event: Event): void {
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

function renderAppendix(selector: string, data: Record<string, string[]>): void {
    const listContainer = d3.select(selector);
    listContainer.html('');
    const groupedData = groupDataByCategory(data, [...masterNodes].sort(naturalSort));
    const savedDropdownState = storage.loadItem<Record<string, boolean>>(DROPDOWN_STATE_KEY) ?? {};

    type CategoryEntry = [string, Record<string, unknown>];

    const categoryGroups = listContainer.selectAll<HTMLDetailsElement, CategoryEntry>('.category-group')
        .data(Object.entries(groupedData) as CategoryEntry[])
        .join('details').attr('class', 'category-group')
        .property('open', (d) => savedDropdownState[d[0]] ?? false);

    categoryGroups.append('summary').attr('class', 'category-summary').text(d => d[0])
        .on('click', function(this: HTMLElement) {
            const parent = this.parentElement as HTMLDetailsElement | null;
            if (!parent) return;
            const category = d3.select<HTMLDetailsElement, CategoryEntry>(parent).datum()[0];
            savedDropdownState[category] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });

    type SkillEntry = [string, unknown];

    categoryGroups.selectAll<HTMLDivElement, SkillEntry>('.list-item')
        .data(d => Object.entries(d[1]) as SkillEntry[])
        .join('div').attr('class', 'list-item')
        .attr('data-id', d => d[0])
        .on('mouseover', (_e: MouseEvent, d: SkillEntry) => applyHighlightFilter([d[0], ...parseRange(d[1])]))
        .on('mouseout', () => applyHighlightFilter([]))
        .html(d => `<span class="code">${d[0]}</span><span class="skill">${String(d[1])}</span>`);
}

function parseRange(rangeString: unknown): string[] {
    if (Array.isArray(rangeString)) {
        return (rangeString as unknown[]).map(s => String(s).trim()).filter(s => s);
    }

    const str = String(rangeString).trim();
    const rangeRegex = /^([A-Z&]+)\s*(\d+)\s*[–-]\s*(?:([A-Z&]+)\s*)?(\d+)$/i;
    const match = str.match(rangeRegex);

    if (match) {
        const prefix = match[1];
        const start = parseInt(match[2], 10);
        const end = parseInt(match[4], 10);
        if (!isNaN(start) && !isNaN(end)) {
            return Array.from({ length: Math.abs(end - start) + 1 }, (_, i) => `${prefix} ${start + (start < end ? i : -i)}`);
        }
    }
    return [str].filter(s => s);
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
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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

    const transitiveToggle = document.getElementById('transitive-reduction-toggle');
    if (transitiveToggle instanceof HTMLInputElement) {
        transitiveToggle.checked = settings.transitiveReduction;
        transitiveToggle.addEventListener('change', () => {
            settings.transitiveReduction = transitiveToggle.checked;
            storage.saveViewSettings(settings);
            updateActiveGraph();
        });
    }

    const offOffRemoveToggle = document.getElementById('offoff-remove-toggle');
    if (offOffRemoveToggle instanceof HTMLInputElement) {
        offOffRemoveToggle.checked = settings.offOffDisplay === 'remove';
        offOffRemoveToggle.addEventListener('change', () => {
            settings.offOffDisplay = offOffRemoveToggle.checked ? 'remove' : 'dim';
            storage.saveViewSettings(settings);
            updateActiveGraph();
        });
    }

    const snapToGuidesToggle = document.getElementById('snap-to-guides-toggle');
    if (snapToGuidesToggle instanceof HTMLInputElement) {
        snapToGuidesToggle.checked = settings.snapToGuides;
        snapToGuidesToggle.addEventListener('change', () => {
            settings.snapToGuides = snapToGuidesToggle.checked;
            storage.saveViewSettings(settings);
            applyLayoutForces(simulation!.nodes(), settings);
            simulation!.alpha(0.22).restart();
        });
    }

    const progressModeToggle = document.getElementById('progress-mode-toggle');
    if (progressModeToggle instanceof HTMLInputElement) {
        progressModeToggle.checked = settings.progressMode;
        progressModeToggle.addEventListener('change', () => {
            settings.progressMode = progressModeToggle.checked;
            storage.saveViewSettings(settings);
            updateActiveGraph();
        });
    }

    const markNotStartedBtn = document.getElementById('progress-not-started-btn');
    if (markNotStartedBtn instanceof HTMLButtonElement) {
        markNotStartedBtn.addEventListener('click', () => updateStatusForSelectedNodes(PROGRESS_STATUS.NOT_STARTED));
    }

    const markInProgressBtn = document.getElementById('progress-in-progress-btn');
    if (markInProgressBtn instanceof HTMLButtonElement) {
        markInProgressBtn.addEventListener('click', () => updateStatusForSelectedNodes(PROGRESS_STATUS.IN_PROGRESS));
    }

    const markMasteredBtn = document.getElementById('progress-mastered-btn');
    if (markMasteredBtn instanceof HTMLButtonElement) {
        markMasteredBtn.addEventListener('click', () => updateStatusForSelectedNodes(PROGRESS_STATUS.MASTERED));
    }

    const clearProgressBtn = document.getElementById('progress-clear-btn');
    if (clearProgressBtn instanceof HTMLButtonElement) {
        clearProgressBtn.addEventListener('click', () => {
            if (!confirm('Clear all student progress statuses?')) return;
            progressState = {};
            saveProgressState();
            syncChecklistInputsFromProgress();
            updateActiveGraph();
        });
    }

    const layoutModeSelect = document.getElementById('layout-mode-select');
    if (layoutModeSelect instanceof HTMLSelectElement) {
        layoutModeSelect.value = settings.layoutMode;
        layoutModeSelect.addEventListener('change', () => {
            settings.layoutMode = normalizeLayoutMode(layoutModeSelect.value);
            updateLayoutControls(settings);
            applyLayoutForces(simulation!.nodes(), settings);
            simulation!.alpha(0.22).restart();
            storage.saveViewSettings(settings);
        });
    }

    updateLayoutControls(settings);

    const sliders: Array<[NumericSettingKey, string]> = [
        ['nodeSize', 'node-size'],
        ['lineWidth', 'line-width'],
        ['arrowSize', 'arrow-size'],
        ['repulsion', 'repulsion'],
        ['spacing', 'spacing'],
        ['progression', 'progression'],
    ];

    for (const [key, id] of sliders) {
        const slider = document.getElementById(`${id}-slider`);
        const display = document.getElementById(`${id}-value`);
        if (!(slider instanceof HTMLInputElement) || !(display instanceof HTMLElement)) continue;

        const initialValue = settings[key];
        slider.value = String(initialValue);
        display.textContent = formatSettingDisplay(key, initialValue);

        slider.addEventListener('input', (e: Event) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            settings[key] = value;
            display.textContent = formatSettingDisplay(key, value);
            updateGraphView(settings);
            applyLayoutForces(simulation!.nodes(), settings);
            simulation!.alpha(0.1).restart();
        });

        slider.addEventListener('change', () => storage.saveViewSettings(settings));
    }

    window.addEventListener('resize', () => {
        applyLayoutForces(simulation!.nodes(), settings);
        simulation!.alpha(0.1).restart();
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn instanceof HTMLButtonElement) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Reset everything? This will clear saved layout, checklist states, and student progress states.")) {
                storage.clearAll();
                window.location.reload();
            }
        });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn instanceof HTMLButtonElement) {
        exportBtn.addEventListener('click', () => storage.handleExport(masterNodes));
    }

    const importBtn = document.getElementById('import-btn');
    if (importBtn instanceof HTMLButtonElement) {
        importBtn.addEventListener('click', () => {
            storage.handleImport((newPositions: SavedPositions) => {
                storage.saveItem('skillGraphPositions', newPositions);
                window.location.reload();
            });
        });
    }

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

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
}

// --- Student Slots ---

function syncSettingsToUI(): void {
    const sliderMap: Array<[NumericSettingKey, string]> = [
        ['nodeSize', 'node-size'],
        ['lineWidth', 'line-width'],
        ['arrowSize', 'arrow-size'],
        ['repulsion', 'repulsion'],
        ['spacing', 'spacing'],
        ['progression', 'progression'],
    ];
    for (const [key, id] of sliderMap) {
        const slider = document.getElementById(`${id}-slider`);
        const display = document.getElementById(`${id}-value`);
        if (slider instanceof HTMLInputElement && display instanceof HTMLElement) {
            slider.value = String(settings[key]);
            display.textContent = formatSettingDisplay(key, settings[key]);
        }
    }
    const layoutModeSelect = document.getElementById('layout-mode-select');
    if (layoutModeSelect instanceof HTMLSelectElement) {
        layoutModeSelect.value = settings.layoutMode;
    }
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle instanceof HTMLInputElement) {
        themeToggle.checked = settings.theme === 'dark';
    }
    const transitiveToggle = document.getElementById('transitive-reduction-toggle');
    if (transitiveToggle instanceof HTMLInputElement) {
        transitiveToggle.checked = settings.transitiveReduction;
    }
    const offOffRemoveToggle = document.getElementById('offoff-remove-toggle');
    if (offOffRemoveToggle instanceof HTMLInputElement) {
        offOffRemoveToggle.checked = settings.offOffDisplay === 'remove';
    }
    const snapToGuidesToggle = document.getElementById('snap-to-guides-toggle');
    if (snapToGuidesToggle instanceof HTMLInputElement) {
        snapToGuidesToggle.checked = Boolean(settings.snapToGuides);
    }
    const progressModeToggle = document.getElementById('progress-mode-toggle');
    if (progressModeToggle instanceof HTMLInputElement) {
        progressModeToggle.checked = settings.progressMode;
    }
    applyTheme(settings.theme);
    updateLayoutControls(settings);
    updateGraphView(settings);
}

function switchToStudent(newIndex: number): void {
    if (activeStudentIndex === newIndex) return;

    if (activeStudentIndex !== null) {
        storage.saveStudentState(activeStudentIndex, masterNodes);
    }

    const newState = storage.loadStudentState(newIndex);

    storage.saveItem(DROPDOWN_STATE_KEY, newState.sidebarDropdownState ?? {});

    currentSortOrder = newState.skillSortState ?? 'alpha';
    storage.saveItem(SORT_STATE_KEY, currentSortOrder);

    const newViewSettings: Settings = {
        ...DEFAULT_SETTINGS,
        ...(newState.skillGraphViewSettings ?? {}),
    };
    newViewSettings.theme = normalizeTheme(newViewSettings.theme);
    newViewSettings.layoutMode = normalizeLayoutMode(newViewSettings.layoutMode);
    newViewSettings.offOffDisplay = normalizeOffOffDisplay(newViewSettings.offOffDisplay);
    Object.assign(settings, newViewSettings);
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

    syncSettingsToUI();
    updateActiveGraph();
    if (cachedSkills) renderSkillChecklist(cachedSkills);

    const sortButton = document.querySelector('#checklist-section .sort-button');
    if (sortButton instanceof HTMLButtonElement) {
        sortButton.textContent = `Sort: ${currentSortOrder === 'alpha' ? 'A-Z' : '# Pre'}`;
    }

    activeStudentIndex = newIndex;
    storage.saveActiveStudent(newIndex);
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
        updateStudentButtonStates();
    }
}

// --- App Start ---
document.addEventListener('DOMContentLoaded', initializeApp);
