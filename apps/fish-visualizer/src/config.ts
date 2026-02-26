import * as d3 from 'd3';
import type { SkillNode } from './types';

export const CATEGORY_LABELS: Record<string, string> = {
    'ADT':  'Adaptive Behavior (ADT)',
    'AFF':  'Affective (AFF)',
    'COG':  'Cognitive (COG)',
    'SEN':  'Sensorimotor (SEN)',
    'SOC':  'Social (SOC)',
    'S&L':  'Speech & Language (S&L)',
    'SandL':'Speech & Language (S&L)', // groupDataByCategory replaces & with 'and'
    'VOC':  'Vocational (VOC)',
};

export const getGroup = (id: string): string => {
    const firstWord = id.split(' ')[0];
    if (['ADT', 'AFF', 'COG', 'SEN', 'SOC', 'S&L', 'VOC'].includes(firstWord)) {
        return firstWord;
    }
    return 'Other';
};

export function createColorScale(nodes: SkillNode[]): d3.ScaleOrdinal<string, string, never> {
    const groups = [...new Set(nodes.map(d => getGroup(d.id)))].sort();

    // User-specified color palette
    const customColors = ['#f090ae', '#ea9e5e', '#a8bd61', '#76c788', '#33c6dc', '#94adff', '#dd95d6'];

    return d3.scaleOrdinal<string, string, never>()
        .domain(groups)
        .range(customColors);
}
