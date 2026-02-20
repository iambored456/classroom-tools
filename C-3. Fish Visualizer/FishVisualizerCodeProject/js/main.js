// js/main.js
import { calculateNodeLevels } from './utils.js';
import * as storage from './storage.js';
import { 
    setupGraph, redrawGraph, renderPositions, updateGraphView, 
    createLegend, applyHighlightFilter 
} from './graph.js';

// --- STATE & STORAGE KEYS ---
const DEFAULT_SETTINGS = {
    nodeSize: 8, lineWidth: 1.5, arrowSize: 6, repulsion: -250, spacing: 100 
};
const CHECKBOX_STATE_KEY = 'skillChecklistState';
const DROPDOWN_STATE_KEY = 'sidebarDropdownState';
const SORT_STATE_KEY = 'skillSortState'; // Key for saving sort order

let masterNodes = [], masterLinks = []; // Store the full dataset
let simulation;
let currentSortOrder = storage.loadItem(SORT_STATE_KEY) || 'alpha'; // Load saved sort order or default to alphabetical

// --- INITIALIZATION ---
async function initializeApp() {
    // 1. Load All Data
    const [edgeData, skillsData, appendixAData, appendixBData] = await Promise.all([
        d3.json('data/edges.json'), d3.json('data/skills.json'),
        d3.json('data/appendixA.json'), d3.json('data/appendixB.json')
    ]).catch(error => {
        console.error("Failed to load data files. Ensure data/ folder is correct.", error);
        alert("Error: Could not load data files. Check console (F12).");
        return []; // Exit gracefully if data fails
    });

    if (!edgeData || !skillsData) return; // Exit if essential data is missing

    // 2. Prepare Master Data Lists
    // Combine node info, descriptions, and prerequisite counts
    masterNodes = Object.keys(skillsData).map(id => ({
        id: id,
        description: skillsData[id],
        prereqCount: appendixAData[id]?.length || 0 // Get count from Appendix A, default to 0
    }));

    const nodeMap = new Map(masterNodes.map(node => [node.id, node]));
    masterLinks = edgeData.filter(d => nodeMap.has(d.source) && nodeMap.has(d.target))
        .map(d => ({ source: nodeMap.get(d.source), target: nodeMap.get(d.target) }));

    // 3. Load Saved Positions
    const savedPositions = storage.loadPositions();
    if (savedPositions) {
        masterNodes.forEach(node => {
            if (savedPositions[node.id]) {
                // Apply saved x, y, fx, fy
                Object.assign(node, savedPositions[node.id]);
            }
        });
    }

    // 4. Setup Sidebar and Get Initial Filter/Sort State
    const savedCheckboxState = storage.loadItem(CHECKBOX_STATE_KEY) || {};
    populateSidebar(skillsData, appendixAData, appendixBData, savedCheckboxState);
    
    // 5. Create the Force Simulation
    const { width, height } = d3.select("#network-graph").node().getBoundingClientRect();
    const settings = storage.loadViewSettings() || DEFAULT_SETTINGS; // Load current view settings

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05)) // Initial Y force will be adjusted by calculateNodeLevels
        .force("collide", d3.forceCollide())
        .on("tick", renderPositions); // Update positions on each tick

    // 6. Setup Graph Canvas and Perform Initial Draw
    setupGraph('#network-graph', simulation);
    updateActiveGraph(); // Draw the graph based on initial (or saved) filter state
    createLegend('#legend'); // Create the legend
    setupUIListeners(); // Set up listeners for sliders, buttons, etc.
}

/** Filters master data based on checklist state and tells the graph to redraw. */
function updateActiveGraph() {
    const savedCheckboxState = storage.loadItem(CHECKBOX_STATE_KEY) || {};
    
    // Determine which nodes are currently checked (active)
    const activeNodeIds = new Set(
        masterNodes.filter(n => savedCheckboxState[n.id] ?? true).map(n => n.id)
    );

    // Filter the master lists to create the data for the current view
    const activeNodes = masterNodes.filter(n => activeNodeIds.has(n.id));
    const activeLinks = masterLinks.filter(l => activeNodeIds.has(l.source.id) && activeNodeIds.has(l.target.id));

    // Tell the graph module to redraw with the filtered data
    redrawGraph(activeNodes, activeLinks, (allNodes) => {
        storage.savePositions(allNodes); // Save positions when dragging ends
    });
}

// --- SORTING & SIDEBAR MANAGEMENT ---

/** Natural sorting for skill IDs (e.g., ADT 2 before ADT 10). */
function naturalSort(a, b) {
    return a.id.localeCompare(b.id, undefined, { numeric: true });
}

/** Sorting for skills by prerequisite count (descending). */
function prereqSort(a, b) {
    const countDiff = b.prereqCount - a.prereqCount; // Higher count first
    return countDiff !== 0 ? countDiff : naturalSort(a, b); // Use natural sort for ties
}

/** Groups skill data by category (ADT, COG, etc.), respecting the node sorting. */
function groupDataByCategory(data, nodeObjects) {
    const grouped = {};
    const dataKeys = Object.keys(data); // Keys from the input data object

    for (const node of nodeObjects) { // Iterate over nodes (already sorted)
        if(dataKeys.includes(node.id)) { // Only process if the node exists in the data being grouped
            const category = node.id.split(' ')[0].replace('&', 'and'); // Get category, e.g., "ADT"
            if (!grouped[category]) {
                grouped[category] = {}; // Initialize category if it doesn't exist
            }
            grouped[category][node.id] = data[node.id];
        }
    }
    return grouped;
}

/** Populates the sidebar with nested lists for skills, appendix A, and appendix B. */
function populateSidebar(skills, appendixA, appendixB, savedCheckboxState) {
    // Load saved state for dropdowns
    const savedDropdownState = storage.loadItem(DROPDOWN_STATE_KEY) || {};

    // --- Create Sort Button for Skill Checklist ---
    const summary = d3.select("#checklist-section > summary");
    summary.append("button")
        .attr("class", "sort-button")
        .text(`Sort: ${currentSortOrder === 'alpha' ? 'A-Z' : '# Pre'}`)
        .on('click', (event) => {
            event.preventDefault(); // Prevent the details disclosure from toggling
            event.stopPropagation(); // Prevent event from bubbling up
            
            // Toggle the sort order
            currentSortOrder = currentSortOrder === 'alpha' ? 'prereq' : 'alpha';
            storage.saveItem(SORT_STATE_KEY, currentSortOrder); // Save the new sort preference
            
            // Update button text
            d3.select(event.currentTarget).text(`Sort: ${currentSortOrder === 'alpha' ? 'A-Z' : '# Pre'}`);
            
            // Re-render the skill checklist with the new sort order
            renderSkillChecklist(skills); 
        });

    // Render all sidebar sections
    renderSkillChecklist(skills);
    renderAppendix('#appendix-a-container', appendixA);
    renderAppendix('#appendix-b-container', appendixB);
}

/** Renders the skill checklist, applying current sort order and saved states. */
function renderSkillChecklist(skills) {
    const container = d3.select('#skill-checklist-container');
    container.html(''); // Clear existing content
    const savedCheckboxState = storage.loadItem(CHECKBOX_STATE_KEY) || {};
    const savedDropdownState = storage.loadItem(DROPDOWN_STATE_KEY) || {};

    // Sort masterNodes based on the current sort order
    const sortedMasterNodes = [...masterNodes].sort(currentSortOrder === 'alpha' ? naturalSort : prereqSort);
    const groupedSkills = groupDataByCategory(skills, sortedMasterNodes); // Group data using the sorted nodes

    // Create category groups (details elements)
    const categoryGroups = container.selectAll('.category-group')
        .data(Object.entries(groupedSkills))
        .join('details').attr('class', 'category-group')
        .property('open', d => savedDropdownState[d[0]] ?? true); // Restore dropdown state

    // Add summary for each category
    categoryGroups.append('summary').attr('class', 'category-summary').text(d => d[0])
        .on('click', function() { // Save dropdown state on click
            const parent = this.parentElement;
            const category = d3.select(parent).datum()[0];
            savedDropdownState[category] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });
    
    // Add list items within each category
    const items = categoryGroups.selectAll('.list-item')
        .data(d => Object.entries(d[1])).join('div').attr('class', 'list-item');
    
    const labels = items.append('label');
    labels.append('input').attr('type', 'checkbox').attr('data-id', d => d[0])
        .property('checked', d => savedCheckboxState[d[0]] ?? true); // Restore checkbox state
    labels.append('span').attr('class', 'code').text(d => d[0]);
    labels.append('span').attr('class', 'skill').text(d => d[1]);
    
    container.on('change', handleSkillFilterChange); // Attach the filter change listener
}

/** Renders appendix sections (A and B) with nested lists. */
function renderAppendix(selector, data) {
    const container = d3.select(selector);
    container.html('');
    // Group appendix data - uses natural sort for category order
    const groupedData = groupDataByCategory(data, [...masterNodes].sort(naturalSort));
    const savedDropdownState = storage.loadItem(DROPDOWN_STATE_KEY) || {};
    
    const categoryGroups = container.selectAll('.category-group')
        .data(Object.entries(groupedData))
        .join('details').attr('class', 'category-group')
        .property('open', d => savedDropdownState[d[0]] ?? false); // Default to closed unless saved

    categoryGroups.append('summary').attr('class', 'category-summary').text(d => d[0])
        .on('click', function() { // Save dropdown state on click
            const parent = this.parentElement;
            const category = d3.select(parent).datum()[0];
            savedDropdownState[category] = !parent.open;
            storage.saveItem(DROPDOWN_STATE_KEY, savedDropdownState);
        });
    
    categoryGroups.selectAll('.list-item')
        .data(d => Object.entries(d[1]))
        .join('div').attr('class', 'list-item')
        .attr('data-id', d => d[0])
        // Hover effect for highlighting related nodes
        .on('mouseover', (e, d) => applyHighlightFilter([d[0], ...parseRange(d[1])]))
        .on('mouseout', () => applyHighlightFilter([])) // Clear highlight on mouse out
        .html(d => `<span class="code">${d[0]}</span><span class="skill">${d[1].join(', ')}</span>`);
}

/** Handles changes to the skill checklist checkboxes. */
function handleSkillFilterChange(event) {
    const checkbox = event.target;
    const skillId = checkbox.dataset.id;
    
    // Save the state of the changed checkbox immediately
    const savedCheckboxState = storage.loadItem(CHECKBOX_STATE_KEY) || {};
    savedCheckboxState[skillId] = checkbox.checked;
    storage.saveItem(CHECKBOX_STATE_KEY, savedCheckboxState);

    // Re-render the graph with the updated filter
    updateActiveGraph();
}

/** Parses skill ranges (e.g., "ADT 1-5") into individual skill IDs. */
function parseRange(rangeString) {
    // If it's already an array (from a previous parse or if it's a single skill), just return it as an array
    if (Array.isArray(rangeString)) return rangeString.map(s => s.trim()).filter(s => s);
    
    const str = rangeString.trim();
    const rangeRegex = /^([A-Z&]+)\s*(\d+)\s*[–-]\s*(?:([A-Z&]+)\s*)?(\d+)$/i;
    const match = str.match(rangeRegex);
    
    if (match) {
        const prefix = match[1];
        const start = parseInt(match[2], 10), end = parseInt(match[4], 10);
        if (!isNaN(start) && !isNaN(end)) {
            // Generate the sequence of skills
            return Array.from({ length: Math.abs(end - start) + 1 }, (_, i) => `${prefix} ${start + (start < end ? i : -i)}`);
        }
    }
    return [str].filter(s => s); // Return as an array, filtering out empty strings
}

// --- UI EVENT LISTENERS ---
function setupUIListeners() {
    const settings = storage.loadViewSettings() || DEFAULT_SETTINGS;
    // Map keys to their corresponding slider/display IDs for cleaner code
    const sliders = {
        nodeSize: 'node-size', lineWidth: 'line-width', arrowSize: 'arrow-size', 
        repulsion: 'repulsion', spacing: 'spacing'
    };

    // Initialize sliders and attach listeners
    for (const [key, id] of Object.entries(sliders)) {
        const slider = document.getElementById(`${id}-slider`);
        const display = document.getElementById(`${id}-value`);
        
        slider.value = settings[key];
        display.textContent = (key === 'spacing') ? `${settings[key]}%` : settings[key];

        // Update view settings and visual elements on input
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings[key] = value;
            display.textContent = (key === 'spacing') ? `${value}%` : value;
            updateGraphView(settings); // Update node size, line width, arrow size
            // Update simulation forces directly for repulsion and collision
            if (key === 'repulsion') simulation.force("charge").strength(value);
            if (key === 'nodeSize') simulation.force("collide").radius(value + 10); // Adjust collide radius based on node size
            simulation.alpha(0.1).restart(); // Gently restart simulation for visual update
        });
        
        // Save settings when slider value is finalized (on 'change')
        slider.addEventListener('change', () => storage.saveViewSettings(settings));
    }

    // Reset Button Logic
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm("Reset everything? This will clear saved positions, checklist states, and sidebar states.")) {
            storage.clearAll(); // A new function in storage.js to clear everything
            window.location.reload(); // Easiest way to apply fresh defaults
        }
    });

    // Export/Import Buttons
    document.getElementById('export-btn').addEventListener('click', () => storage.handleExport(masterNodes));
    document.getElementById('import-btn').addEventListener('click', () => {
        storage.handleImport(newPositions => {
            storage.savePositions(newPositions);
            window.location.reload(); // Reload to apply imported positions
        });
    });

    // Search Functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        const found = findAndFocusNode(query); // findAndFocusNode is from graph.js
        if (!found) {
            searchInput.classList.add('shake'); // Visual feedback for not found
            setTimeout(() => searchInput.classList.remove('shake'), 500);
        }
    }
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

// --- APP START ---
// Trigger initialization once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);