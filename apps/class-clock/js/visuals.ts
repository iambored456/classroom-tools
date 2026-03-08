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

function getEmptyStageState() {
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

    getStageProgressState: function() {
        const now = getCurrentOffsetTime();
        const periodInfo = Clock.getCurrentPeriodInfo(now);
        if (!periodInfo) return getEmptyStageState();

        const periodDurationMs = periodInfo.end.getTime() - periodInfo.start.getTime();
        if (periodDurationMs <= 0) return getEmptyStageState();

        const overallProgress = clamp((now.getTime() - periodInfo.start.getTime()) / periodDurationMs, 0, 0.999999);
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
                measureLayout: Visuals.getWaterFillLayout
            });
            WaterBars.setCapacity(metrics.capacityPerBar);
            WaterBars.setParticleRadius(metrics.particleRadius);
            WaterBars.reset();
            WaterBars.start();
            Visuals.handleColorSchemeChange();

            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
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
                getState: Visuals.getStageProgressState
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

        const periodStartMs = periodInfo.start.getTime();
        const periodEndMs = periodInfo.end.getTime();
        const periodDurationMs = periodEndMs - periodStartMs;
        if (periodDurationMs <= 0) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        if (Visuals.isSandBarsNearTop()) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const timeElapsedMs = Math.max(0, now.getTime() - periodStartMs);
        const totalFillPercentage = Math.min(1, timeElapsedMs / periodDurationMs);
        const visualTargetTotalParticles = Math.max(
            State.totalParticlesForPeriod,
            State.visualTargetParticlesForPeriod || State.totalParticlesForPeriod
        );
        const baseTargetTotalParticles = Math.floor(totalFillPercentage * visualTargetTotalParticles);
        const hardParticleCap = Math.ceil(visualTargetTotalParticles * 1.08);
        const shouldTopOffAtEnd = totalFillPercentage >= 1;
        const desiredTargetTotalParticles = shouldTopOffAtEnd ? hardParticleCap : baseTargetTotalParticles;
        const targetTotalParticles = Math.min(desiredTargetTotalParticles, hardParticleCap);
        const particlesToAdd = targetTotalParticles - State.physicsParticlesAdded;
        if (particlesToAdd <= 0) {
            if (shouldTopOffAtEnd) {
                Visuals.stopPhysicsCheckInterval();
            }
            return;
        }

        const maxToAddThisTick = 6;
        for (let i = 0; i < Math.min(particlesToAdd, maxToAddThisTick); ++i) {
            if (State.physicsParticlesAdded >= hardParticleCap) break;

            const segmentDuration = periodDurationMs / State.SAND_COLORS.length;
            const nextParticleIndex = State.physicsParticlesAdded;
            const segmentIndex = nextParticleIndex < visualTargetTotalParticles
                ? Math.min(State.SAND_COLORS.length - 1, Math.floor((((nextParticleIndex + 0.5) / visualTargetTotalParticles) * periodDurationMs) / segmentDuration))
                : nextParticleIndex % State.SAND_COLORS.length;

            const added = Physics.addParticle(segmentIndex, State.SAND_COLORS[segmentIndex]);
            if (!added) break;
            State.physicsParticlesAdded++;
        }

        if (State.physicsParticlesAdded >= hardParticleCap) {
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

        const periodStartMs = periodInfo.start.getTime();
        const periodEndMs = periodInfo.end.getTime();
        const periodDurationMs = periodEndMs - periodStartMs;
        if (periodDurationMs <= 0) {
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

        const timeElapsedMs = Math.max(0, now.getTime() - periodStartMs);
        const totalFillPercentage = Math.min(1, timeElapsedMs / periodDurationMs);
        const baseTargetTotalParticles = Math.floor(totalFillPercentage * totalCapacity);
        const hardParticleCap = Math.ceil(totalCapacity * 1.6);
        const targetTotalParticles = Math.min(baseTargetTotalParticles, hardParticleCap);
        const particlesToAdd = targetTotalParticles - producedUnits;
        if (particlesToAdd <= 0) return;

        const maxToAddThisTick = 5;
        for (let i = 0; i < Math.min(particlesToAdd, maxToAddThisTick); ++i) {
            const projectedProduced = producedUnits + i;
            if (projectedProduced >= hardParticleCap) break;

            const segmentDuration = periodDurationMs / State.SAND_COLORS.length;
            const nextParticleIndex = projectedProduced;
            const preferredSegmentIndex = nextParticleIndex < totalCapacity
                ? Math.min(State.SAND_COLORS.length - 1, Math.floor((((nextParticleIndex + 0.5) / totalCapacity) * periodDurationMs) / segmentDuration))
                : nextParticleIndex % State.SAND_COLORS.length;

            const segmentIndex = WaterBars.findBestBarIndex(preferredSegmentIndex);
            if (segmentIndex < 0) break;

            const added = WaterBars.addDroplet(segmentIndex, State.SAND_COLORS[segmentIndex]);
            if (!added) break;
        }

        if (Visuals.isWaterNearTop() && WaterBars.getPendingDropletCount() === 0) {
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
                State.totalParticlesForPeriod = metrics.totalCapacity;
                State.visualTargetParticlesForPeriod = metrics.totalVisualTarget;
                Physics.init(DOM.sandBarsCanvas, layout.width, layout.height, {
                    mode: 'sand',
                    segments: State.SAND_COLORS.length,
                    measureLayout: Visuals.getSandFillLayout
                });
                Physics.start();
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
                State.physicsParticlesAdded = WaterBars.getTotalFillUnits() + WaterBars.getPendingDropletCount();
                WaterBars.renderOnce();
            }
        }

        if (Settings.isStageVisualizationMode() && StageVisualization?.isInitialized && DOM.stageVisualizationCanvas && DOM.stageVisualizationContainerEl) {
            const layout = Visuals.getStageFillLayout();
            if (layout.width > 0 && layout.height > 0) {
                StageVisualization.setMode(mode);
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

         if (Visuals.hasRenderableScheduleCircles()) {
              Visuals.renderScheduleCircles();
         } else {
              Visuals.updateScheduleCirclesVisibility([]);
         }
     }
};
