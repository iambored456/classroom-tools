// js/config.js

/**
 * Determines the category group for a given node ID.
 * @param {string} id The node ID (e.g., "ADT 1", "COG 5").
 * @returns {string} The category name (e.g., "ADT", "COG").
 */
export const getGroup = (id) => {
    const firstWord = id.split(' ')[0];
    if (['ADT', 'AFF', 'COG', 'SEN', 'SOC', 'S&L', 'VOC'].includes(firstWord)) {
        return firstWord;
    }
    return 'Other';
};

/**
 * Creates a D3 color scale for the node categories using the specified palette.
 * @param {Array<object>} nodes - The array of node objects.
 * @returns {d3.ScaleOrdinal} A D3 ordinal color scale.
 */
export function createColorScale(nodes) {
    const groups = [...new Set(nodes.map(d => getGroup(d.id)))].sort();
    
    // User-specified color palette
    const customColors = ['#f090ae', '#ea9e5e', '#a8bd61', '#76c788', '#33c6dc', '#94adff', '#dd95d6'];
    
    return d3.scaleOrdinal()
        .domain(groups)
        .range(customColors);
}