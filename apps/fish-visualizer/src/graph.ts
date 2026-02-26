import * as d3 from 'd3';
import { getGroup, createColorScale, CATEGORY_LABELS } from './config';
import { PROGRESS_STATUS, normalizeProgressStatus, getNodeId } from './utils';
import type { SkillNode, SkillLink, ResolvedSkillLink, StyleOptions, Settings } from './types';

// --- Module-level State ---

let nodeSelection: d3.Selection<SVGGElement, SkillNode, SVGGElement, unknown> | null = null;
let linkSelection: d3.Selection<SVGLineElement, SkillLink, SVGGElement, unknown> | null = null;
let markerSelection: d3.Selection<SVGMarkerElement, unknown, HTMLElement, unknown> | null = null;
let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown> | null = null;
let container: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null;
let weightGuideLayer: d3.Selection<SVGGElement, unknown, SVGGElement, unknown> | null = null;
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let simulation: d3.Simulation<SkillNode, SkillLink> | null = null;
let color: d3.ScaleOrdinal<string, string, never> | null = null;
let weightGuideConfig = {
    visible: false,
    leftEdge: 0,
    usableWidth: 1,
    height: 0,
    minLevel: 1,
    maxLevel: 10,
    snapNodes: false,
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

function getNodeFill(nodeId: string): string {
    if (!styleOptions.progressMode) return color!(getGroup(nodeId));
    const status = getNodeProgressStatus(nodeId);
    if (status === PROGRESS_STATUS.MASTERED) return '#52b788';
    if (status === PROGRESS_STATUS.IN_PROGRESS) return '#f4a261';
    return '#d4dce7';
}

function applyNodeVisualState(): void {
    if (!nodeSelection) return;

    nodeSelection
        .classed('progress-mode', styleOptions.progressMode)
        .classed('status-not-started', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.NOT_STARTED)
        .classed('status-in-progress', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.IN_PROGRESS)
        .classed('status-mastered', (node) => styleOptions.progressMode && getNodeProgressStatus(node.id) === PROGRESS_STATUS.MASTERED)
        .classed('status-ready-now', (node) => {
            if (!styleOptions.progressMode) return false;
            const status = getNodeProgressStatus(node.id);
            const readiness = styleOptions.readinessById.get(node.id) ?? 0;
            return status !== PROGRESS_STATUS.MASTERED && readiness >= 1;
        });

    nodeSelection.select<SVGCircleElement>('circle')
        .attr('fill', (node) => getNodeFill(node.id))
        .attr('stroke', (node) => styleOptions.progressMode ? color!(getGroup(node.id)) : null)
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
    if (!styleOptions.progressMode) {
        return `<div class="code">${node.id}</div><div>${node.description}</div>`;
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
    ].join('');
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

            if (!(event.sourceEvent as MouseEvent).shiftKey) {
                selectedNodes.forEach(nodeId => {
                    const node = allNodeData.find(n => n.id === nodeId);
                    if (node) {
                        node.fx = null;
                        node.fy = null;
                        delete node.dragStart;
                    }
                });
            }
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
                g.append("circle");
                g.call(createNodeDrag(onDragEnd));
                return g;
            },
            update => update,
            exit => exit.remove(),
        );

    // Tooltip logic
    const tooltip = d3.select("#tooltip");
    nodeSelection.on('mouseover', function(_event: MouseEvent, d: SkillNode) {
        tooltip.style('display', 'block')
            .html(buildTooltipHtml(d));
    })
    .on('mousemove', function(event: MouseEvent) {
        const tooltipNode = tooltip.node() as HTMLElement | null;
        if (!tooltipNode) return;
        const pad = 15;
        const tw = tooltipNode.offsetWidth;
        const th = tooltipNode.offsetHeight;

        let left = event.pageX + pad;
        let top  = event.pageY + pad;

        if (event.clientX + pad + tw > window.innerWidth)  left = event.pageX - tw - pad;
        if (event.clientY + pad + th > window.innerHeight) top  = event.pageY - th - pad;

        left = Math.max(0, left);
        top  = Math.max(0, top);

        tooltip.style('left', left + 'px').style('top', top + 'px');
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
    nodeSelection.selectAll<SVGCircleElement, SkillNode>('circle').attr('r', nodeSize);
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
    legendContainer.append("h3").style("margin", "0 0 10px 0").text("Categories");

    const legendItems = legendContainer.selectAll(".legend-item")
        .data(color.domain())
        .join("div")
        .attr("class", "legend-item");
    legendItems.append("div").attr("class", "legend-color").style("background-color", d => color!(d));
    legendItems.append("span").text(d => CATEGORY_LABELS[d] ?? d);

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
    const width = svgNode?.clientWidth ?? 0;
    const height = svgNode?.clientHeight ?? 0;
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
    minLevel?: number;
    maxLevel?: number;
    snapNodes?: boolean;
}): void {
    if (!weightGuideLayer) return;

    const minLevel = config.minLevel ?? 1;
    const maxLevel = config.maxLevel ?? 10;
    const yTop = 0;
    const yBottom = Math.max(0, config.height);
    const data = config.visible
        ? d3.range(minLevel, maxLevel + 1)
        : [];
    weightGuideConfig = {
        visible: config.visible,
        leftEdge: config.leftEdge,
        usableWidth: config.usableWidth,
        height: config.height,
        minLevel,
        maxLevel,
        snapNodes: Boolean(config.snapNodes),
    };

    const guides = weightGuideLayer
        .selectAll<SVGGElement, number>('g.weight-guide')
        .data(data, (level) => String(level));

    const guidesEnter = guides.enter()
        .append('g')
        .attr('class', 'weight-guide');

    guidesEnter.append('line').attr('class', 'weight-guide-line');
    guidesEnter.append('text').attr('class', 'weight-guide-label');

    const merged = guidesEnter.merge(guides);
    merged.each(function applyGuide(level: number) {
        const ratio = (level - minLevel) / Math.max(1, maxLevel - minLevel);
        const x = config.leftEdge + ratio * config.usableWidth;
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
