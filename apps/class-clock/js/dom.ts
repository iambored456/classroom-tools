type DOMCache = Record<string, any>;

function queryElements(): DOMCache {
    return {
        clockDisplayArea: document.getElementById("clock-display-area"),
        timeEl: document.getElementById("time"),
        dateEl: document.getElementById("date"),
        scheduleCirclesDisplayEl: document.getElementById("schedule-circles-display"),
        periodContainerEl: document.getElementById("period-container"),
        periodLabelEl: document.getElementById("period-label"),
        progressBarEl: document.getElementById("progress-bar"),
        progressEl: document.getElementById("progress"),
        timeLeftEl: document.getElementById("time-left"),
        sandBarsContainerEl: document.getElementById("sand-bars-container"),
        sandBarOutlineEls: Array.from(document.querySelectorAll('#sand-bars-container .sand-bar-outline-segment')),
        sandBarsCanvas: document.getElementById('sand-bars-canvas'), // Canvas for sand physics
        waterFillContainerEl: document.getElementById("water-fill-container"),
        waterFillOutlineEls: Array.from(document.querySelectorAll('#water-fill-container .water-fill-outline-segment')),
        waterFillCanvas: document.getElementById('water-fill-canvas'), // Canvas for fluid water bars
        stageVisualizationContainerEl: document.getElementById("stage-visualization-container"),
        stageVisualizationOutlineEls: Array.from(document.querySelectorAll('#stage-visualization-container .stage-visualization-outline-segment')),
        stageVisualizationCanvas: document.getElementById('stage-visualization-canvas'),
        alertModal: document.getElementById('alert-modal'),
        alertModalTitle: document.getElementById('modal-title'),
        alertModalBody: document.getElementById('modal-body'),
        closeModalBtn: document.querySelector('#alert-modal .close-modal-btn'),
        menuToggle: document.getElementById("menu-toggle"),
        settingsMenu: document.getElementById("settings-menu"),
        menuResizer: document.getElementById("menu-resizer"),
        settingsNav: document.getElementById("settings-nav"),
        navHomeButton: document.getElementById("nav-home-button"),
        navFullscreenButton: document.getElementById("nav-fullscreen-button"),
        tabsContainer: document.getElementById("tabs"),
        tabContentsContainer: document.getElementById("tab-contents"),
        appearanceTab: document.getElementById("appearance-tab"),
        scheduleAlertsTab: document.getElementById("schedule-alerts-tab"),
        displayElementsChecklist: document.getElementById("display-elements-checklist"),
        visualizationModeInputs: Array.from(document.querySelectorAll('input[name="visualization-mode"]')),
        resetTimelineVisualizationBtn: document.getElementById('reset-timeline-visualization-defaults'),
        resetSchemesBtn: document.getElementById('reset-schemes-defaults'),
        colorSchemeTabsContainer: document.getElementById("colour-scheme-tabs"),
        colorSchemeContentContainer: document.getElementById("colour-scheme-content"),
        classScheduleTitleEl: document.getElementById("class-schedule-title"),
        scheduleTableWrapEl: document.querySelector(".schedule-table-wrap"),
        scheduleTableEl: document.getElementById("schedule-table"),
        scheduleTableBody: document.querySelector("#schedule-table tbody"),
        addScheduleRowBtn: document.getElementById("add-schedule-row"),
        deleteScheduleRowBtn: document.getElementById("delete-schedule-row"),
        timeSyncSection: document.getElementById("time-sync-section"),
        syncTargetsContainer: document.getElementById("sync-targets"),
    };
}

export let DOM: DOMCache = {};

export function updateDOMCache(): void {
    DOM = queryElements();
}
