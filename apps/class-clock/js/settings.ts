/** js/settings.js */
import { Clock } from './clock.ts';
import { Utils, getCurrentOffsetTime } from './utils.ts';
import {
    normalizeVisualizationMode,
    isStageVisualizationMode as isStageMode,
    isProgressVisualizationMode,
    isLegacyFillMode,
    hasTimelineVisualization
} from './visualizationModes.ts';

const SCALE_UNIT_VERSION = 4;
const LEGACY_REFERENCE_VIEWPORT_HEIGHT = 1080;
const LEGACY_DEFAULT_TIMELINE_HEIGHT = 150;

function roundScaleValue(value: number) {
    return Math.round(value);
}

function roundDetailSizeValue(value: number) {
    return Math.round(value * 2) / 2;
}

function pxToViewportHeightPercent(value: number) {
    return roundScaleValue((value / LEGACY_REFERENCE_VIEWPORT_HEIGHT) * 100);
}

function pxToTimelineHeightPercent(value: number, timelineHeightPx: number) {
    const safeTimelineHeight = Math.max(1, timelineHeightPx || LEGACY_DEFAULT_TIMELINE_HEIGHT);
    return roundScaleValue((value / safeTimelineHeight) * 100);
}

function timelineHeightPercentToPx(value: number, timelineHeightPercent: number) {
    const safeTimelinePercent = Math.max(8, Math.min(42, timelineHeightPercent || 14));
    const desiredHeight = (safeTimelinePercent / 100) * LEGACY_REFERENCE_VIEWPORT_HEIGHT;
    const timelineHeightPx = Math.max(80, Math.min(LEGACY_REFERENCE_VIEWPORT_HEIGHT * 0.42, desiredHeight));
    return roundDetailSizeValue((value / 100) * timelineHeightPx);
}

const DEFAULT_SYNC_TARGET_TIMES = ["08:50", "10:05", "10:15", "11:30", "12:20", "13:35", "13:45", "15:00"];
const DEFAULT_SYNC_TARGETS = [
    { id: 'school-1', label: 'School 1' },
    { id: 'school-2', label: 'School 2' }
];

function normalizeTimeOffset(value: any) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeSyncTargets(value: any, legacyOffsetMs = 0) {
    const fallbackOffsetMs = normalizeTimeOffset(legacyOffsetMs);
    const sourceTargets = Array.isArray(value) && value.length > 0
        ? value
        : DEFAULT_SYNC_TARGETS.map(target => ({ ...target, times: DEFAULT_SYNC_TARGET_TIMES, offsetMs: fallbackOffsetMs }));
    const targets = sourceTargets.slice(0, 2);
    while (targets.length < 2) {
        const nextIndex = targets.length;
        targets.push({
            id: DEFAULT_SYNC_TARGETS[nextIndex].id,
            label: DEFAULT_SYNC_TARGETS[nextIndex].label,
            times: DEFAULT_SYNC_TARGET_TIMES,
            offsetMs: fallbackOffsetMs
        });
    }

    return targets.map((target, index) => {
        const fallbackId = DEFAULT_SYNC_TARGETS[index].id;
        const fallbackLabel = DEFAULT_SYNC_TARGETS[index].label;
        const times = Array.isArray(target?.times)
            ? target.times.filter(time => typeof time === 'string' && /^\d{2}:\d{2}$/.test(time))
            : [];
        const label = typeof target?.label === 'string' && target.label.trim()
            ? target.label.trim()
            : fallbackLabel;

        return {
            id: typeof target?.id === 'string' && target.id ? target.id : fallbackId,
            label: label === 'School A' ? 'School 1' : label === 'School B' ? 'School 2' : label,
            times: times.length > 0 ? Array.from(new Set(times)) : [...DEFAULT_SYNC_TARGET_TIMES],
            offsetMs: Object.prototype.hasOwnProperty.call(target || {}, 'offsetMs')
                ? normalizeTimeOffset(target.offsetMs)
                : fallbackOffsetMs
        };
    });
}

function normalizeActiveSyncTargetId(value: any, targets: any[]) {
    const fallbackId = targets?.[0]?.id || DEFAULT_SYNC_TARGETS[0].id;
    return targets.some(target => target?.id === value) ? value : fallbackId;
}

export const Settings = {
    schedule: [ // Default schedule
        { label: "Before", start: "00:00", end: "08:50", colourSchemeId: 1, showCircles: false },
        { label: "Period 1", start: "08:50", end: "10:05", colourSchemeId: 1, showCircles: true },
        { label: "Break", start: "10:05", end: "10:15", colourSchemeId: 2, showCircles: false },
        { label: "Period 2", start: "10:15", end: "11:30", colourSchemeId: 1, showCircles: true },
        { label: "Lunch", start: "11:30", end: "12:20", colourSchemeId: 2, showCircles: false },
        { label: "Period 3", start: "12:20", end: "13:35", colourSchemeId: 1, showCircles: true },
        { label: "Break", start: "13:35", end: "13:45", colourSchemeId: 2, showCircles: false },
        { label: "Period 4", start: "13:45", end: "15:00", colourSchemeId: 1, showCircles: true },
        { label: "After", start: "15:00", end: "23:59", colourSchemeId: 1, showCircles: false }
    ],
    preferences: {}, // Populated by load()
    alerts: {},      // Populated by load()

    defaultPreferences: {
        scaleUnitVersion: SCALE_UNIT_VERSION,
        fontFamily: "Atkinson Hyperlegible Next",
        dateFontSize: 6,
        timeFontSize: 19,
        scheduleLabelFontSize: 4,
        timeOffsetMs: 0,
        showDate: true,
        showTime: true,
        showScheduleLabel: true,
        visualizationMode: 'progress',
        showProgressBar: true,
        showScheduleCircles: false,
        showSandBars: false,
        showWaterFill: false,
        activeSyncTargetId: DEFAULT_SYNC_TARGETS[0].id,
        syncTargets: normalizeSyncTargets(null),
        // --- Physics Fill Preferences ---
        sandWidth: 80, // percentage of the clock display width
        sandHeight: 14, // percentage of viewport height
        // sandDropInterval: 1000, // REMOVED
        sandParticleSize: 5, // pixels (radius)
        // -----------------------------
        colourSchemes: [
            { id: 1, name: "Default Dark", background: "#000000", text: "#FFFFFF" },
            { id: 2, name: "Default Light", background: "#F0F0F0", text: "#000000" }
        ],
        defaultAlertSettings: {
            colour: {
                enabled: false, background: "#ff0000", text: "#ffffff",
                durationMs: 1500, intervalMs: 500
            }
        }
    },

    normalizeScheduleContinuity: function() {
        if (!Array.isArray(Settings.schedule) || Settings.schedule.length === 0) return;

        for (let i = 0; i < Settings.schedule.length - 1; i++) {
            const current = Settings.schedule[i];
            const next = Settings.schedule[i + 1];
            if (!current || !next) continue;
            if (typeof next.start === 'string' && next.start.length > 0) {
                current.end = next.start;
            } else if (typeof current.end !== 'string' || current.end.length === 0) {
                current.end = "00:00";
            }
        }

        const lastIndex = Settings.schedule.length - 1;
        const last = Settings.schedule[lastIndex];
        if (last && (typeof last.end !== 'string' || last.end.length === 0)) {
            last.end = "23:59";
        }
    },

    inferVisualizationMode: function(preferences = Settings.preferences) {
        if (preferences && typeof preferences.visualizationMode === 'string') {
            const normalizedMode = normalizeVisualizationMode(preferences.visualizationMode);
            if (
                preferences.visualizationMode === normalizedMode
                || preferences.visualizationMode === 'none'
                || ['ice', 'plant', 'bubbles', 'fractal'].includes(preferences.visualizationMode)
            ) {
                return normalizedMode;
            }
        }

        if (preferences?.showSandBars) return 'sand';
        if (preferences?.showWaterFill) return 'water';
        if (preferences?.showProgressBar) return 'progress';
        return 'none';
    },

    applyVisualizationModePreferences: function(preferences = Settings.preferences) {
        if (!preferences) return 'progress';

        const mode = Settings.inferVisualizationMode(preferences);
        preferences.visualizationMode = mode;
        preferences.showProgressBar = mode === 'progress';
        preferences.showSandBars = mode === 'sand';
        preferences.showWaterFill = mode === 'water';
        return mode;
    },

    getVisualizationMode: function(preferences = Settings.preferences) {
        return Settings.applyVisualizationModePreferences(preferences);
    },

    isProgressBarMode: function(preferences = Settings.preferences) {
        return isProgressVisualizationMode(Settings.getVisualizationMode(preferences));
    },

    isStageVisualizationMode: function(preferences = Settings.preferences) {
        return isStageMode(Settings.getVisualizationMode(preferences));
    },

    usesLegacyFillVisualization: function(preferences = Settings.preferences) {
        return isLegacyFillMode(Settings.getVisualizationMode(preferences));
    },

    hasTimelineVisualization: function(preferences = Settings.preferences) {
        return hasTimelineVisualization(Settings.getVisualizationMode(preferences));
    },

    getViewportHeightPx: function() {
        return Math.max(window.visualViewport?.height || window.innerHeight || 0, 480);
    },

    getTimelineHeightPx: function() {
        const viewportHeight = Settings.getViewportHeightPx();
        const preferredHeightPercent = Number(Settings.preferences?.sandHeight) || Settings.defaultPreferences.sandHeight;
        const desiredHeight = (preferredHeightPercent / 100) * viewportHeight;
        return Math.max(80, Math.min(viewportHeight * 0.42, desiredHeight));
    },

    getAnimationDetailSizePx: function(referenceHeight?: number) {
        const detailSizePx = Number(Settings.preferences?.sandParticleSize) || Settings.defaultPreferences.sandParticleSize;
        return Math.max(1, Math.min(20, detailSizePx));
    },

    getSyncTargets: function(preferences = Settings.preferences) {
        if (!preferences) return normalizeSyncTargets(null);
        preferences.syncTargets = normalizeSyncTargets(preferences.syncTargets, preferences.timeOffsetMs);
        preferences.activeSyncTargetId = normalizeActiveSyncTargetId(preferences.activeSyncTargetId, preferences.syncTargets);
        return preferences.syncTargets;
    },

    getActiveSyncTarget: function(preferences = Settings.preferences) {
        const targets = Settings.getSyncTargets(preferences);
        const activeId = normalizeActiveSyncTargetId(preferences?.activeSyncTargetId, targets);
        if (preferences) preferences.activeSyncTargetId = activeId;
        return targets.find(target => target.id === activeId) || targets[0] || null;
    },

    getActiveTimeOffsetMs: function(preferences = Settings.preferences) {
        return normalizeTimeOffset(Settings.getActiveSyncTarget(preferences)?.offsetMs);
    },

    setActiveSyncTargetId: function(targetId: string) {
        const targets = Settings.getSyncTargets();
        Settings.preferences.activeSyncTargetId = normalizeActiveSyncTargetId(targetId, targets);
        Settings.preferences.timeOffsetMs = Settings.getActiveTimeOffsetMs();
    },

    setSyncTargetOffsetMs: function(targetId: string, offsetMs: number) {
        const targets = Settings.getSyncTargets();
        const target = targets.find(syncTarget => syncTarget.id === targetId) || Settings.getActiveSyncTarget();
        if (!target) return null;
        target.offsetMs = normalizeTimeOffset(offsetMs);
        if (target.id === Settings.preferences.activeSyncTargetId) {
            Settings.preferences.timeOffsetMs = target.offsetMs;
        }
        return target;
    },

    load: function() {
        Settings.preferences = JSON.parse(JSON.stringify(Settings.defaultPreferences));
        const defaultScheduleCopy = JSON.parse(JSON.stringify(Settings.schedule));
        Settings.alerts = {};

        // --- Load Schedule ---
        const savedSchedule = localStorage.getItem("clockSchedule");
        let scheduleLoaded = false;
        if (savedSchedule) {
            try {
                const parsedSchedule = JSON.parse(savedSchedule);
                if (Array.isArray(parsedSchedule) && parsedSchedule.length > 0) {
                    Settings.schedule = parsedSchedule.map(item => ({
                        label: item.label || "Unnamed", start: item.start || "00:00", end: item.end || "00:00",
                        colourSchemeId: item.colourSchemeId || 1,
                        showCircles: typeof item.showCircles === 'boolean' ? item.showCircles : false
                    }));
                    scheduleLoaded = true;
                }
            } catch (e) { console.error("Error parsing saved schedule.", e); }
        }
        if (!scheduleLoaded) { Settings.schedule = defaultScheduleCopy; }
        Settings.normalizeScheduleContinuity();

        // --- Load Preferences ---
        const savedPrefs = localStorage.getItem("clockPreferences");
        if (savedPrefs) {
            try {
                const loadedPreferences = JSON.parse(savedPrefs);
                if (typeof loadedPreferences === 'object' && loadedPreferences !== null) {
                    const legacyTimelineHeightPx = Number(loadedPreferences.sandHeight)
                        || Number(loadedPreferences.progressBarHeight)
                        || LEGACY_DEFAULT_TIMELINE_HEIGHT;
                    const tempPrefs = {
                        ...JSON.parse(JSON.stringify(Settings.defaultPreferences)),
                        ...loadedPreferences,
                        defaultAlertSettings: { colour: { ...Settings.defaultPreferences.defaultAlertSettings.colour, ...(loadedPreferences.defaultAlertSettings?.colour || {}) }},
                        colourSchemes: (loadedPreferences.colourSchemes && Array.isArray(loadedPreferences.colourSchemes) && loadedPreferences.colourSchemes.length > 0)
                          ? loadedPreferences.colourSchemes.map(s => ({ id: s.id || Date.now() + Math.random(), name: s.name || "Unnamed Scheme", background: s.background || "#000000", text: s.text || "#FFFFFF" }))
                          : Settings.defaultPreferences.colourSchemes
                    };
                    const loadedScaleUnitVersion = Number(loadedPreferences.scaleUnitVersion) || 0;
                    if (loadedScaleUnitVersion < 3) {
                        if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'dateFontSize')) {
                            tempPrefs.dateFontSize = pxToViewportHeightPercent(Number(loadedPreferences.dateFontSize) || 64);
                        }
                        if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'timeFontSize')) {
                            tempPrefs.timeFontSize = pxToViewportHeightPercent(Number(loadedPreferences.timeFontSize) || 200);
                        }
                        if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'scheduleLabelFontSize')) {
                            tempPrefs.scheduleLabelFontSize = pxToViewportHeightPercent(Number(loadedPreferences.scheduleLabelFontSize) || 48);
                        }
                        if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'sandHeight')) {
                            tempPrefs.sandHeight = pxToViewportHeightPercent(Number(loadedPreferences.sandHeight) || LEGACY_DEFAULT_TIMELINE_HEIGHT);
                        } else if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'progressBarHeight')) {
                            tempPrefs.sandHeight = pxToViewportHeightPercent(Number(loadedPreferences.progressBarHeight) || LEGACY_DEFAULT_TIMELINE_HEIGHT);
                        }
                        if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'sandParticleSize')) {
                            tempPrefs.sandParticleSize = Number(loadedPreferences.sandParticleSize) || Settings.defaultPreferences.sandParticleSize;
                        } else if (Object.prototype.hasOwnProperty.call(loadedPreferences, 'timeLeftFontSize')) {
                            tempPrefs.sandParticleSize = (Number(loadedPreferences.timeLeftFontSize) || 40) / 8;
                        }
                    }
                    if (loadedScaleUnitVersion >= 3 && loadedScaleUnitVersion < SCALE_UNIT_VERSION) {
                        tempPrefs.sandParticleSize = timelineHeightPercentToPx(
                            Number(loadedPreferences.sandParticleSize) || Settings.defaultPreferences.sandParticleSize,
                            Number(tempPrefs.sandHeight) || Settings.defaultPreferences.sandHeight
                        );
                    }
                    // Type checking booleans
                    for (const key of ['showDate', 'showTime', 'showScheduleLabel', 'showProgressBar', 'showScheduleCircles', 'showSandBars', 'showWaterFill']) {
                         if (typeof tempPrefs[key] !== 'boolean') { tempPrefs[key] = Settings.defaultPreferences[key]; }
                    }
                    // Type checking numbers (excluding removed interval)
                    for (const key of ['dateFontSize', 'timeFontSize', 'scheduleLabelFontSize', 'sandWidth', 'sandHeight']) {
                        tempPrefs[key] = roundScaleValue(Number(tempPrefs[key]) || Settings.defaultPreferences[key]);
                    }
                    tempPrefs.sandParticleSize = roundDetailSizeValue(Number(tempPrefs.sandParticleSize) || Settings.defaultPreferences.sandParticleSize);
                    if (typeof tempPrefs.visualizationMode !== 'string') {
                        tempPrefs.visualizationMode = Settings.defaultPreferences.visualizationMode;
                    }
                    tempPrefs.timeOffsetMs = normalizeTimeOffset(tempPrefs.timeOffsetMs);
                    tempPrefs.syncTargets = normalizeSyncTargets(tempPrefs.syncTargets, tempPrefs.timeOffsetMs);
                    tempPrefs.activeSyncTargetId = normalizeActiveSyncTargetId(tempPrefs.activeSyncTargetId, tempPrefs.syncTargets);
                    tempPrefs.timeOffsetMs = Settings.getActiveTimeOffsetMs(tempPrefs);

                    tempPrefs.fontFamily = Settings.defaultPreferences.fontFamily;

                    tempPrefs.visualizationMode = Settings.inferVisualizationMode(tempPrefs);
                    Settings.applyVisualizationModePreferences(tempPrefs);
                    tempPrefs.scaleUnitVersion = SCALE_UNIT_VERSION;
                    tempPrefs.dateFontSize = Math.max(1, Math.min(14, tempPrefs.dateFontSize));
                    tempPrefs.timeFontSize = Math.max(5, Math.min(36, tempPrefs.timeFontSize));
                    tempPrefs.scheduleLabelFontSize = Math.max(1, Math.min(10, tempPrefs.scheduleLabelFontSize));
                    tempPrefs.sandWidth = Math.max(20, Math.min(100, tempPrefs.sandWidth));
                    tempPrefs.sandHeight = Math.max(8, Math.min(42, tempPrefs.sandHeight));
                    tempPrefs.sandParticleSize = Math.max(1, Math.min(20, tempPrefs.sandParticleSize));
                    delete tempPrefs.progressBarHeight;
                    delete tempPrefs.timeLeftFontSize;

                    Settings.preferences = tempPrefs;
                }
            } catch (e) { console.error("Error parsing saved preferences.", e); }
        }

        // --- Load Alerts ---
        const savedAlerts = localStorage.getItem("clockAlerts");
        if (savedAlerts) {
            try {
                const parsedAlerts = JSON.parse(savedAlerts);
                if (typeof parsedAlerts === 'object' && parsedAlerts !== null) {
                    Settings.alerts = parsedAlerts;
                    Object.keys(Settings.alerts).forEach(key => {
                        if (Settings.alerts[key]?.noise) delete Settings.alerts[key].noise;
                        if (Settings.alerts[key] && typeof Settings.alerts[key] === 'object' && Object.keys(Settings.alerts[key]).length === 0) {
                            delete Settings.alerts[key];
                        }
                    });
                }
            } catch (e) { console.error("Error parsing saved alerts settings.", e); }
        }
    },

    save: function() {
        try {
             Settings.normalizeScheduleContinuity();
             Settings.applyVisualizationModePreferences(Settings.preferences);
             Settings.preferences.syncTargets = normalizeSyncTargets(Settings.preferences.syncTargets, Settings.preferences.timeOffsetMs);
             Settings.preferences.activeSyncTargetId = normalizeActiveSyncTargetId(Settings.preferences.activeSyncTargetId, Settings.preferences.syncTargets);
             Settings.preferences.timeOffsetMs = Settings.getActiveTimeOffsetMs();
             Settings.preferences.scaleUnitVersion = SCALE_UNIT_VERSION;
             // Make sure to remove the sandDropInterval if it somehow exists before saving
             if (Settings.preferences.hasOwnProperty('sandDropInterval')) {
                 delete Settings.preferences.sandDropInterval;
             }
             if (Settings.preferences.hasOwnProperty('progressBarHeight')) {
                 delete Settings.preferences.progressBarHeight;
             }
             if (Settings.preferences.hasOwnProperty('timeLeftFontSize')) {
                 delete Settings.preferences.timeLeftFontSize;
             }
            const alertsToSave = {};
            Object.keys(Settings.alerts).forEach(key => {
                if (Settings.alerts[key] && typeof Settings.alerts[key] === 'object' && Object.keys(Settings.alerts[key]).length > 0) {
                    alertsToSave[key] = Settings.alerts[key];
                }
            });
            const scheduleToSave = Settings.schedule.map(item => ({
                label: item.label, start: item.start, end: item.end,
                colourSchemeId: item.colourSchemeId, showCircles: item.showCircles
            }));
            localStorage.setItem("clockSchedule", JSON.stringify(scheduleToSave));
            localStorage.setItem("clockPreferences", JSON.stringify(Settings.preferences));
            localStorage.setItem("clockAlerts", JSON.stringify(alertsToSave));
        } catch (e) { console.error("Error saving settings:", e); }
    },

    getActiveColourScheme: function() {
        const now = getCurrentOffsetTime();
        // Ensure Clock module is defined before calling its method
        const currentPeriod = typeof Clock !== 'undefined' ? Clock.getCurrentPeriodInfo(now) : null;
        let schemeId = 1;
        if (currentPeriod && currentPeriod.index !== undefined && Settings.schedule[currentPeriod.index]) {
            const scheduleItem = Settings.schedule[currentPeriod.index];
            if (scheduleItem.colourSchemeId) { schemeId = scheduleItem.colourSchemeId; }
        }
        const schemes = Settings.preferences?.colourSchemes || Settings.defaultPreferences.colourSchemes;
        let foundScheme = schemes.find(s => s.id === schemeId);
        if (!foundScheme) foundScheme = schemes.find(s => s.id === 1);
        if (!foundScheme) foundScheme = schemes[0];
        return foundScheme || { id: 0, name: "Error", background: "#ff00ff", text: "#000000" };
    }
};
