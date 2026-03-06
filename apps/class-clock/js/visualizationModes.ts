export const VISUALIZATION_MODE_OPTIONS = [
    { id: 'progress', label: 'Progress Bar', description: 'Minimal fill with a moving time marker.' },
    { id: 'sand', label: 'Sand Bars', description: 'Physics-based hex particles rising through the five stages.' },
    { id: 'water', label: 'Water Bars', description: 'Fluid columns with droplets and surface motion.' },
    { id: 'candle', label: 'Candles', description: 'Five candles burn down from left to right.' },
    { id: 'none', label: 'Label Only', description: 'Hide timeline visuals and keep only text.' }
];

const VALID_MODE_IDS = new Set(VISUALIZATION_MODE_OPTIONS.map(option => option.id));
const STAGE_VISUALIZATION_MODE_IDS = new Set(['candle']);

export function normalizeVisualizationMode(mode) {
    const normalizedMode = ['ice', 'plant', 'bubbles', 'fractal'].includes(mode) ? 'candle' : mode;
    return VALID_MODE_IDS.has(normalizedMode) ? normalizedMode : 'progress';
}

export function isStageVisualizationMode(mode) {
    return STAGE_VISUALIZATION_MODE_IDS.has(normalizeVisualizationMode(mode));
}

export function isLegacyFillMode(mode) {
    const normalized = normalizeVisualizationMode(mode);
    return normalized === 'sand' || normalized === 'water';
}

export function isProgressVisualizationMode(mode) {
    return normalizeVisualizationMode(mode) === 'progress';
}

export function hasTimelineVisualization(mode) {
    return normalizeVisualizationMode(mode) !== 'none';
}
