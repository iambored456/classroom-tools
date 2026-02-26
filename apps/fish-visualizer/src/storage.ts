import type { SkillNode, SavedPositions, StudentState, Settings, ProgressState } from './types';

const POSITIONS_KEY = 'skillGraphPositions';
const SETTINGS_KEY = 'skillGraphViewSettings';

// --- Generic Storage Functions ---

export function saveItem(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
}

export function loadItem<T = unknown>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : null;
    } catch (e) {
        console.error("Error reading from localStorage", e);
        return null;
    }
}

// --- Specific Implementations ---

export function savePositions(nodes: SkillNode[]): void {
    const positions: SavedPositions = {};
    nodes.forEach(node => {
        // Only save position if it's defined (nodes that are filtered out won't have x/y)
        if (node.x !== undefined && node.y !== undefined) {
            positions[node.id] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };
        }
    });
    saveItem(POSITIONS_KEY, positions);
}

export function loadPositions(): SavedPositions | null {
    return loadItem<SavedPositions>(POSITIONS_KEY);
}

export function saveViewSettings(settings: Settings): void {
    saveItem(SETTINGS_KEY, settings);
}

export function loadViewSettings(): Partial<Settings> | null {
    return loadItem<Partial<Settings>>(SETTINGS_KEY);
}

/** Clears all data related to this application from localStorage. */
export function clearAll(): void {
    Object.keys(localStorage)
        .filter(key => key.startsWith('skillGraph') || key.startsWith('sidebar') || key.startsWith('skillChecklist'))
        .forEach(key => localStorage.removeItem(key));
}


// --- Import/Export ---

export function handleExport(nodes: SkillNode[]): void {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
        positions[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(positions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "skill-layout.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function handleImport(onImport: (positions: SavedPositions) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') return;
                const positions = JSON.parse(result) as SavedPositions;
                onImport(positions);
            } catch {
                alert("Could not import layout. The file is not valid JSON.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}


// --- Student Slot Storage ---

const STUDENT_NAMES_KEY = 'studentSlotNames';
const ACTIVE_STUDENT_KEY = 'activeStudentSlot';

export function loadStudentNames(): string[] {
    return loadItem<string[]>(STUDENT_NAMES_KEY) ?? Array.from({ length: 10 }, (_, i) => `Student ${i + 1}`);
}

export function saveStudentNames(names: string[]): void {
    saveItem(STUDENT_NAMES_KEY, names);
}

export function loadActiveStudent(): number | null {
    const val = loadItem<unknown>(ACTIVE_STUDENT_KEY);
    return typeof val === 'number' ? val : null;
}

export function saveActiveStudent(index: number): void {
    saveItem(ACTIVE_STUDENT_KEY, index);
}

/** Snapshots all current app state (including node positions) into the student's namespace. */
export function saveStudentState(index: number, nodes: SkillNode[]): void {
    const positions: SavedPositions = {};
    nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
            positions[node.id] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };
        }
    });
    saveItem(`student:${index}:skillGraphPositions`, positions);

    // Snapshot the remaining state from the main localStorage keys
    const snapshotKeys = [
        'skillChecklistState',
        'sidebarDropdownState',
        'skillSortState',
        'skillGraphViewSettings',
        'skillGraphProgressState',
    ];
    snapshotKeys.forEach(key => {
        saveItem(`student:${index}:${key}`, loadItem(key));
    });
}

/** Loads all saved state for a student. Returns null values for keys with no saved data. */
export function loadStudentState(index: number): StudentState {
    return {
        skillGraphPositions: loadItem<SavedPositions>(`student:${index}:skillGraphPositions`),
        skillChecklistState: loadItem(`student:${index}:skillChecklistState`),
        sidebarDropdownState: loadItem<Record<string, boolean>>(`student:${index}:sidebarDropdownState`),
        skillSortState: loadItem<string>(`student:${index}:skillSortState`),
        skillGraphViewSettings: loadItem<Partial<Settings>>(`student:${index}:skillGraphViewSettings`),
        skillGraphProgressState: loadItem<ProgressState>(`student:${index}:skillGraphProgressState`),
    };
}
