import * as d3 from 'd3';
import type { SkillNode } from './types';

export const LEGACY_CATEGORY_LABELS: Record<string, string> = {
    ADT: 'Adaptive Behavior (ADT)',
    AFF: 'Affective (AFF)',
    COG: 'Cognitive (COG)',
    SEN: 'Sensorimotor (SEN)',
    SOC: 'Social (SOC)',
    'S&L': 'Speech & Language (S&L)',
    SandL: 'Speech & Language (S&L)',
    VOC: 'Vocational (VOC)',
};

export const FUNCTIONAL_CATEGORY_ORDER = [
    'Foundational regulation & learning readiness',
    'Foundational regulation & behavior',
    'Communication & language',
    'Concepts, literacy & numeracy',
    'Personal care & hygiene',
    'Dressing & personal presentation',
    'Eating & food routines',
    'Home & domestic routines',
    'Community access, money & safety',
    'Social interaction & participation',
    'Motor & tool-use foundations',
    'Vocational & work-role functioning',
    'Leisure & enrichment',
] as const;

const FUNCTIONAL_CATEGORY_COLORS: Record<string, string> = {
    'Foundational regulation & learning readiness': '#7dbb6c',
    'Foundational regulation & behavior': '#d96b63',
    'Communication & language': '#2f94b7',
    'Concepts, literacy & numeracy': '#5d77b2',
    'Personal care & hygiene': '#e39b43',
    'Dressing & personal presentation': '#af6b84',
    'Eating & food routines': '#d9be52',
    'Home & domestic routines': '#4f9688',
    'Community access, money & safety': '#8b5e3c',
    'Social interaction & participation': '#4db37f',
    'Motor & tool-use foundations': '#3e8190',
    'Vocational & work-role functioning': '#7b6bb3',
    'Leisure & enrichment': '#8aa05f',
};

const FALLBACK_GROUP_COLORS: Record<string, string> = {
    ADT: '#e28ea0',
    AFF: '#df8b64',
    COG: '#b1b85d',
    SEN: '#79ba8a',
    SOC: '#34b7cb',
    'S&L': '#82a8f2',
    VOC: '#c78ccd',
    Other: '#b8c4d1',
};

export const getLegacyGroup = (id: string): string => {
    const firstWord = id.split(' ')[0];
    if (['ADT', 'AFF', 'COG', 'SEN', 'SOC', 'S&L', 'VOC'].includes(firstWord)) {
        return firstWord;
    }
    return 'Other';
};

export const getCategoryLabel = (group: string): string => LEGACY_CATEGORY_LABELS[group] ?? group;

export const getNodeGroup = (node: Pick<SkillNode, 'id' | 'visualGroup'>): string =>
    node.visualGroup || getLegacyGroup(node.id);

function colorForGroup(group: string): string {
    return FUNCTIONAL_CATEGORY_COLORS[group] ?? FALLBACK_GROUP_COLORS[group] ?? FALLBACK_GROUP_COLORS.Other;
}

export function createColorScale(
    nodes: SkillNode[],
    preferredOrder: readonly string[] = FUNCTIONAL_CATEGORY_ORDER,
): d3.ScaleOrdinal<string, string, never> {
    const presentGroups = new Set(nodes.map(getNodeGroup));
    const domain = [
        ...preferredOrder.filter((group) => presentGroups.has(group)),
        ...[...presentGroups].filter((group) => !preferredOrder.includes(group)).sort(),
    ];

    return d3.scaleOrdinal<string, string, never>()
        .domain(domain)
        .range(domain.map((group) => colorForGroup(group)));
}
