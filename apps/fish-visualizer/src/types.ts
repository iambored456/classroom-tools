import type * as d3 from 'd3';

// --- Progress & Display Types ---

export type ProgressStatus = 'not-started' | 'in-progress' | 'mastered';
export type ProgressState = Record<string, ProgressStatus>;
export type LayoutMode = 'free-force' | 'growth-axis' | 'layered-lanes';
export type OffOffDisplay = 'dim' | 'remove';
export type Theme = 'dark' | 'light';

/** Keys in Settings that are numeric (used for the slider loop). */
export type NumericSettingKey =
  | 'nodeSize'
  | 'lineWidth'
  | 'arrowSize'
  | 'repulsion'
  | 'spacing'
  | 'progression';

// --- Node & Link Types ---

export interface SkillNode extends d3.SimulationNodeDatum {
  id: string;
  description: string;
  prereqCount: number;
  progressionScore: number;
  progressionDepth: number;
  /** Temporary: set by calculateNodeLevels, not persisted. */
  inDegree?: number;
  /** Temporary: set by calculateNodeLevels, not persisted. */
  outLinks?: SkillNode[];
  /** Temporary: set by calculateNodeLevels, not persisted. */
  level?: number;
  /** Temporary: set by drag handler, cleaned up on drag end. */
  dragStart?: { x: number; y: number };
}

export interface SkillLink extends d3.SimulationLinkDatum<SkillNode> {
  source: string | SkillNode;
  target: string | SkillNode;
}

/**
 * After D3's forceLink resolves IDs, source and target become SkillNode objects.
 * Use this type in callbacks where the simulation has already run.
 */
export interface ResolvedSkillLink {
  source: SkillNode;
  target: SkillNode;
}

/** Raw edge from edges.json before the D3 simulation resolves node references. */
export interface RawEdge {
  source: string;
  target: string;
}

// --- Settings ---

export interface Settings {
  theme: Theme;
  nodeSize: number;
  lineWidth: number;
  arrowSize: number;
  repulsion: number;
  spacing: number;
  progression: number;
  layoutMode: LayoutMode;
  transitiveReduction: boolean;
  progressMode: boolean;
  offOffDisplay: OffOffDisplay;
  snapToGuides: boolean;
}

// --- Prerequisite Model ---

export interface PrerequisiteModel {
  groupsByTarget: Map<string, string[][]>;
  edgeTypeByKey: Map<string, 'required' | 'or'>;
  groupCountByTarget: Map<string, number>;
}

// --- Progress Metrics ---

export interface ProgressMetrics {
  stateById: Map<string, ProgressStatus>;
  readinessById: Map<string, number>;
  satisfiedById: Map<string, number>;
  totalById: Map<string, number>;
  readyNowIds: string[];
  counts: Record<ProgressStatus | 'readyNow', number>;
}

// --- Graph Styling ---

export interface StyleOptions {
  edgeTypeByKey: Map<string, 'required' | 'or'>;
  progressMode: boolean;
  progressStateById: Map<string, ProgressStatus>;
  readinessById: Map<string, number>;
  satisfiedById: Map<string, number>;
  totalById: Map<string, number>;
  suppressedNodeIds: Set<string>;
}

// --- Storage Types ---

export interface SavedPosition {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export type SavedPositions = Record<string, SavedPosition>;

export interface StudentState {
  skillGraphPositions: SavedPositions | null;
  skillChecklistState: unknown;
  sidebarDropdownState: Record<string, boolean> | null;
  skillSortState: string | null;
  skillGraphViewSettings: Partial<Settings> | null;
  skillGraphProgressState: ProgressState | null;
}
