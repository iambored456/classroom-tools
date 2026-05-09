import { Settings } from './settings.ts';
import { DOM } from './dom.ts';
import { Clock } from './clock.ts';
import { getCurrentOffsetTime } from './utils.ts';
import { State } from './state.ts';
import { measureFillLayout } from './fillLayout.ts';

type PhysicsModule = typeof import('./physics.ts');
type WaterBarsModule = typeof import('./waterBars.ts');
type StageVisualizationModule = typeof import('./stageVisualization.ts');

let physicsModulePromise: Promise<PhysicsModule> | null = null;
let waterBarsModulePromise: Promise<WaterBarsModule> | null = null;
let stageVisualizationModulePromise: Promise<StageVisualizationModule> | null = null;

let loadedPhysicsModule: PhysicsModule | null = null;
let loadedWaterBarsModule: WaterBarsModule | null = null;
let loadedStageVisualizationModule: StageVisualizationModule | null = null;

function loadPhysicsModule() {
    if (!physicsModulePromise) {
        physicsModulePromise = import('./physics.ts').then(
            module => {
                loadedPhysicsModule = module;
                return module;
            },
            error => {
                physicsModulePromise = null;
                throw error;
            }
        );
    }
    return physicsModulePromise;
}

function loadWaterBarsModule() {
    if (!waterBarsModulePromise) {
        waterBarsModulePromise = import('./waterBars.ts').then(
            module => {
                loadedWaterBarsModule = module;
                return module;
            },
            error => {
                waterBarsModulePromise = null;
                throw error;
            }
        );
    }
    return waterBarsModulePromise;
}

function loadStageVisualizationModule() {
    if (!stageVisualizationModulePromise) {
        stageVisualizationModulePromise = import('./stageVisualization.ts').then(
            module => {
                loadedStageVisualizationModule = module;
                return module;
            },
            error => {
                stageVisualizationModulePromise = null;
                throw error;
            }
        );
    }
    return stageVisualizationModulePromise;
}

function getPhysics() {
    return loadedPhysicsModule?.Physics ?? null;
}

function getWaterBars() {
    return loadedWaterBarsModule?.WaterBars ?? null;
}

function getStageVisualization() {
    return loadedStageVisualizationModule?.StageVisualization ?? null;
}

function nextFrame() {
    return new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
    });
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getEmptyTimelineState() {
    return {
        active: false,
        overallProgress: 0,
        bars: Array.from({ length: State.SAND_COLORS.length }, (_, index) => ({
            index,
            status: 'future',
            progress: 0
        }))
    };
}

export const Visuals = {
    visualSetupRequestId: 0,

    getScheduleCirclePeriods: function() {
        return (Settings.schedule || [])
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter(item => item.showCircles);
    },

    hasRenderableScheduleCircles: function() {
        return !!Settings.preferences.showScheduleCircles && Visuals.getScheduleCirclePeriods().length > 0;
    },

    updateScheduleCirclesVisibility: function(circlePeriods = null) {
        if (!DOM.scheduleCirclesDisplayEl) return false;

        const periods = Array.isArray(circlePeriods) ? circlePeriods : Visuals.getScheduleCirclePeriods();
        const shouldShow = !!Settings.preferences.showScheduleCircles && periods.length > 0;
        DOM.scheduleCirclesDisplayEl.hidden = !shouldShow;
        if (!shouldShow) {
            DOM.scheduleCirclesDisplayEl.innerHTML = '';
        }
        return shouldShow;
    },

    update: function(_now?: Date) {
        if (Visuals.hasRenderableScheduleCircles()) {
            Visuals.renderScheduleCircles();
        } else if (DOM.scheduleCirclesDisplayEl) {
            Visuals.updateScheduleCirclesVisibility([]);
            DOM.scheduleCirclesDisplayEl.innerHTML = '';
        }
    },

    renderScheduleCircles: function() {
       if (!DOM.scheduleCirclesDisplayEl) {
           return;
       }
       const now = getCurrentOffsetTime();
       const currentPeriodInfo = Clock.getCurrentPeriodInfo(now);
       const activeScheme = Settings.getActiveColourScheme();
       const circlePeriods = Visuals.getScheduleCirclePeriods();
       if (!Visuals.updateScheduleCirclesVisibility(circlePeriods)) {
           return;
       }
       let currentCircleIndex = -1;
       if (currentPeriodInfo) {
           currentCircleIndex = circlePeriods.findIndex(period => period.originalIndex === currentPeriodInfo.index);
       }
       DOM.scheduleCirclesDisplayEl.innerHTML = circlePeriods.map((period, index) => {
           const isActive = currentCircleIndex >= index;
           const symbol = isActive ? '\u25CF' : '\u25CB';
           const cssClass = `schedule-circle-symbol ${isActive ? 'active' : 'inactive'}`;
           const color = isActive ? activeScheme.text : '#555';
           return `<span class="${cssClass}" style="color: ${color};">${symbol}</span>`;
       }).join('');
    },

    getSandFillLayout: function() {
        return measureFillLayout(DOM.sandBarsContainerEl, DOM.sandBarOutlineEls, State.SAND_COLORS.length);
    },

    getWaterFillLayout: function() {
        return measureFillLayout(DOM.waterFillContainerEl, DOM.waterFillOutlineEls, State.SAND_COLORS.length);
    },

    getStageFillLayout: function() {
        return measureFillLayout(DOM.stageVisualizationContainerEl, DOM.stageVisualizationOutlineEls, State.SAND_COLORS.length);
    },

    getStageCanvasBleedTop: function(layout) {
        if (Settings.getVisualizationMode() !== 'candle') return 0;
        const referenceHeight = Math.max(1, Number(layout?.height) || 0);
        return Math.round(Math.max(220, Math.min(560, referenceHeight * 2.7)));
    },

    getTimelineProgressState: function(now = getCurrentOffsetTime(), periodInfo = undefined) {
        const activePeriod = periodInfo === undefined ? Clock.getCurrentPeriodInfo(now) : periodInfo;
        if (!activePeriod) return getEmptyTimelineState();

        const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
        if (periodDurationMs <= 0) return getEmptyTimelineState();

        const overallProgress = clamp((now.getTime() - activePeriod.start.getTime()) / periodDurationMs, 0, 0.999999);
        const bars = Array.from({ length: State.SAND_COLORS.length }, (_, index) => {
            const stageStart = index / State.SAND_COLORS.length;
            const stageEnd = (index + 1) / State.SAND_COLORS.length;

            if (overallProgress >= stageEnd) {
                return { index, status: 'completed', progress: 1 };
            }
            if (overallProgress < stageStart) {
                return { index, status: 'future', progress: 0 };
            }

            return {
                index,
                status: 'current',
                progress: clamp((overallProgress - stageStart) * State.SAND_COLORS.length, 0, 1)
            };
        });

        return {
            active: true,
            overallProgress,
            bars
        };
    },

    getTimelineTargetUnits: function(unitsPerBar, periodInfo = undefined, now = getCurrentOffsetTime()) {
        const safeUnitsPerBar = Math.max(1, Math.floor(Number(unitsPerBar) || 0));
        const timelineState = Visuals.getTimelineProgressState(now, periodInfo);
        const targetUnits = timelineState.bars.map(barState => {
            if (barState.status === 'completed') return safeUnitsPerBar;
            if (barState.status === 'future' || barState.progress <= 0) return 0;
            if (safeUnitsPerBar === 1) return 1;

            const partialUnits = Math.floor(barState.progress * safeUnitsPerBar);
            return clamp(partialUnits, 1, safeUnitsPerBar - 1);
        });

        return {
            timelineState,
            targetUnits
        };
    },

    getStageProgressState: function() {
        return Visuals.getTimelineProgressState();
    },

    calculateSandMetrics: function(containerWidth, containerHeight) {
        const particleRadius = Settings.getAnimationDetailSizePx(containerHeight);
        const particleArea = (3 * Math.sqrt(3) / 2) * particleRadius * particleRadius;
        const segmentWidth = containerWidth / State.SAND_COLORS.length;
        const wallThickness = 15;
        const usableSegmentWidth = Math.max(0, segmentWidth - wallThickness - (particleRadius * 0.25));
        const usableSegmentHeight = Math.max(0, containerHeight - (particleRadius * 0.2));
        const packingDensity = 0.82;
        const capacityPerSegment = Math.max(10, Math.floor((usableSegmentWidth * usableSegmentHeight * packingDensity) / particleArea));
        const particlesPerRow = Math.max(1, Math.floor(usableSegmentWidth / Math.max(1, particleRadius * 1.8)));
        const visualTopOffParticles = Math.max(3, Math.ceil(particlesPerRow * 1.1));
        const visualTargetPerSegment = Math.max(
            capacityPerSegment + visualTopOffParticles,
            Math.ceil(capacityPerSegment * 1.12)
        );

        return {
            particleArea,
            capacityPerSegment,
            totalCapacity: capacityPerSegment * State.SAND_COLORS.length,
            visualTargetPerSegment,
            totalVisualTarget: visualTargetPerSegment * State.SAND_COLORS.length
        };
    },

    calculateWaterMetrics: function(layout) {
        const particleRadius = Math.max(2, Settings.getAnimationDetailSizePx(layout.height) * 0.75);
        const particleArea = Math.PI * particleRadius * particleRadius;
        const segmentWidths = layout.bars.map(bar => bar.width).filter(width => Number.isFinite(width) && width > 0);
        const segmentHeights = layout.bars.map(bar => bar.height).filter(height => Number.isFinite(height) && height > 0);
        const segmentWidth = segmentWidths.length > 0 ? Math.min(...segmentWidths) : Math.max(6, layout.width / State.SAND_COLORS.length);
        const usableHeight = segmentHeights.length > 0 ? Math.min(...segmentHeights) : Math.max(20, layout.height);
        const packingDensity = 0.7;
        const capacityPerBar = Math.max(30, Math.floor((segmentWidth * usableHeight * packingDensity) / particleArea));

        return {
            particleRadius,
            particleArea,
            capacityPerBar,
            totalCapacity: capacityPerBar * State.SAND_COLORS.length
        };
    },

    beginVisualSetup: function() {
        Visuals.visualSetupRequestId += 1;
        return Visuals.visualSetupRequestId;
    },

    isVisualSetupCurrent: function(requestId, expectedMode) {
        return Visuals.visualSetupRequestId === requestId && Settings.getVisualizationMode() === expectedMode;
    },

    syncWaterBarsToCurrentProgress: function(periodInfo = undefined, now = getCurrentOffsetTime()) {
        const WaterBars = getWaterBars();
        if (!WaterBars?.isInitialized) return;

        const { targetUnits } = Visuals.getTimelineTargetUnits(WaterBars.barCapacity, periodInfo, now);
        WaterBars.setFillUnits(targetUnits);
        State.physicsParticlesAdded = WaterBars.getTotalFillUnits();
    },

    syncSandBarsToCurrentProgress: async function(periodInfo = undefined, now = getCurrentOffsetTime(), maxToAddPerFrame = 180) {
        const Physics = getPhysics();
        if (!Physics?.isInitialized || Settings.getVisualizationMode() !== 'sand') return;

        const targetParticlesPerSegment = Math.floor(Number(State.visualTargetParticlesPerSegment || State.visualMaxParticlesPerSegment || 0));
        if (targetParticlesPerSegment <= 0) return;

        const { targetUnits } = Visuals.getTimelineTargetUnits(targetParticlesPerSegment, periodInfo, now);
        let countsBySegment = Physics.getDynamicBodyCountsBySegment();
        if (!Array.isArray(countsBySegment) || countsBySegment.length !== State.SAND_COLORS.length) {
            countsBySegment = Array.from({ length: State.SAND_COLORS.length }, () => 0);
        }

        const safeMaxToAddPerFrame = Math.max(20, Math.floor(Number(maxToAddPerFrame) || 0));
        State.physicsParticlesAdded = countsBySegment.reduce((sum, count) => sum + count, 0);

        while (Physics.isInitialized && Settings.getVisualizationMode() === 'sand') {
            const deficits = targetUnits.map((target, index) => Math.max(0, target - (countsBySegment[index] || 0)));
            const totalDeficit = deficits.reduce((sum, deficit) => sum + deficit, 0);
            if (totalDeficit <= 0) {
                State.physicsParticlesAdded = countsBySegment.reduce((sum, count) => sum + count, 0);
                return;
            }

            let addedThisFrame = 0;
            let madeProgress = false;

            // Round-robin across deficit bars so completed bars stay full while the active bar catches up too.
            while (addedThisFrame < safeMaxToAddPerFrame) {
                let addedInPass = false;

                for (let index = 0; index < deficits.length; index++) {
                    if (deficits[index] <= 0 || addedThisFrame >= safeMaxToAddPerFrame) continue;

                    const added = Physics.addParticle(index, State.SAND_COLORS[index]);
                    if (!added) continue;

                    countsBySegment[index] += 1;
                    deficits[index] -= 1;
                    addedThisFrame += 1;
                    addedInPass = true;
                    madeProgress = true;
                }

                if (!addedInPass) break;
            }

            State.physicsParticlesAdded = countsBySegment.reduce((sum, count) => sum + count, 0);
            if (!madeProgress) return;

            const stillBehind = targetUnits.some((target, index) => target > (countsBySegment[index] || 0));
            if (!stillBehind) return;

            await nextFrame();
        }
    },

    stopLegacyVisualizations: function() {
        const WaterBars = getWaterBars();
        const Physics = getPhysics();
        Visuals.stopPhysicsCheckInterval();
        WaterBars?.stop();
        WaterBars?.reset();
        Physics?.clearDynamicBodies();
        Physics?.stop();
    },

    stopStageVisualization: function() {
        getStageVisualization()?.stop();
    },

    setupPhysicsSandBars: async function(periodInfo) {
        const requestId = Visuals.beginVisualSetup();
        Visuals.stopStageVisualization();
        Visuals.stopPhysicsCheckInterval();
        getWaterBars()?.stop();
        getWaterBars()?.reset();
        getPhysics()?.clearDynamicBodies();
        State.physicsParticlesAdded = 0;
        State.visualTargetParticlesPerSegment = 0;
        State.totalParticlesForPeriod = 0;
        State.visualTargetParticlesForPeriod = 0;

        if (Settings.getVisualizationMode() !== 'sand' || !DOM.sandBarsCanvas || !DOM.sandBarsContainerEl) {
            getPhysics()?.stop();
            return;
        }

        try {
            const { Physics } = await loadPhysicsModule();
            if (!Visuals.isVisualSetupCurrent(requestId, 'sand')) {
                return;
            }

            await nextFrame();
            if (!Visuals.isVisualSetupCurrent(requestId, 'sand')) {
                return;
            }

            const layout = Visuals.getSandFillLayout();
            if (layout.width <= 0 || layout.height <= 0) {
                console.warn("Sand bars container has zero dimensions after rAF. Aborting physics setup.");
                Physics.stop();
                return;
            }

            const metrics = Visuals.calculateSandMetrics(layout.width, layout.height);
            State.visualMaxParticlesPerSegment = metrics.capacityPerSegment;
            State.visualTargetParticlesPerSegment = metrics.visualTargetPerSegment;
            State.totalParticlesForPeriod = metrics.totalCapacity;
            State.visualTargetParticlesForPeriod = metrics.totalVisualTarget;

            Physics.init(DOM.sandBarsCanvas, layout.width, layout.height, {
                mode: 'sand',
                segments: State.SAND_COLORS.length,
                measureLayout: Visuals.getSandFillLayout
            });
            Physics.start();
            Visuals.handleColorSchemeChange();

            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
            if (!activePeriod) {
                Physics.stop();
                return;
            }

            const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
            if (periodDurationMs > 0) {
                await Visuals.syncSandBarsToCurrentProgress(activePeriod);
                if (!Visuals.isVisualSetupCurrent(requestId, 'sand')) {
                    return;
                }
                Visuals.checkAndAddParticles();
                State.physicsCheckIntervalId = setInterval(Visuals.checkAndAddParticles, State.physicsCheckIntervalMs);
            } else {
                Physics.stop();
            }
        } catch (error) {
            console.error("Unable to initialize sand visualization.", error);
        }
    },

    setupPhysicsWaterFill: async function(periodInfo) {
        const requestId = Visuals.beginVisualSetup();
        Visuals.stopStageVisualization();
        Visuals.stopPhysicsCheckInterval();
        getPhysics()?.clearDynamicBodies();
        getPhysics()?.stop();
        State.physicsParticlesAdded = 0;
        State.visualTargetParticlesPerSegment = 0;
        State.totalParticlesForPeriod = 0;
        State.visualTargetParticlesForPeriod = 0;

        if (Settings.getVisualizationMode() !== 'water' || !DOM.waterFillCanvas || !DOM.waterFillContainerEl) {
            getWaterBars()?.stop();
            getWaterBars()?.reset();
            return;
        }

        try {
            const { WaterBars } = await loadWaterBarsModule();
            if (!Visuals.isVisualSetupCurrent(requestId, 'water')) {
                return;
            }

            await nextFrame();
            if (!Visuals.isVisualSetupCurrent(requestId, 'water')) {
                return;
            }

            const layout = Visuals.getWaterFillLayout();
            if (layout.width <= 0 || layout.height <= 0) {
                console.warn("Water fill container has zero dimensions after rAF. Aborting physics setup.");
                WaterBars.stop();
                return;
            }

            const metrics = Visuals.calculateWaterMetrics(layout);
            State.visualMaxParticlesPerSegment = metrics.capacityPerBar;
            State.totalParticlesForPeriod = metrics.totalCapacity;

            WaterBars.init(DOM.waterFillCanvas, layout.width, layout.height, {
                colors: State.SAND_COLORS,
                capacityPerBar: metrics.capacityPerBar,
                particleRadius: metrics.particleRadius,
                borderColor: Settings.getActiveColourScheme().text || '#FFFFFF',
                measureLayout: Visuals.getWaterFillLayout
            });
            WaterBars.setCapacity(metrics.capacityPerBar);
            WaterBars.setParticleRadius(metrics.particleRadius);
            WaterBars.reset();
            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
            Visuals.syncWaterBarsToCurrentProgress(activePeriod);
            WaterBars.start();
            Visuals.handleColorSchemeChange();
            if (!activePeriod) return;

            const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
            if (periodDurationMs > 0) {
                Visuals.checkAndAddWaterParticles();
                State.physicsCheckIntervalId = setInterval(Visuals.checkAndAddWaterParticles, State.physicsCheckIntervalMs);
            }
        } catch (error) {
            console.error("Unable to initialize water visualization.", error);
        }
    },

    setupStageVisualization: async function() {
        const requestId = Visuals.beginVisualSetup();
        Visuals.stopPhysicsCheckInterval();
        getWaterBars()?.stop();
        getWaterBars()?.reset();
        getPhysics()?.clearDynamicBodies();
        getPhysics()?.stop();

        const mode = Settings.getVisualizationMode();
        if (!Settings.isStageVisualizationMode() || !DOM.stageVisualizationCanvas || !DOM.stageVisualizationContainerEl) {
            getStageVisualization()?.stop();
            return;
        }

        try {
            const { StageVisualization } = await loadStageVisualizationModule();
            if (!Visuals.isVisualSetupCurrent(requestId, mode)) {
                return;
            }

            await nextFrame();
            if (!Visuals.isVisualSetupCurrent(requestId, mode)) {
                return;
            }

            const layout = Visuals.getStageFillLayout();
            if (layout.width <= 0 || layout.height <= 0) {
                console.warn("Stage visualization container has zero dimensions after rAF. Aborting stage setup.");
                StageVisualization.stop();
                return;
            }

            StageVisualization.init(DOM.stageVisualizationCanvas, layout.width, layout.height, {
                mode,
                measureLayout: Visuals.getStageFillLayout,
                getState: Visuals.getStageProgressState,
                bleedTop: Visuals.getStageCanvasBleedTop(layout)
            });
            StageVisualization.setMode(mode);
            StageVisualization.start();
            Visuals.handleColorSchemeChange();
        } catch (error) {
            console.error("Unable to initialize stage visualization.", error);
        }
    },

    isSandBarsNearTop: function() {
        const Physics = getPhysics();
        if (!Physics) return false;
        if (!Physics.isInitialized || !Physics.isRunning) return false;

        const segmentTopYs = Physics.getSegmentTopYs();
        if (!segmentTopYs || segmentTopYs.length !== State.SAND_COLORS.length) return false;

        const particleRadius = Settings.getAnimationDetailSizePx(Physics.render?.options?.height || 0);
        const nearTopThresholdY = Math.max(2, particleRadius * 1.2);
        return segmentTopYs.every(y => Number.isFinite(y) && y <= nearTopThresholdY);
    },

    isWaterNearTop: function() {
        return getWaterBars()?.isNearTop() ?? false;
    },

    checkAndAddParticles: function() {
        const Physics = getPhysics();
        if (!Physics) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }
        if (Settings.getVisualizationMode() !== 'sand' || !Physics.isRunning || State.totalParticlesForPeriod <= 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const now = getCurrentOffsetTime();
        const periodInfo = Clock.getCurrentPeriodInfo(now);
        if (!periodInfo) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        if ((periodInfo.end.getTime() - periodInfo.start.getTime()) <= 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const countsBySegment = Physics.getDynamicBodyCountsBySegment();
        if (!Array.isArray(countsBySegment) || countsBySegment.length !== State.SAND_COLORS.length) {
            return;
        }

        const currentParticleCount = countsBySegment.reduce((sum, count) => sum + count, 0);
        State.physicsParticlesAdded = currentParticleCount;

        if (Visuals.isSandBarsNearTop()) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const targetParticlesPerSegment = Math.floor(Number(State.visualTargetParticlesPerSegment || State.visualMaxParticlesPerSegment || 0));
        if (targetParticlesPerSegment <= 0) {
            return;
        }

        const { timelineState, targetUnits } = Visuals.getTimelineTargetUnits(targetParticlesPerSegment, periodInfo, now);
        const deficits = targetUnits.map((target, index) => Math.max(0, target - (countsBySegment[index] || 0)));
        const totalDeficit = deficits.reduce((sum, deficit) => sum + deficit, 0);
        if (totalDeficit <= 0) {
            if (timelineState.overallProgress >= 0.999 && Visuals.isSandBarsNearTop()) {
                Visuals.stopPhysicsCheckInterval();
            }
            return;
        }

        const maxToAddThisTick = Math.min(40, Math.max(8, totalDeficit));
        let addedThisTick = 0;

        while (addedThisTick < maxToAddThisTick) {
            let addedInPass = false;

            for (let index = 0; index < deficits.length; index++) {
                if (deficits[index] <= 0 || addedThisTick >= maxToAddThisTick) continue;

                const added = Physics.addParticle(index, State.SAND_COLORS[index]);
                if (!added) continue;

                deficits[index] -= 1;
                countsBySegment[index] += 1;
                addedThisTick += 1;
                addedInPass = true;
            }

            if (!addedInPass) break;
        }

        State.physicsParticlesAdded = countsBySegment.reduce((sum, count) => sum + count, 0);
        if (timelineState.overallProgress >= 0.999 && deficits.every(deficit => deficit <= 0) && Visuals.isSandBarsNearTop()) {
            Visuals.stopPhysicsCheckInterval();
        }
    },

    checkAndAddWaterParticles: function() {
        const WaterBars = getWaterBars();
        if (!WaterBars || Settings.getVisualizationMode() !== 'water' || !WaterBars.isRunning || State.totalParticlesForPeriod <= 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const now = getCurrentOffsetTime();
        const periodInfo = Clock.getCurrentPeriodInfo(now);
        if (!periodInfo) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        if ((periodInfo.end.getTime() - periodInfo.start.getTime()) <= 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const totalCapacity = Math.max(1, WaterBars.getTotalCapacity() || State.totalParticlesForPeriod);
        State.totalParticlesForPeriod = totalCapacity;

        const filledUnits = WaterBars.getTotalFillUnits();
        const pendingDrops = WaterBars.getPendingDropletCount();
        const producedUnits = filledUnits + pendingDrops;
        State.physicsParticlesAdded = producedUnits;

        if (Visuals.isWaterNearTop() && pendingDrops === 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const { timelineState, targetUnits } = Visuals.getTimelineTargetUnits(WaterBars.barCapacity, periodInfo, now);
        const projectedUnitsByBar = WaterBars.bars.map((bar, index) => {
            return clamp((bar.fillUnits || 0) + WaterBars.getPendingForBar(index), 0, WaterBars.barCapacity);
        });
        const deficits = targetUnits.map((target, index) => Math.max(0, target - (projectedUnitsByBar[index] || 0)));
        const totalDeficit = deficits.reduce((sum, deficit) => sum + deficit, 0);
        if (totalDeficit <= 0) {
            if (timelineState.overallProgress >= 0.999 && WaterBars.getPendingDropletCount() === 0 && Visuals.isWaterNearTop()) {
                Visuals.stopPhysicsCheckInterval();
            }
            return;
        }

        const maxToAddThisTick = Math.min(18, Math.max(6, totalDeficit));
        let addedThisTick = 0;

        while (addedThisTick < maxToAddThisTick) {
            let addedInPass = false;

            for (let index = 0; index < deficits.length; index++) {
                if (deficits[index] <= 0 || addedThisTick >= maxToAddThisTick) continue;

                const added = WaterBars.addDroplet(index, State.SAND_COLORS[index]);
                if (!added) continue;

                deficits[index] -= 1;
                addedThisTick += 1;
                addedInPass = true;
            }

            if (!addedInPass) break;
        }

        State.physicsParticlesAdded = WaterBars.getTotalFillUnits() + WaterBars.getPendingDropletCount();
        if (timelineState.overallProgress >= 0.999 && WaterBars.getPendingDropletCount() === 0 && Visuals.isWaterNearTop()) {
            Visuals.stopPhysicsCheckInterval();
        }
    },

    refreshActiveFillLayout: function() {
        const mode = Settings.getVisualizationMode();
        const Physics = getPhysics();
        const WaterBars = getWaterBars();
        const StageVisualization = getStageVisualization();

        if (mode === 'sand' && Physics?.isInitialized && DOM.sandBarsCanvas && DOM.sandBarsContainerEl) {
            const layout = Visuals.getSandFillLayout();
            if (layout.width > 0 && layout.height > 0) {
                const metrics = Visuals.calculateSandMetrics(layout.width, layout.height);
                State.visualMaxParticlesPerSegment = metrics.capacityPerSegment;
                State.visualTargetParticlesPerSegment = metrics.visualTargetPerSegment;
                State.totalParticlesForPeriod = metrics.totalCapacity;
                State.visualTargetParticlesForPeriod = metrics.totalVisualTarget;
                Physics.init(DOM.sandBarsCanvas, layout.width, layout.height, {
                    mode: 'sand',
                    segments: State.SAND_COLORS.length,
                    measureLayout: Visuals.getSandFillLayout
                });
                Physics.start();
                void Visuals.syncSandBarsToCurrentProgress();
            }
        }

        if (mode === 'water' && WaterBars?.isInitialized && DOM.waterFillCanvas && DOM.waterFillContainerEl) {
            const layout = Visuals.getWaterFillLayout();
            if (layout.width > 0 && layout.height > 0) {
                const metrics = Visuals.calculateWaterMetrics(layout);
                State.visualMaxParticlesPerSegment = metrics.capacityPerBar;
                State.totalParticlesForPeriod = metrics.totalCapacity;
                WaterBars.setCapacity(metrics.capacityPerBar);
                WaterBars.setParticleRadius(metrics.particleRadius);
                WaterBars.resize(layout.width, layout.height);
                Visuals.syncWaterBarsToCurrentProgress();
                State.physicsParticlesAdded = WaterBars.getTotalFillUnits() + WaterBars.getPendingDropletCount();
                WaterBars.renderOnce();
            }
        }

        if (Settings.isStageVisualizationMode() && StageVisualization?.isInitialized && DOM.stageVisualizationCanvas && DOM.stageVisualizationContainerEl) {
            const layout = Visuals.getStageFillLayout();
            if (layout.width > 0 && layout.height > 0) {
                StageVisualization.setMode(mode);
                StageVisualization.setBleedTop(Visuals.getStageCanvasBleedTop(layout));
                StageVisualization.resize(layout.width, layout.height);
                StageVisualization.renderOnce();
            }
        }
    },

    stopPhysicsCheckInterval: function() {
        if (State.physicsCheckIntervalId) {
            clearInterval(State.physicsCheckIntervalId);
            State.physicsCheckIntervalId = null;
        }
    },

    handlePeriodChange: function(periodInfo) {
        const mode = Settings.getVisualizationMode();
        if (mode === 'sand') {
            void Visuals.setupPhysicsSandBars(periodInfo);
            return;
        }
        if (mode === 'water') {
            void Visuals.setupPhysicsWaterFill(periodInfo);
            return;
        }
        if (Settings.isStageVisualizationMode()) {
            void Visuals.setupStageVisualization();
            return;
        }

        Visuals.beginVisualSetup();
        Visuals.stopLegacyVisualizations();
        Visuals.stopStageVisualization();
    },

    handleDisplayToggle: function() {
        const periodInfo = Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
        const mode = Settings.getVisualizationMode();

        if (mode === 'sand') {
            void Visuals.setupPhysicsSandBars(periodInfo);
            return;
        }
        if (mode === 'water') {
            void Visuals.setupPhysicsWaterFill(periodInfo);
            return;
        }
        if (Settings.isStageVisualizationMode()) {
            void Visuals.setupStageVisualization();
            return;
        }

        Visuals.beginVisualSetup();
        Visuals.stopLegacyVisualizations();
        Visuals.stopStageVisualization();
    },

    handleColorSchemeChange: function() {
         const newColor = Settings.getActiveColourScheme().text || '#FFFFFF';
         document.querySelectorAll<HTMLElement>('.sand-bar-outline-segment, .water-fill-outline-segment, .stage-visualization-outline-segment').forEach(outline => {
             outline.style.borderColor = newColor;
         });
         getWaterBars()?.setBorderColor(newColor);

         if (Visuals.hasRenderableScheduleCircles()) {
              Visuals.renderScheduleCircles();
         } else {
              Visuals.updateScheduleCirclesVisibility([]);
         }
     }
};
