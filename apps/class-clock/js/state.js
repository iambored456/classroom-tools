/** js/state.js */

export const State = {
    currentPeriodLabel: null,
    currentPeriodIndex: null,
    activeVisualAlertInterval: null,
    activeVisualAlertTimeout: null,
    originalBodyStyles: {},
    selectedScheduleRowIndex: null,
    isResizingMenu: false,
    dragStartIndex: null,
    // --- Common State ---
    SAND_COLORS: ["#fba1bd", "#dfb37a", "#8aca91", "#54cce2", "#b6b6fd"],
    // --- Physics Sand Bar State ---
    physicsCheckIntervalId: null,      // Interval for *checking* if particles need adding
    physicsCheckIntervalMs: 100,       // Check more frequently (e.g., 10 times a second)
    physicsParticlesAdded: 0,          // Counter for particles successfully added
    visualMaxParticlesPerSegment: 0,   // Estimated max particles per segment for current size
    totalParticlesForPeriod: 0,        // Total particles calculated for the current period duration
};
