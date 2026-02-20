// js/utils.js

/**
 * Calculates the hierarchical level of each node in a directed graph.
 * Level 0 nodes have no incoming links (no prerequisites).
 * @param {Array<object>} nodes - The array of node objects.
 * @param {Array<object>} links - The array of link objects.
 * @returns {number} The maximum level found in the graph.
 */
export function calculateNodeLevels(nodes, links) {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Initialize properties
    nodes.forEach(node => {
        node.inDegree = 0;
        node.outLinks = [];
        node.level = -1; // -1 indicates unvisited
    });

    // Calculate in-degrees and build adjacency list for outgoing links
    links.forEach(link => {
        const sourceNode = nodeMap.get(link.source.id || link.source);
        const targetNode = nodeMap.get(link.target.id || link.target);
        if (sourceNode && targetNode) {
            targetNode.inDegree++;
            sourceNode.outLinks.push(targetNode);
        }
    });

    // Initialize queue with nodes that have an in-degree of 0
    const queue = nodes.filter(node => node.inDegree === 0);
    queue.forEach(node => node.level = 0);

    let head = 0;
    while (head < queue.length) {
        const u = queue[head++];
        u.outLinks.forEach(v => {
            v.inDegree--;
            // Assign level based on the current node's level
            v.level = Math.max(v.level, u.level + 1);
            if (v.inDegree === 0) {
                queue.push(v);
            }
        });
    }

    // Handle any cycles or disconnected components by assigning them a default level
    nodes.forEach(node => {
        if (node.level === -1) {
            node.level = 0; // Default to bottom level if part of a cycle or disconnected
        }
    });

    // Return the maximum level calculated
    return Math.max(...nodes.map(n => n.level));
}