// js/storage.js

const POSITIONS_KEY = 'skillGraphPositions';
const SETTINGS_KEY = 'skillGraphViewSettings';

// --- Generic Storage Functions ---
export function saveItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
}

export function loadItem(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error("Error reading from localStorage", e);
        return null;
    }
}

// --- Specific Implementations ---
export function savePositions(nodes) {
    const positions = {};
    nodes.forEach(node => {
        // Only save position if it's defined (nodes that are filtered out won't have x/y)
        if (node.x !== undefined && node.y !== undefined) {
            positions[node.id] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };
        }
    });
    saveItem(POSITIONS_KEY, positions);
}

export function loadPositions() {
    return loadItem(POSITIONS_KEY);
}

export function saveViewSettings(settings) {
    saveItem(SETTINGS_KEY, settings);
}

export function loadViewSettings() {
    return loadItem(SETTINGS_KEY);
}

/** Clears all data related to this application from localStorage. */
export function clearAll() {
    // Get all keys from localStorage
    Object.keys(localStorage)
        // Filter for keys used by this app
        .filter(key => key.startsWith('skillGraph') || key.startsWith('sidebar') || key.startsWith('skillChecklist'))
        // Remove each key
        .forEach(key => localStorage.removeItem(key));
}


// --- Import/Export ---
export function handleExport(nodes) {
    const positions = {};
    nodes.forEach(node => {
        positions[node.id] = { x: node.x, y: node.y };
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(positions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "skill-layout.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function handleImport(onImport) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const positions = JSON.parse(event.target.result);
                onImport(positions);
            } catch (error) {
                alert("Could not import layout. The file is not valid JSON.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}