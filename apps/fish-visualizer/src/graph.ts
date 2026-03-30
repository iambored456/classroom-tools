import * as d3 from 'd3';
import { createColorScale, getCategoryLabel, getNodeGroup } from './config';
import { PROGRESS_STATUS, normalizeProgressStatus, getNodeId } from './utils';
import type { SkillNode, SkillLink, ResolvedSkillLink, StyleOptions, Settings } from './types';

type GuideBand = {
    label: string;
    startLevel: number;
    endLevel: number;
};

type GuideLane = {
    key: string;
    label: string;
    top: number;
    bottom: number;
};

type WeightGuideConfig = {
    visible: boolean;
    leftEdge: number;
    usableWidth: number;
    height: number;
    topInset: number;
    bottomInset: number;
    minLevel: number;
    maxLevel: number;
    snapNodes: boolean;
    bands: GuideBand[];
    lanes: GuideLane[];
};

// --- Module-level State ---

let nodeSelection: d3.Selection<SVGGElement, SkillNode, SVGGElement, unknown> | null = null;
let linkSelection: d3.Selection<SVGLineElement, SkillLink, SVGGElement, unknown> | null = null;
let markerSelection: d3.Selection<SVGMarkerElement, unknown, HTMLElement, unknown> | null = null;
let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown> | null = null;
let container: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let weightGuideLayer: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let weightBandLayer: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let laneGuideLayer: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let weightLineLayer: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let simulation: d3.Simulation<SkillNode, SkillLink> | null = null;
let color: d3.ScaleOrdinal<string, string, never> | null = null;
let weightGuideConfig: WeightGuideConfig = {
    visible: false,
    leftEdge: 0,
    usableWidth: 1,
    height: 0,
    topInset: 0,
    bottomInset: 0,
    minLevel: 1,
    maxLevel: 10,
    snapNodes: false,
    bands: [],
    lanes: [],
};

const selectedNodes = new Set<string>();
let allNodeData: SkillNode[] = [];

let styleOptions: StyleOptions = {
    edgeTypeByKey: new Map(),
    progressMode: false,
    progressStateById: new Map(),
    readinessById: new Map(),
    satisfiedById: new Map(),
    totalById: new Map(),
    suppressedNodeIds: new Set(),
};

// --- Private Helpers ---

const edgeKeyFromLink = (link: ResolvedSkillLink): string =>
    `${link.source.id}=>${link.target.id}`;

function getLinkClass(link: SkillLink): string {
    const resolved = link as unknown as ResolvedSkillLink;
    const edgeType = styleOptions.edgeTypeByKey.get(edgeKeyFromLink(resolved));
    return edgeType === 'or' ? 'link link-or' : 'link';
}

function getNodeProgressStatus(nodeId: string): string {
    return normalizeProgressStatus(styleOptions.progressStateById.get(nodeId));
}

function getNodeCategoryColor(node: SkillNode): string {
    return color!(getNodeGroup(node));
}

function getNodeFill(node: SkillNode): string {
    if (!styleOptions.progressMode) return getNodeCategoryColor(node);
    const status = getNodeProgressStatus(node.id);
    if (status === PROGRESS_STATUS.MASTERED) return '#52b788';
    if (status === PROGRESS_STATUS.IN_PROGRESS) return '#f4a261';
    return '#d4dce7';
}

function applyNodeVisualState(): void {
    if (!nodeSelection) return;

    nodeSelection
        .classed('progress-mode', styleOptions.progressMode)
        .classed('tier-optional', (node) => node.priorityTier === 'Optional')
        .classed('tier-needs-reframe', (node) => node.priorityTier === 'Needs reframe')
        .classed('safety-critical', (node) => node.safetyFlag)
        .classed('grouped-skill', (node) => node.grouped)
        .classed('status-not-started', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.NOT_STARTED)
        .classed('status-in-progress', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.IN_PROGRESS)
        .classed('status-mastered', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.MASTERED)
        .classed('status-ready-now', (node) => {
            if (!styleOptions.progressMode) return false;
            const status = getNodeProgressStatus(node.id);
            const readiness = styleOptions.readinessById.get(node.id) ?? 0;
            return status !== PROGRESS_STATUS.MASTERED && readiness >= 1;
        });

    nodeSelection.select<SVGCircleElement>('.node-body')
        .attr('fill', (node) => getNodeFill(node))
        .attr('stroke', (node) => styleOptions.progressMode ? getNodeCategoryColor(node) : null)
        .attr('stroke-width', () => styleOptions.progressMode ? 2 : 1.5);
}

function applySuppressedVisualState(): void {
    if (!nodeSelection || !linkSelection) return;
    const suppressedNodeIds = styleOptions.suppressedNodeIds instanceof Set
        ? styleOptions.suppressedNodeIds
        : new Set<string>();
    nodeSelection.classed('suppressed-node', (node) => suppressedNodeIds.has(node.id));
    linkSelection.classed('suppressed-link', (link) => {
        const resolved = link as unknown as ResolvedSkillLink;
        return suppressedNodeIds.has(resolved.source.id) || suppressedNodeIds.has(resolved.target.id);
    });
}

function buildTooltipHtml(node: SkillNode): string {
    const metaLines = [
        `Category: ${getCategoryLabel(node.visualGroup)}`,
        `Continuum: ${node.continuumBand} | Weight ${node.categoryWeight}`,
        node.priorityTier !== 'Core' ? `Priority: ${node.priorityTier}` : '',
        node.safetyFlag ? 'Safety-critical milestone' : '',
        node.grouped ? `Grouped source: ${node.sourceCode} (${node.groupIndex}/${node.groupSize})` : `Source row: ${node.sourceCode}`,
        node.weightingNote ? node.weightingNote : '',
    ].filter(Boolean);

    if (!styleOptions.progressMode) {
        return [
            `<div class="code">${node.id}</div>`,
            `<div>${node.description}</div>`,
            ...metaLines.map((line) => `<div class="tooltip-meta">${line}</div>`),
        ].join('');
    }

    const status = getNodeProgressStatus(node.id);
    const readableStatus: Record<string, string> = {
        [PROGRESS_STATUS.NOT_STARTED]: 'Not Started',
        [PROGRESS_STATUS.IN_PROGRESS]: 'In Progress',
        [PROGRESS_STATUS.MASTERED]: 'Mastered',
    };

    const satisfied = styleOptions.satisfiedById.get(node.id) ?? 0;
    const total = styleOptions.totalById.get(node.id) ?? 0;
    const readiness = styleOptions.readinessById.get(node.id) ?? 0;
    const readinessPercent = `${Math.round(readiness * 100)}%`;

    return [
        `<div class="code">${node.id}</div>`,
        `<div>${node.description}</div>`,
        `<div class="tooltip-meta">Status: ${readableStatus[status] ?? status}</div>`,
        `<div class="tooltip-meta">Readiness: ${satisfied}/${total} (${readinessPercent})</div>`,
        ...metaLines.map((line) => `<div class="tooltip-meta">${line}</div>`),
    ].join('');
}

function positionTooltip(
    tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
    event: MouseEvent,
): void {
    const tooltipNode = tooltip.node();
    const containerNode = svg?.node()?.parentElement;
    if (!tooltipNode || !(containerNode instanceof HTMLElement)) return;

    const pad = 14;
    const containerRect = containerNode.getBoundingClientRect();
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    let left = event.clientX - containerRect.left + pad;
    let top = event.clientY - containerRect.top + pad;

    const maxLeft = Math.max(8, containerRect.width - tooltipWidth - 8);
    const maxTop = Math.max(8, containerRect.height - tooltipHeight - 8);

    if (left > maxLeft) {
        left = Math.max(8, event.clientX - containerRect.left - tooltipWidth - pad);
    }
    if (top > maxTop) {
        top = Math.max(8, event.clientY - containerRect.top - tooltipHeight - pad);
    }

    tooltip.style('left', `${left}px`).style('top', `${top}px`);
}

/** Creates and returns the drag handler for nodes. */
function createNodeDrag(
    onDragEnd: (nodes: SkillNode[]) => void,
): d3.DragBehavior<SVGGElement, SkillNode, SkillNode | d3.SubjectPosition> {
    return d3.drag<SVGGElement, SkillNode>()
        .on("start", function(event: d3.D3DragEvent<SVGGElement, SkillNode, SkillNode>, d: SkillNode) {
            if (!event.active) simulation!.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;

            clearAllHighlights();
            event.sourceEvent.stopPropagation();

            if (!selectedNodes.has(d.id)) {
                if (!(event.sourceEvent as MouseEvent).shiftKey) clearAllHighlights();
                selectedNodes.add(d.id);
            }
            nodeSelection!.classed("selected", n => selectedNodes.has(n.id));
        })
        .on("drag", function(event: d3.D3DragEvent<SVGGElement, SkillNode, SkillNode>) {
            selectedNodes.forEach(nodeId => {
                const nodeToMove = allNodeData.find(n => n.id === nodeId);
                if (nodeToMove) {
                    if (nodeToMove.id === event.subject.id) {
                        nodeToMove.fx = event.x;
                        nodeToMove.fy = event.y;
                    } else {
                        if (!nodeToMove.dragStart) {
                            nodeToMove.dragStart = { x: nodeToMove.x ?? 0, y: nodeToMove.y ?? 0 };
                        }
                        nodeToMove.fx = nodeToMove.dragStart.x + (event.x - event.subject.x!);
                        nodeToMove.fy = nodeToMove.dragStart.y + (event.y - event.subject.y!);
                    }
                }
            });
        })
        .on("end", function(event: d3.D3DragEvent<SVGGElement, SkillNode, SkillNode>) {
            if (!event.active) simulation!.alphaTarget(0);

            const shouldKeepPinned = (event.sourceEvent as MouseEvent).shiftKey;
            selectedNodes.forEach(nodeId => {
                const node = allNodeData.find(n => n.id === nodeId);
                if (node) {
                    if (!shouldKeepPinned && !node.layoutPinned) {
                        node.fx = null;
                        node.fy = null;
                    }
                    delete node.dragStart;
                }
            });
            onDragEnd(allNodeData);
        });
}

/** Click handler for individual nodes. */
function handleNodeClick(event: MouseEvent, d: SkillNode): void {
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
        clearNeighborHighlights();
        if (selectedNodes.has(d.id)) {
            selectedNodes.delete(d.id);
        } else {
            selectedNodes.add(d.id);
        }
    } else {
        clearAllHighlights();
        highlightNeighbors(d);
    }
    nodeSelection!.classed("selected", n => selectedNodes.has(n.id));
}

/** Removes all temporary highlights and selections. */
function clearAllHighlights(): void {
    if (!nodeSelection || !linkSelection || !container) return;

    container.select(".node-label").remove();
    nodeSelection.classed("primary-selection", false)
                 .classed("neighbor", false)
                 .classed("selected", false)
                 .classed("greyed-out", false);

    linkSelection.classed("highlighted", false)
                 .classed("selection-highlighted", false)
                 .classed("greyed-out", false);
    selectedNodes.clear();
}

/** Clears only neighbor/highlight styles and keeps explicit selections intact. */
function clearNeighborHighlights(): void {
    if (!nodeSelection || !linkSelection || !container) return;

    container.select(".node-label").remove();
    nodeSelection.classed("primary-selection", false)
                 .classed("neighbor", false);
    linkSelection.classed("highlighted", false)
                 .classed("selection-highlighted", false);
}

/** Highlights a primary node and its direct neighbors. */
function highlightNeighbors(primaryNode: SkillNode): void {
    clearAllHighlights();
    if (!primaryNode || !simulation) return;

    const neighborIds = new Set<string>();
    const linkForce = simulation.force<d3.ForceLink<SkillNode, SkillLink>>("link");
    if (linkForce) {
        (linkForce.links() as unknown as ResolvedSkillLink[]).forEach(l => {
            if (l.source.id === primaryNode.id) neighborIds.add(l.target.id);
            if (l.target.id === primaryNode.id) neighborIds.add(l.source.id);
        });
    }

    linkSelection!
        .filter(l => {
            const resolved = l as unknown as ResolvedSkillLink;
            return resolved.source.id === primaryNode.id || resolved.target.id === primaryNode.id;
        })
        .classed("highlighted", true);

    nodeSelection!.filter(n => neighborIds.has(n.id)).classed("neighbor", true);
    nodeSelection!.filter(n => n.id === primaryNode.id).classed("primary-selection", true);
}

/** Sets up global interactions like zoom and background click. */
function setupInteractions(): void {
    zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            container!.attr("transform", event.transform.toString());
        });
    svg!.call(zoom);

    svg!.on("click", () => {
        clearAllHighlights();
    });
}

// --- Public API ---

/** Creates the initial SVG structure and simulation. */
export function setupGraph(selector: string, forceSimulation: d3.Simulation<SkillNode, SkillLink>): void {
    simulation = forceSimulation;
    svg = d3.select<SVGSVGElement, unknown>(selector);
    container = svg.append<SVGGElement>("g");

    // Add the selection box used for lasso selection
    container!.append("rect").attr("id", "selection-box").attr("display", "none");

    // Define the arrowhead marker for links
    const defs = container!.append<SVGDefsElement>("defs");
    markerSelection = defs.append<SVGMarkerElement>('marker')
        .attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10')
        .attr('orient', 'auto');
    markerSelection!.append('path').attr('d', 'M0,-5L10,0L0,5');

    // Background guide layer for weighted maturity lines
    weightGuideLayer = container!.append<SVGGElement>('g').attr('class', 'weight-guides');
    weightBandLayer = weightGuideLayer.append<SVGGElement>('g').attr('class', 'weight-band-layer');
    laneGuideLayer = weightGuideLayer.append<SVGGElement>('g').attr('class', 'lane-guide-layer');
    weightLineLayer = weightGuideLayer.append<SVGGElement>('g').attr('class', 'weight-line-layer');

    // Create groups for links and nodes to manage them as layers
    container!.append("g").attr("class", "links");
    container!.append("g").attr("class", "nodes");

    setupInteractions();
}

/**
 * The core rendering function. Draws or redraws the graph with a given set of nodes and links.
 * Called initially and every time the graph data changes.
 */
export function redrawGraph(
    nodes: SkillNode[],
    links: SkillLink[],
    onDragEnd: (nodes: SkillNode[]) => void,
    nextStyleOptions: Partial<StyleOptions> = {},
): void {
    allNodeData = nodes;
    styleOptions = {
        ...styleOptions,
        ...nextStyleOptions,
    };
    // Ensure all Map/Set fields are the correct types
    if (!(styleOptions.edgeTypeByKey instanceof Map)) styleOptions.edgeTypeByKey = new Map();
    if (!(styleOptions.progressStateById instanceof Map)) styleOptions.progressStateById = new Map();
    if (!(styleOptions.readinessById instanceof Map)) styleOptions.readinessById = new Map();
    if (!(styleOptions.satisfiedById instanceof Map)) styleOptions.satisfiedById = new Map();
    if (!(styleOptions.totalById instanceof Map)) styleOptions.totalById = new Map();
    if (!(styleOptions.suppressedNodeIds instanceof Set)) styleOptions.suppressedNodeIds = new Set();

    // Initialize color scale on first render
    if (!color) {
        color = createColorScale(allNodeData);
    }

    // Update the simulation with new data
    simulation!.nodes(nodes);
    const linkForce = simulation!.force<d3.ForceLink<SkillNode, SkillLink>>("link");
    if (linkForce) linkForce.links(links);

    // D3 data join for links
    linkSelection = container!.select<SVGGElement>(".links")
        .selectAll<SVGLineElement, SkillLink>("line")
        .data(links, (d) => `${getNodeId(d.source)}-${getNodeId(d.target)}`)
        .join(
            enter => enter.append("line")
                .attr("class", getLinkClass)
                .attr('marker-end', 'url(#arrowhead)'),
            update => update.attr("class", getLinkClass),
            exit => exit.remove(),
        );

    // D3 data join for nodes
    nodeSelection = container!.select<SVGGElement>(".nodes")
        .selectAll<SVGGElement, SkillNode>("g.node")
        .data(nodes, d => d.id)
        .join(
            enter => {
                const g = enter.append("g").attr("class", "node");
                g.append("circle").attr('class', 'node-accent-ring');
                g.append("circle").attr('class', 'node-body');
                g.call(createNodeDrag(onDragEnd));
                return g;
            },
            update => update,
            exit => exit.remove(),
        );

    // Tooltip logic
    const tooltip = d3.select<HTMLDivElement, unknown>("#tooltip");
    nodeSelection.on('mouseover', function(event: MouseEvent, d: SkillNode) {
        d3.select(this).raise();
        tooltip.style('display', 'block')
            .html(buildTooltipHtml(d));
        positionTooltip(tooltip, event);
    })
    .on('mousemove', function(event: MouseEvent) {
        positionTooltip(tooltip, event);
    })
    .on('mouseout', function() {
        tooltip.style('display', 'none');
    });

    applyNodeVisualState();
    applySuppressedVisualState();

    simulation!.alpha(0.3).restart();

    // Re-apply visual styles based on current settings
    const savedSettings = JSON.parse(localStorage.getItem('skillGraphViewSettings') ?? 'null') as Partial<Settings> | null;
    updateGraphView(savedSettings ?? {});
    nodeSelection.on("click", handleNodeClick);
}

/** Updates positions from simulation ticks. */
export function renderPositions(): void {
    if (!nodeSelection || !linkSelection || !nodeSelection.size()) return;
    if (weightGuideConfig.visible && weightGuideConfig.snapNodes) {
        const minLevel = weightGuideConfig.minLevel;
        const maxLevel = weightGuideConfig.maxLevel;
        const levelSpan = Math.max(1, maxLevel - minLevel);
        const left = weightGuideConfig.leftEdge;
        const width = Math.max(1e-6, weightGuideConfig.usableWidth);
        const snapX = (x: number): number => {
            const ratio = Math.max(0, Math.min(1, (x - left) / width));
            const snappedRatio = Math.round(ratio * levelSpan) / levelSpan;
            return left + snappedRatio * width;
        };

        nodeSelection.each((node) => {
            if (typeof node.x === 'number' && Number.isFinite(node.x)) {
                node.x = snapX(node.x);
            }
            if (typeof node.fx === 'number' && Number.isFinite(node.fx)) {
                node.fx = snapX(node.fx);
            }
        });
    }

    linkSelection
        .attr("x1", d => (d as unknown as ResolvedSkillLink).source.x ?? 0)
        .attr("y1", d => (d as unknown as ResolvedSkillLink).source.y ?? 0)
        .attr("x2", d => (d as unknown as ResolvedSkillLink).target.x ?? 0)
        .attr("y2", d => (d as unknown as ResolvedSkillLink).target.y ?? 0);
    nodeSelection.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
}

/** Updates visual styles like node size, line width, and arrow size. */
export function updateGraphView(settings: Partial<Settings>): void {
    if (!nodeSelection || !linkSelection || !markerSelection) return;
    const { nodeSize = 8, lineWidth = 1.5, arrowSize = 6 } = settings;
    const linkColor = getComputedStyle(document.documentElement).getPropertyValue('--link-color').trim() || '#999';
    nodeSelection.selectAll<SVGCircleElement, SkillNode>('.node-body').attr('r', nodeSize);
    nodeSelection.selectAll<SVGCircleElement, SkillNode>('.node-accent-ring').attr('r', nodeSize + 4);
    linkSelection.style('stroke-width', `${lineWidth}px`);
    markerSelection
        .attr('markerWidth', arrowSize).attr('markerHeight', arrowSize)
        .attr('refX', nodeSize + 8)
        .select('path').attr('fill', linkColor);
}

/** Creates the color legend in the DOM. */
export function createLegend(selector: string): void {
    if (!color) return;
    const legendContainer = d3.select(selector);
    legendContainer.html('');
    legendContainer.append("h3").style("margin", "0 0 10px 0").text("Functional Categories");

    const legendGrid = legendContainer.append('div').attr('class', 'legend-grid');
    const legendItems = legendGrid.selectAll(".legend-item")
        .data(color.domain())
        .join("div")
        .attr("class", "legend-item");
    legendItems.append("div").attr("class", "legend-color").style("background-color", d => color!(d));
    legendItems.append("span").text((d) => getCategoryLabel(d));

    legendContainer.append('div')
        .attr('class', 'legend-note')
        .text('Continuum weights 1-9 run left to right. Functional lanes organize the graph vertically.');

    const nodeLegend = legendContainer.append('div').attr('class', 'edge-legend');
    nodeLegend.append('div').attr('class', 'edge-legend-title').text('Node Cues');

    const optionalRow = nodeLegend.append('div').attr('class', 'edge-legend-row');
    optionalRow.append('span').attr('class', 'legend-swatch legend-swatch-optional');
    optionalRow.append('span').text('Optional skill');

    const reframeRow = nodeLegend.append('div').attr('class', 'edge-legend-row');
    reframeRow.append('span').attr('class', 'legend-swatch legend-swatch-reframe');
    reframeRow.append('span').text('Needs reframe');

    const safetyRow = nodeLegend.append('div').attr('class', 'edge-legend-row');
    safetyRow.append('span').attr('class', 'legend-swatch legend-swatch-safety');
    safetyRow.append('span').text('Safety-critical');

    const edgeLegend = legendContainer.append('div').attr('class', 'edge-legend');
    edgeLegend.append('div').attr('class', 'edge-legend-title').text('Links');

    const requiredRow = edgeLegend.append('div').attr('class', 'edge-legend-row');
    requiredRow.append('span').attr('class', 'edge-sample edge-sample-required');
    requiredRow.append('span').text('Required prerequisite');

    const orRow = edgeLegend.append('div').attr('class', 'edge-legend-row');
    orRow.append('span').attr('class', 'edge-sample edge-sample-or');
    orRow.append('span').text('OR alternative prerequisite');
}

/** Applies a temporary visual filter (greying out) for hover effects. */
export function applyHighlightFilter(activeNodeIds: string[]): void {
    if (!nodeSelection || !linkSelection) return;
    const activeSet = new Set(activeNodeIds);
    nodeSelection.classed('greyed-out', d => !activeSet.has(d.id));
    linkSelection.classed('greyed-out', l => {
        const resolved = l as unknown as ResolvedSkillLink;
        return !activeSet.has(resolved.source.id) || !activeSet.has(resolved.target.id);
    });
}

/** Finds a visible node by ID and centers the viewport on it. */
export function findAndFocusNode(query: string): boolean {
    if (!query || !simulation || !svg || !zoom) return false;

    const normalized = query.trim().toLowerCase();
    if (!normalized) return false;

    const activeNodes = simulation.nodes();
    const exactMatch = activeNodes.find((node) => node.id.toLowerCase() === normalized);
    const partialMatch = activeNodes.find((node) => node.id.toLowerCase().includes(normalized));
    const targetNode = exactMatch ?? partialMatch;

    if (!targetNode) return false;

    highlightNeighbors(targetNode);

    const svgNode = svg.node();
    const viewportNode = svgNode?.parentElement;
    const width = viewportNode?.clientWidth ?? svgNode?.clientWidth ?? 0;
    const height = viewportNode?.clientHeight ?? svgNode?.clientHeight ?? 0;
    const targetScale = 1.4;
    const transform = d3.zoomIdentity
        .translate(width / 2 - (targetNode.x ?? 0) * targetScale, height / 2 - (targetNode.y ?? 0) * targetScale)
        .scale(targetScale);

    svg.transition().duration(350).call(zoom.transform, transform);
    return true;
}

export function getSelectedNodeIds(): string[] {
    return [...selectedNodes];
}

/**
 * Draws weighted maturity guide lines (1..10) across the active graph width.
 * The layer lives inside the zoomable graph container so it pans/zooms with nodes.
 */
export function updateWeightGuides(config: {
    visible: boolean;
    leftEdge: number;
    usableWidth: number;
    height: number;
    topInset?: number;
    bottomInset?: number;
    minLevel?: number;
    maxLevel?: number;
    bands?: GuideBand[];
    lanes?: GuideLane[];
    snapNodes?: boolean;
}): void {
    if (!weightGuideLayer || !weightBandLayer || !laneGuideLayer || !weightLineLayer) return;

    const minLevel = config.minLevel ?? 1;
    const maxLevel = config.maxLevel ?? 10;
    const yTop = Math.max(0, config.topInset ?? 0);
    const yBottom = Math.max(yTop, config.height - (config.bottomInset ?? 0));
    const levelSpan = Math.max(1, maxLevel - minLevel);
    const stepWidth = config.usableWidth / levelSpan;
    const xForLevel = (level: number): number =>
        config.leftEdge + ((level - minLevel) / levelSpan) * config.usableWidth;
    const clampX = (x: number): number => {
        const svgWidth = svg?.node()?.clientWidth ?? (config.leftEdge + config.usableWidth + stepWidth);
        return Math.max(0, Math.min(svgWidth, x));
    };
    const guideLeft = clampX(config.leftEdge - stepWidth / 2);
    const guideRight = clampX(config.leftEdge + config.usableWidth + stepWidth / 2);
    const lineData = config.visible ? d3.range(minLevel, maxLevel + 1) : [];
    const bandData = config.visible ? (config.bands ?? []) : [];
    const laneData = config.visible ? (config.lanes ?? []) : [];
    weightGuideConfig = {
        visible: config.visible,
        leftEdge: config.leftEdge,
        usableWidth: config.usableWidth,
        height: config.height,
        topInset: yTop,
        bottomInset: config.bottomInset ?? 0,
        minLevel,
        maxLevel,
        snapNodes: Boolean(config.snapNodes),
        bands: bandData,
        lanes: laneData,
    };

    const bands = weightBandLayer
        .selectAll<SVGGElement, GuideBand>('g.weight-band')
        .data(bandData, (band) => band.label);

    const bandsEnter = bands.enter()
        .append('g')
        .attr('class', 'weight-band');

    bandsEnter.append('rect').attr('class', 'weight-band-fill');
    bandsEnter.append('text').attr('class', 'weight-band-label');

    bandsEnter.merge(bands).each(function applyBand(band: GuideBand, index: number) {
        const selection = d3.select(this);
        const startX = clampX(xForLevel(band.startLevel) - stepWidth / 2);
        const endX = clampX(xForLevel(band.endLevel) + stepWidth / 2);
        selection.classed('alt', index % 2 === 1);
        selection.select<SVGRectElement>('rect')
            .attr('x', startX)
            .attr('y', yTop)
            .attr('width', Math.max(0, endX - startX))
            .attr('height', Math.max(0, yBottom - yTop));
        selection.select<SVGTextElement>('text')
            .attr('x', (startX + endX) / 2)
            .attr('y', Math.max(12, yTop - 14))
            .text(band.label);
    });

    bands.exit().remove();

    const laneBoundaryData = laneData.length === 0
        ? []
        : [laneData[0].top, ...laneData.map((lane) => lane.bottom)];

    const laneLines = laneGuideLayer
        .selectAll<SVGLineElement, number>('line.lane-guide-line')
        .data(laneBoundaryData, (value) => String(value));

    laneLines.enter()
        .append('line')
        .attr('class', 'lane-guide-line')
        .merge(laneLines)
        .attr('x1', guideLeft)
        .attr('x2', guideRight)
        .attr('y1', (value) => value)
        .attr('y2', (value) => value);

    laneLines.exit().remove();

    const laneLabels = laneGuideLayer
        .selectAll<SVGTextElement, GuideLane>('text.lane-guide-label')
        .data(laneData, (lane) => lane.key);

    laneLabels.enter()
        .append('text')
        .attr('class', 'lane-guide-label')
        .merge(laneLabels)
        .attr('x', Math.max(12, config.leftEdge - 12))
        .attr('y', (lane) => (lane.top + lane.bottom) / 2)
        .text((lane) => lane.label);

    laneLabels.exit().remove();

    const guides = weightLineLayer
        .selectAll<SVGGElement, number>('g.weight-guide')
        .data(lineData, (level) => String(level));

    const guidesEnter = guides.enter()
        .append('g')
        .attr('class', 'weight-guide');

    guidesEnter.append('line').attr('class', 'weight-guide-line');
    guidesEnter.append('text').attr('class', 'weight-guide-label');

    const merged = guidesEnter.merge(guides);
    merged.each(function applyGuide(level: number) {
        const x = xForLevel(level);
        const selection = d3.select(this);
        selection.classed('boundary', level === minLevel || level === maxLevel);
        selection.select<SVGLineElement>('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', yTop)
            .attr('y2', yBottom);
        selection.select<SVGTextElement>('text')
            .attr('x', x)
            .attr('y', yTop + 3)
            .text(String(level));
    });

    guides.exit().remove();
}
