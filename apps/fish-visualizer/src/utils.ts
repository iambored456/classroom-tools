import type { SkillNode, SkillLink, ProgressStatus, ProgressState, ProgressMetrics, PrerequisiteModel } from './types';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const SKILL_CODE_REGEX = /^([A-Z&]+)\s*(\d+)$/i;
const RANGE_REGEX = /^([A-Z&]+)\s*(\d+)\s*[–-]\s*(?:([A-Z&]+)\s*)?(\d+)$/i;
const OR_REGEX = /^(.+?)\s*\(\s*or\s+(.+?)\s*\)$/i;

export const PROGRESS_STATUS = {
    NOT_STARTED: 'not-started',
    IN_PROGRESS: 'in-progress',
    MASTERED: 'mastered',
} as const satisfies Record<string, ProgressStatus>;

/**
 * Returns the ID string from either a raw string ID or a resolved SkillNode.
 * Used to safely access link source/target which D3 mutates from string → object.
 */
export function getNodeId(nodeOrId: string | SkillNode): string {
    return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
}

/**
 * Calculates the hierarchical level of each node in a directed graph.
 * Level 0 nodes have no incoming links (no prerequisites).
 * @returns The maximum level found in the graph.
 */
export function calculateNodeLevels(nodes: SkillNode[], links: SkillLink[]): number {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Initialize properties
    nodes.forEach(node => {
        node.inDegree = 0;
        node.outLinks = [];
        node.level = -1; // -1 indicates unvisited
    });

    // Calculate in-degrees and build adjacency list for outgoing links
    links.forEach(link => {
        const sourceNode = nodeMap.get(getNodeId(link.source));
        const targetNode = nodeMap.get(getNodeId(link.target));
        if (sourceNode && targetNode) {
            targetNode.inDegree = (targetNode.inDegree ?? 0) + 1;
            (sourceNode.outLinks ??= []).push(targetNode);
        }
    });

    // Initialize queue with nodes that have an in-degree of 0
    const queue = nodes.filter(node => node.inDegree === 0);
    queue.forEach(node => { node.level = 0; });

    let head = 0;
    while (head < queue.length) {
        const u = queue[head++];
        (u.outLinks ?? []).forEach(v => {
            v.inDegree = (v.inDegree ?? 0) - 1;
            v.level = Math.max(v.level ?? -1, (u.level ?? 0) + 1);
            if (v.inDegree === 0) {
                queue.push(v);
            }
        });
    }

    // Handle any cycles or disconnected components by assigning them a default level
    nodes.forEach(node => {
        if (node.level === -1) {
            node.level = 0;
        }
    });

    return Math.max(...nodes.map(n => n.level ?? 0));
}

/**
 * Computes a normalized progression score for each node so the graph can express
 * a left-to-right growth axis (foundational -> advanced).
 */
export function calculateProgressionMetrics(
    nodes: SkillNode[],
    links: SkillLink[],
): { scoreById: Map<string, number>; depthById: Map<string, number>; maxDepth: number } {
    const nodeIds = nodes.map((node) => node.id);
    const incoming = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
    const outgoing = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
    const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
    const outDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));

    links.forEach((link) => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        if (!outgoing.has(sourceId) || !incoming.has(targetId)) return;

        outgoing.get(sourceId)!.push(targetId);
        incoming.get(targetId)!.push(sourceId);
        inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
        outDegree.set(sourceId, (outDegree.get(sourceId) ?? 0) + 1);
    });

    // Longest-path depth from roots (Kahn-style traversal).
    const remainingInDegree = new Map(inDegree);
    const depth = new Map<string, number>(nodeIds.map((id) => [id, 0]));
    const queue = nodeIds.filter((id) => (remainingInDegree.get(id) ?? 0) === 0);
    let head = 0;

    while (head < queue.length) {
        const currentId = queue[head++];
        const currentDepth = depth.get(currentId) ?? 0;
        const neighbors = outgoing.get(currentId) ?? [];

        neighbors.forEach((nextId) => {
            depth.set(nextId, Math.max(depth.get(nextId) ?? 0, currentDepth + 1));
            const nextRemaining = (remainingInDegree.get(nextId) ?? 0) - 1;
            remainingInDegree.set(nextId, nextRemaining);
            if (nextRemaining === 0) {
                queue.push(nextId);
            }
        });
    }

    // If cycles exist, approximate depth from incoming neighbors.
    const unresolvedIds = nodeIds.filter((id) => (remainingInDegree.get(id) ?? 0) > 0);
    unresolvedIds.forEach((id) => {
        const prereqs = incoming.get(id) ?? [];
        if (prereqs.length === 0) return;
        const estimatedDepth = Math.max(...prereqs.map((prereqId) => depth.get(prereqId) ?? 0)) + 1;
        depth.set(id, estimatedDepth);
    });

    const maxDepth = Math.max(1, ...depth.values());
    const maxInDegree = Math.max(1, ...inDegree.values());
    const maxOutDegree = Math.max(1, ...outDegree.values());

    const rawScores = new Map<string, number>();
    nodeIds.forEach((id) => {
        const depthNorm = (depth.get(id) ?? 0) / maxDepth;
        const inDegreeNorm = (inDegree.get(id) ?? 0) / maxInDegree;
        const outDegreeNorm = (outDegree.get(id) ?? 0) / maxOutDegree;
        const raw = 0.70 * depthNorm + 0.45 * inDegreeNorm - 0.25 * outDegreeNorm;
        rawScores.set(id, raw);
    });

    const rawValues = [...rawScores.values()];
    const rawMin = Math.min(...rawValues);
    const rawMax = Math.max(...rawValues);

    const normalized = new Map<string, number>();
    if (rawMax === rawMin) {
        nodeIds.forEach((id) => normalized.set(id, 0.5));
    } else {
        nodeIds.forEach((id) => {
            const raw = rawScores.get(id) ?? 0;
            normalized.set(id, clamp01((raw - rawMin) / (rawMax - rawMin)));
        });
    }

    return {
        scoreById: normalized,
        depthById: depth,
        maxDepth,
    };
}

/** Normalizes scraped/imported text into a comparable token. */
export function normalizeTokenText(value: unknown): string {
    if (value == null) return '';
    return String(value)
        .replace(/â€"/g, '–')
        .replace(/[—]/g, '–')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Expands a prerequisite token into skill IDs (handles ranges). */
export function expandSkillToken(token: string): string[] {
    const normalized = normalizeTokenText(token);
    if (!normalized) return [];

    const rangeMatch = normalized.match(RANGE_REGEX);
    if (rangeMatch) {
        const startPrefix = rangeMatch[1].toUpperCase();
        const endPrefixRaw = rangeMatch[3];
        const endPrefix = endPrefixRaw ? endPrefixRaw.toUpperCase() : startPrefix;
        const start = parseInt(rangeMatch[2], 10);
        const end = parseInt(rangeMatch[4], 10);
        if (!Number.isNaN(start) && !Number.isNaN(end) && startPrefix === endPrefix) {
            const step = start <= end ? 1 : -1;
            return Array.from({ length: Math.abs(end - start) + 1 }, (_, index) => `${startPrefix} ${start + index * step}`);
        }
    }

    const codeMatch = normalized.match(SKILL_CODE_REGEX);
    if (codeMatch) {
        return [`${codeMatch[1].toUpperCase()} ${parseInt(codeMatch[2], 10)}`];
    }
    return [];
}

function setEdgeType(
    edgeTypeByKey: Map<string, 'required' | 'or'>,
    sourceId: string,
    targetId: string,
    edgeType: 'required' | 'or',
): void {
    const edgeKey = `${sourceId}=>${targetId}`;
    const currentType = edgeTypeByKey.get(edgeKey);

    // Required edges always win over OR styling if both are encountered.
    if (edgeType === 'required' || currentType !== 'required') {
        edgeTypeByKey.set(edgeKey, edgeType);
    }
}

/**
 * Parses Appendix A prerequisites into explicit AND/OR groups for each target skill.
 * Each entry in groupsByTarget[target] is a group of alternatives:
 * - group length 1 => required prerequisite
 * - group length > 1 => OR prerequisite alternatives
 */
export function buildPrerequisiteModel(
    appendixAData: Record<string, string[]> | null | undefined,
    validNodeIds: Set<string> | string[],
): PrerequisiteModel {
    const validNodes = validNodeIds instanceof Set ? validNodeIds : new Set(validNodeIds);
    const groupsByTarget = new Map<string, string[][]>();
    const edgeTypeByKey = new Map<string, 'required' | 'or'>();
    const groupCountByTarget = new Map<string, number>();

    for (const [targetId, rawPrerequisites] of Object.entries(appendixAData ?? {})) {
        if (!validNodes.has(targetId)) continue;
        const groups: string[][] = [];

        for (const rawToken of rawPrerequisites ?? []) {
            const token = normalizeTokenText(rawToken);
            if (!token || /^none\b/i.test(token)) continue;

            const orMatch = token.match(OR_REGEX);
            if (orMatch) {
                const alternatives = [orMatch[1], orMatch[2]]
                    .flatMap((part) => expandSkillToken(part))
                    .filter((skillId, index, array) => array.indexOf(skillId) === index && validNodes.has(skillId));

                if (alternatives.length > 0) {
                    groups.push(alternatives);
                    for (const sourceId of alternatives) {
                        setEdgeType(edgeTypeByKey, sourceId, targetId, alternatives.length > 1 ? 'or' : 'required');
                    }
                }
                continue;
            }

            const expanded = expandSkillToken(token).filter((skillId) => validNodes.has(skillId));
            for (const sourceId of expanded) {
                groups.push([sourceId]);
                setEdgeType(edgeTypeByKey, sourceId, targetId, 'required');
            }
        }

        groupsByTarget.set(targetId, groups);
        groupCountByTarget.set(targetId, groups.length);
    }

    return {
        groupsByTarget,
        edgeTypeByKey,
        groupCountByTarget,
    };
}

/**
 * Removes transitive prerequisite edges from a DAG while preserving reachability.
 * If the graph is not a DAG, returns links unchanged.
 */
export function transitiveReduceLinks(nodes: SkillNode[], links: SkillLink[]): SkillLink[] {
    if (!nodes?.length || !links?.length) return links ?? [];

    const nodeIds = nodes.map((node) => node.id);
    const nodeSet = new Set(nodeIds);
    const outIds = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
    const outLinks = new Map<string, SkillLink[]>(nodeIds.map((id) => [id, []]));
    const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
    const uniqueLinks = new Map<string, SkillLink>();

    for (const link of links) {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        if (!nodeSet.has(sourceId) || !nodeSet.has(targetId)) continue;

        const edgeKey = `${sourceId}=>${targetId}`;
        if (uniqueLinks.has(edgeKey)) continue;
        uniqueLinks.set(edgeKey, link);

        outIds.get(sourceId)!.push(targetId);
        outLinks.get(sourceId)!.push(link);
        inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
    }

    const queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
    const remaining = new Map(inDegree);
    const topo: string[] = [];
    let head = 0;

    while (head < queue.length) {
        const currentId = queue[head++];
        topo.push(currentId);
        for (const nextId of outIds.get(currentId) ?? []) {
            const nextRemaining = (remaining.get(nextId) ?? 0) - 1;
            remaining.set(nextId, nextRemaining);
            if (nextRemaining === 0) queue.push(nextId);
        }
    }

    // Not a DAG: skip reduction to avoid wrong edge removals.
    if (topo.length !== nodeIds.length) {
        return [...uniqueLinks.values()];
    }

    const descendants = new Map<string, Set<string>>(nodeIds.map((id) => [id, new Set()]));
    for (let index = topo.length - 1; index >= 0; index -= 1) {
        const sourceId = topo[index];
        const sourceDesc = descendants.get(sourceId)!;
        for (const targetId of outIds.get(sourceId) ?? []) {
            sourceDesc.add(targetId);
            for (const nestedId of descendants.get(targetId) ?? []) {
                sourceDesc.add(nestedId);
            }
        }
    }

    const reducedLinks: SkillLink[] = [];
    for (const link of uniqueLinks.values()) {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        const neighbors = outIds.get(sourceId) ?? [];

        let redundant = false;
        for (const neighborId of neighbors) {
            if (neighborId === targetId) continue;
            if ((descendants.get(neighborId) ?? new Set()).has(targetId)) {
                redundant = true;
                break;
            }
        }

        if (!redundant) reducedLinks.push(link);
    }

    return reducedLinks;
}

export function normalizeProgressStatus(value: unknown): ProgressStatus {
    if (value === PROGRESS_STATUS.MASTERED) return PROGRESS_STATUS.MASTERED;
    if (value === PROGRESS_STATUS.IN_PROGRESS) return PROGRESS_STATUS.IN_PROGRESS;
    return PROGRESS_STATUS.NOT_STARTED;
}

/**
 * Computes readiness and summary metrics for student progress.
 * readiness = mastered prerequisite groups / total prerequisite groups.
 */
export function computeProgressMetrics(
    nodes: SkillNode[],
    groupsByTarget: Map<string, string[][]>,
    progressStateById: Map<string, ProgressStatus> | ProgressState,
): ProgressMetrics {
    const rawStateMap: Map<string, ProgressStatus> = progressStateById instanceof Map
        ? progressStateById
        : new Map(Object.entries(progressStateById ?? {}) as Array<[string, ProgressStatus]>);

    const stateById = new Map<string, ProgressStatus>();
    const readinessById = new Map<string, number>();
    const satisfiedById = new Map<string, number>();
    const totalById = new Map<string, number>();
    const readyNowIds: string[] = [];

    const counts: Record<ProgressStatus | 'readyNow', number> = {
        [PROGRESS_STATUS.NOT_STARTED]: 0,
        [PROGRESS_STATUS.IN_PROGRESS]: 0,
        [PROGRESS_STATUS.MASTERED]: 0,
        readyNow: 0,
    };

    for (const node of nodes) {
        const nodeId = node.id;
        const status = normalizeProgressStatus(rawStateMap.get(nodeId));
        stateById.set(nodeId, status);
        counts[status] += 1;

        const prerequisiteGroups = groupsByTarget.get(nodeId) ?? [];
        const totalGroups = prerequisiteGroups.length;
        let satisfiedGroups = 0;

        for (const group of prerequisiteGroups) {
            const groupSatisfied = group.some((alternativeId) => {
                return normalizeProgressStatus(rawStateMap.get(alternativeId)) === PROGRESS_STATUS.MASTERED;
            });
            if (groupSatisfied) satisfiedGroups += 1;
        }

        const readiness = totalGroups === 0 ? 1 : satisfiedGroups / totalGroups;
        readinessById.set(nodeId, readiness);
        satisfiedById.set(nodeId, satisfiedGroups);
        totalById.set(nodeId, totalGroups);

        if (status !== PROGRESS_STATUS.MASTERED && readiness >= 1) {
            readyNowIds.push(nodeId);
        }
    }

    counts.readyNow = readyNowIds.length;

    return {
        stateById,
        readinessById,
        satisfiedById,
        totalById,
        readyNowIds,
        counts,
    };
}
