// js/graph.js
import { getGroup, createColorScale } from './config.js';

let nodeSelection, linkSelection, markerSelection;
let svg, container, zoom, simulation, color;
const selectedNodes = new Set();
let allNodeData = []; // Store the complete list of nodes, including descriptions and prereq counts

/** Creates the initial SVG structure and simulation. */
export function setupGraph(selector, forceSimulation) {
    simulation = forceSimulation; // Store the simulation object
    svg = d3.select(selector);
    container = svg.append("g");
    
    // Add the selection box used for lasso selection
    container.append("rect").attr("id", "selection-box").attr("display", "none");
    
    // Define the arrowhead marker for links
    markerSelection = container.append('defs').append('marker')
        .attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10')
        .attr('orient', 'auto');
    markerSelection.append('path').attr('d', 'M0,-5L10,0L0,5');

    // Create groups for links and nodes to manage them as layers
    container.append("g").attr("class", "links");
    container.append("g").attr("class", "nodes");

    setupInteractions(); // Set up zoom and background drag
}

/** 
 * The new core function. Draws or redraws the graph with a given set of nodes and links.
 * This is called initially and every time the checklist is filtered.
 */
export function redrawGraph(nodes, links, onDragEnd) {
    // Initialize color scale and store all nodes if it's the first render
    if (!color) {
        allNodeData = nodes; // Store the full node list for reference
        color = createColorScale(allNodeData);
    }
    
    // Update the simulation with the new, potentially filtered data
    simulation.nodes(nodes);
    simulation.force("link").links(links);
    
    // D3's data join pattern to efficiently update, add, and remove links
    linkSelection = container.select(".links").selectAll("line")
        .data(links, d => `${d.source.id}-${d.target.id}`) // Key function is crucial for object constancy
        .join(
            enter => enter.append("line") // Append new links
                .attr("class", "link")
                .attr('marker-end', 'url(#arrowhead)'),
            update => update, // Update existing links (no change here, but good practice)
            exit => exit.remove() // Remove links that are no longer in the data
        );

    // D3's data join pattern for nodes
    nodeSelection = container.select(".nodes").selectAll("g.node")
        .data(nodes, d => d.id) // Key function for nodes
        .join(
            enter => {
                // Create a group for each new node to contain circle and text
                const g = enter.append("g").attr("class", "node");
                g.append("circle").attr("fill", d => color(getGroup(d.id)));
                
                // --- TOOLTIP LOGIC ---
                const tooltip = d3.select("#tooltip");
                g.on('mouseover', function(event, d) {
                    tooltip.style('display', 'block')
                           .html(`<div class="code">${d.id}</div><div>${d.description}</div>`);
                })
                .on('mousemove', function(event) {
                    tooltip.style('left', (event.pageX + 15) + 'px')
                           .style('top', (event.pageY + 15) + 'px');
                })
                .on('mouseout', function() {
                    tooltip.style('display', 'none');
                });
                // --- END OF TOOLTIP LOGIC ---
                
                // Attach drag behavior to newly created nodes
                g.call(createNodeDrag(onDragEnd));
                return g;
            },
            update => {
                // Update existing nodes if necessary (e.g., position, appearance)
                update.select('circle').attr("fill", d => color(getGroup(d.id)));
                return update;
            },
            exit => exit.remove() // Remove nodes that are no longer in the data
        );
    
    // Restart the simulation with a bit of energy to settle the new layout
    simulation.alpha(0.3).restart();

    // Re-apply visual styles (size, width) based on current settings
    updateGraphView(JSON.parse(localStorage.getItem('skillGraphViewSettings')) || {});
    // Re-attach click handlers to nodes (important for dynamically created nodes)
    nodeSelection.on("click", handleNodeClick);
}

/** Updates positions from simulation ticks. */
export function renderPositions() {
    if (!nodeSelection || !linkSelection || !nodeSelection.size()) return;
    linkSelection
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    nodeSelection.attr("transform", d => `translate(${d.x},${d.y})`);
}

/** Updates visual styles like size and width. */
export function updateGraphView(settings) {
    if (!nodeSelection || !linkSelection) return;
    const { nodeSize = 8, lineWidth = 1.5, arrowSize = 6 } = settings;
    nodeSelection.selectAll('circle').attr('r', nodeSize);
    linkSelection.style('stroke-width', `${lineWidth}px`);
    markerSelection
        .attr('markerWidth', arrowSize).attr('markerHeight', arrowSize)
        .attr('refX', nodeSize + 8) // Increased refX slightly for larger nodes
        .select('path').attr('fill', '#999');
}

/** Creates the color legend in the DOM. */
export function createLegend(selector) {
    const legendContainer = d3.select(selector);
    legendContainer.html('');
    legendContainer.append("h3").style("margin", "0 0 10px 0").text("Categories");
    const legendItems = legendContainer.selectAll(".legend-item")
        .data(color.domain())
        .join("div")
        .attr("class", "legend-item");
    legendItems.append("div").attr("class", "legend-color").style("background-color", d => color(d));
    legendItems.append("span").text(d => d);
}

// --- HIGHLIGHTING & INTERACTIONS ---

/** Applies a temporary visual filter (greying out) for hover effects. */
export function applyHighlightFilter(activeNodeIds) {
    const activeSet = new Set(activeNodeIds);
    nodeSelection.classed('greyed-out', d => !activeSet.has(d.id));
    linkSelection.classed('greyed-out', l => 
        !activeSet.has(l.source.id) || !activeSet.has(l.target.id)
    );
}

/** Removes all temporary highlights and selections. */
function clearAllHighlights() {
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

/** Highlights a primary node and its direct neighbors. */
function highlightNeighbors(primaryNode) {
    clearAllHighlights();
    if (!primaryNode) return;

    const neighborIds = new Set();
    // Use the links from the simulation's current state to find neighbors
    simulation.force("link").links().forEach(l => {
        if (l.source.id === primaryNode.id) neighborIds.add(l.target.id);
        if (l.target.id === primaryNode.id) neighborIds.add(l.source.id);
    });

    linkSelection
        .filter(l => (l.source.id === primaryNode.id || l.target.id === primaryNode.id))
        .classed("highlighted", true);
    
    nodeSelection.filter(n => neighborIds.has(n.id)).classed("neighbor", true);
    nodeSelection.filter(n => n.id === primaryNode.id).classed("primary-selection", true);
}

/** Creates and returns the drag handler for nodes. */
function createNodeDrag(onDragEnd) {
    return d3.drag()
        .on("start", function(event, d) {
            // If simulation is not active, activate it
            if (!event.active) simulation.alphaTarget(0.3).restart();
            // Set fixed position for the dragged node
            d.fx = d.x;
            d.fy = d.y;
            
            clearAllHighlights(); // Clear previous highlights
            event.sourceEvent.stopPropagation(); // Prevent click event propagation
            
            // Handle multi-selection logic
            if (!selectedNodes.has(d.id)) {
                if (!event.sourceEvent.shiftKey) clearAllHighlights(); // Clear if Shift is not held
                selectedNodes.add(d.id);
            }
            nodeSelection.classed("selected", n => selectedNodes.has(n.id)); // Update visual selection
        })
        .on("drag", function(event) {
            // Drag all selected nodes, keeping their relative positions
            selectedNodes.forEach(nodeId => {
                const nodeToMove = allNodeData.find(n => n.id === nodeId);
                if (nodeToMove) {
                    // If it's the primary dragged node, update its fixed position directly
                    if (nodeToMove.id === event.subject.id) {
                        nodeToMove.fx = event.x;
                        nodeToMove.fy = event.y;
                    } else { 
                        // For other selected nodes, drag them relative to the primary node's drag start
                         if (!nodeToMove.dragStart) { 
                             nodeToMove.dragStart = { x: nodeToMove.x, y: nodeToMove.y };
                         }
                         nodeToMove.fx = nodeToMove.dragStart.x + (event.x - event.subject.x);
                         nodeToMove.fy = nodeToMove.dragStart.y + (event.y - event.subject.y);
                    }
                }
            });
        })
        .on("end", function(event, d) {
            // If no longer dragging, reset alpha target
            if (!event.active) simulation.alphaTarget(0);
            
            // If Shift is NOT held, remove fixed positions for all selected nodes
            // This allows them to participate in simulation again
            if (!event.sourceEvent.shiftKey) {
                 selectedNodes.forEach(nodeId => {
                     const node = allNodeData.find(n => n.id === nodeId);
                     if (node) {
                         node.fx = null;
                         node.fy = null;
                         delete node.dragStart; // Clean up temporary property
                     }
                 });
            }
            onDragEnd(allNodeData); // Save the final positions of all nodes
        });
}

/** Click handler for individual nodes. */
function handleNodeClick(event, d) {
    event.stopPropagation();
    
    // Handle multi-selection with Ctrl/Meta/Shift keys
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
        clearNeighborHighlights(); // Clear red/orange highlights for cleaner selection
        if (selectedNodes.has(d.id)) {
            selectedNodes.delete(d.id);
        } else {
            selectedNodes.add(d.id);
        }
    } else {
        // Single click: clear everything and highlight neighbors
        clearAllHighlights();
        highlightNeighbors(d);
    }
    // Update the visual class for selected nodes
    nodeSelection.classed("selected", n => selectedNodes.has(n.id));
}

/** Sets up global interactions like zoom and background click. */
function setupInteractions() {
    zoom = d3.zoom()
        .scaleExtent([0.1, 8]) // Limit zoom range
        .on("zoom", (event) => { // Apply zoom to the container group
            container.attr("transform", event.transform);
        });
    svg.call(zoom);

    // Handle background click to deselect all nodes
    svg.on("click", () => {
       clearAllHighlights();
    });
}