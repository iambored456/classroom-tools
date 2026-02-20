/** js/visuals.js */
import { Settings } from './settings.js';
import { DOM } from './dom.js';
import { Clock } from './clock.js';
import { getCurrentOffsetTime } from './utils.js';
import { State } from './state.js';
import { Physics } from './physics.js';

const WATER_PARTICLE_COLOR = '#4aa8ff';

export const Visuals = {
    update: function(now) {
        if (Settings.preferences.showScheduleCircles) {
            Visuals.renderScheduleCircles();
        } else if (DOM.scheduleCirclesDisplayEl) {
            DOM.scheduleCirclesDisplayEl.innerHTML = '';
        }
    },

    renderScheduleCircles: function() {
       if (!Settings.preferences.showScheduleCircles || !DOM.scheduleCirclesDisplayEl) {
           if (DOM.scheduleCirclesDisplayEl) DOM.scheduleCirclesDisplayEl.innerHTML = '';
           return;
       }
       const now = getCurrentOffsetTime();
       const currentPeriodInfo = Clock.getCurrentPeriodInfo(now);
       const activeScheme = Settings.getActiveColourScheme();
       const circlePeriods = (Settings.schedule || [])
           .map((item, index) => ({ ...item, originalIndex: index }))
           .filter(item => item.showCircles);
       if (circlePeriods.length === 0) {
           DOM.scheduleCirclesDisplayEl.innerHTML = '';
           return;
       }
       let currentCircleIndex = -1;
       if (currentPeriodInfo) {
           currentCircleIndex = circlePeriods.findIndex(p => p.originalIndex === currentPeriodInfo.index);
       }
       let html = '';
       for (let i = 0; i < circlePeriods.length; i++) {
           const isActive = currentCircleIndex >= i;
           const symbol = isActive ? '\u25CF' : '\u25CB';
           const cssClass = `schedule-circle-symbol ${isActive ? 'active' : 'inactive'}`;
           const color = isActive ? activeScheme.text : '#555';
           html += `<span class="${cssClass}" style="color: ${color};">${symbol}</span>`;
       }
       DOM.scheduleCirclesDisplayEl.innerHTML = html;
    },

    setupPhysicsSandBars: function(periodInfo) {
        Visuals.stopPhysicsCheckInterval();
        Physics.clearDynamicBodies();
        State.physicsParticlesAdded = 0;
        State.totalParticlesForPeriod = 0;

        if (!Settings.preferences.showSandBars || !DOM.sandBarsCanvas || !DOM.sandBarsContainerEl) {
            Physics.stop();
            return;
        }

        const heightPref = Settings.preferences?.sandHeight || 150;
        const widthPref = Settings.preferences?.sandWidth || 80;
        DOM.sandBarsContainerEl.style.height = `${heightPref}px`;
        DOM.sandBarsContainerEl.style.width = `${widthPref}%`;

        requestAnimationFrame(() => {
            const containerWidth = DOM.sandBarsContainerEl.offsetWidth;
            const containerHeight = DOM.sandBarsContainerEl.offsetHeight;

            if (containerWidth <= 0 || containerHeight <= 0) {
                console.warn("Sand bars container has zero dimensions after rAF. Aborting physics setup.");
                Physics.stop();
                return;
            }

            const particleRadius = Settings.preferences?.sandParticleSize || 5;
            const particleArea = (3 * Math.sqrt(3) / 2) * particleRadius * particleRadius;

            const segmentWidth = containerWidth / State.SAND_COLORS.length;
            const wallThickness = 15;
            const usableSegmentWidth = Math.max(0, segmentWidth - wallThickness - (particleRadius * 0.25));
            const usableSegmentHeight = Math.max(0, containerHeight - (particleRadius * 0.2));
            const usableSegmentArea = usableSegmentWidth * usableSegmentHeight;
            const packingDensity = 0.94;

            State.visualMaxParticlesPerSegment = Math.max(10, Math.floor((usableSegmentArea * packingDensity) / particleArea));
            State.totalParticlesForPeriod = State.visualMaxParticlesPerSegment * State.SAND_COLORS.length;
            console.log(`Est. Max Particles Per Segment (Hex): ${State.visualMaxParticlesPerSegment}, Total Target: ${State.totalParticlesForPeriod}, Particle Area: ${particleArea.toFixed(2)}`);

            Physics.init(DOM.sandBarsCanvas, containerWidth, containerHeight, {
                mode: 'sand',
                segments: State.SAND_COLORS.length
            });
            Physics.start();
            Visuals.handleColorSchemeChange();

            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
            if (activePeriod) {
                const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
                if (periodDurationMs > 0) {
                    Visuals.checkAndAddParticles();
                    State.physicsCheckIntervalId = setInterval(Visuals.checkAndAddParticles, State.physicsCheckIntervalMs);
                } else {
                    console.log("Period duration is zero or negative, stopping sand physics.");
                    Physics.stop();
                }
            } else {
                console.log("No current period found, stopping sand physics.");
                Physics.stop();
            }
        });
    },

    setupPhysicsWaterFill: function(periodInfo) {
        Visuals.stopPhysicsCheckInterval();
        Physics.clearDynamicBodies();
        State.physicsParticlesAdded = 0;
        State.totalParticlesForPeriod = 0;

        if (!Settings.preferences.showWaterFill || !DOM.waterFillCanvas || !DOM.waterFillContainerEl) {
            Physics.stop();
            return;
        }

        const heightPref = Settings.preferences?.sandHeight || 150;
        const widthPref = Settings.preferences?.sandWidth || 80;
        DOM.waterFillContainerEl.style.height = `${heightPref}px`;
        DOM.waterFillContainerEl.style.width = `${widthPref}%`;

        requestAnimationFrame(() => {
            const containerWidth = DOM.waterFillContainerEl.offsetWidth;
            const containerHeight = DOM.waterFillContainerEl.offsetHeight;

            if (containerWidth <= 0 || containerHeight <= 0) {
                console.warn("Water fill container has zero dimensions after rAF. Aborting physics setup.");
                Physics.stop();
                return;
            }

            const particleRadius = Math.max(2, (Settings.preferences?.sandParticleSize || 5) * 0.8);
            const particleArea = Math.PI * particleRadius * particleRadius;
            const wallThickness = 15;
            const usableWidth = Math.max(0, containerWidth - wallThickness - (particleRadius * 0.1));
            const usableHeight = Math.max(0, containerHeight - (particleRadius * 0.05));
            const packingDensity = 0.74;

            State.totalParticlesForPeriod = Math.max(20, Math.floor((usableWidth * usableHeight * packingDensity) / particleArea));
            State.visualMaxParticlesPerSegment = State.totalParticlesForPeriod;
            console.log(`Est. Max Water Particles: ${State.totalParticlesForPeriod}, Particle Area: ${particleArea.toFixed(2)}`);

            Physics.init(DOM.waterFillCanvas, containerWidth, containerHeight, {
                mode: 'water',
                segments: 1
            });
            Physics.start();
            Visuals.handleColorSchemeChange();

            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
            if (activePeriod) {
                const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
                if (periodDurationMs > 0) {
                    Visuals.checkAndAddWaterParticles();
                    State.physicsCheckIntervalId = setInterval(Visuals.checkAndAddWaterParticles, State.physicsCheckIntervalMs);
                } else {
                    console.log("Period duration is zero or negative, stopping water physics.");
                    Physics.stop();
                }
            } else {
                console.log("No current period found, stopping water physics.");
                Physics.stop();
            }
        });
    },

    isSandBarsNearTop: function() {
        if (!Physics.isInitialized || !Physics.isRunning) return false;

        const segmentTopYs = Physics.getSegmentTopYs();
        if (!segmentTopYs || segmentTopYs.length !== State.SAND_COLORS.length) return false;

        const particleRadius = Settings.preferences?.sandParticleSize || 5;
        const nearTopThresholdY = Math.max(2, particleRadius * 1.2);

        return segmentTopYs.every(y => Number.isFinite(y) && y <= nearTopThresholdY);
    },

    isWaterNearTop: function() {
        if (!Physics.isInitialized || !Physics.isRunning) return false;

        const topY = Physics.getTopY();
        if (!Number.isFinite(topY)) return false;

        const particleRadius = Math.max(2, (Settings.preferences?.sandParticleSize || 5) * 0.8);
        const nearTopThresholdY = Math.max(1, particleRadius * 0.2);
        return topY <= nearTopThresholdY;
    },

    checkAndAddParticles: function() {
        if (!Settings.preferences.showSandBars || !Physics.isRunning || State.totalParticlesForPeriod <= 0) {
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

        const isNearTop = Visuals.isSandBarsNearTop();
        if (isNearTop) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const timeElapsedMs = Math.max(0, now.getTime() - periodStartMs);
        const totalFillPercentage = Math.min(1, timeElapsedMs / periodDurationMs);
        const baseTargetTotalParticles = Math.floor(totalFillPercentage * State.totalParticlesForPeriod);
        const hardParticleCap = Math.ceil(State.totalParticlesForPeriod * 1.35);

        let targetTotalParticles = baseTargetTotalParticles;

        if (totalFillPercentage >= 0.9 && targetTotalParticles <= State.physicsParticlesAdded) {
            targetTotalParticles = Math.min(hardParticleCap, State.physicsParticlesAdded + 6);
        }

        targetTotalParticles = Math.min(targetTotalParticles, hardParticleCap);

        const particlesToAdd = targetTotalParticles - State.physicsParticlesAdded;
        if (particlesToAdd <= 0) return;

        const maxToAddThisTick = 6;
        for (let i = 0; i < Math.min(particlesToAdd, maxToAddThisTick); ++i) {
             if (State.physicsParticlesAdded >= hardParticleCap) break;

             const segmentDuration = periodDurationMs / State.SAND_COLORS.length;
             const nextParticleIndex = State.physicsParticlesAdded;
             let segmentIndex;

             if (nextParticleIndex < State.totalParticlesForPeriod) {
                 const particleRepresentsTime = (nextParticleIndex + 0.5) / State.totalParticlesForPeriod * periodDurationMs;
                 segmentIndex = Math.min(State.SAND_COLORS.length - 1, Math.floor(particleRepresentsTime / segmentDuration));
             } else {
                 // Top-off particles should not all pile into the last segment.
                 segmentIndex = nextParticleIndex % State.SAND_COLORS.length;
             }

            if (segmentIndex >= 0) {
                const added = Physics.addParticle(segmentIndex, State.SAND_COLORS[segmentIndex]);
                if (added) {
                    State.physicsParticlesAdded++;
                } else {
                    break;
                }
            }
        }

        if (State.physicsParticlesAdded >= hardParticleCap) {
            Visuals.stopPhysicsCheckInterval();
        }
    },

    checkAndAddWaterParticles: function() {
        if (!Settings.preferences.showWaterFill || !Physics.isRunning || State.totalParticlesForPeriod <= 0) {
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

        const isNearTop = Visuals.isWaterNearTop();
        if (isNearTop) {
            Visuals.stopPhysicsCheckInterval();
            return;
        }

        const timeElapsedMs = Math.max(0, now.getTime() - periodStartMs);
        const totalFillPercentage = Math.min(1, timeElapsedMs / periodDurationMs);
        const baseTargetTotalParticles = Math.floor(totalFillPercentage * State.totalParticlesForPeriod);
        const hardParticleCap = Math.ceil(State.totalParticlesForPeriod * 1.5);

        let targetTotalParticles = baseTargetTotalParticles;
        if (totalFillPercentage >= 0.9 && targetTotalParticles <= State.physicsParticlesAdded) {
            targetTotalParticles = Math.min(hardParticleCap, State.physicsParticlesAdded + 6);
        }

        targetTotalParticles = Math.min(targetTotalParticles, hardParticleCap);

        const particlesToAdd = targetTotalParticles - State.physicsParticlesAdded;
        if (particlesToAdd <= 0) return;

        const maxToAddThisTick = 8;
        for (let i = 0; i < Math.min(particlesToAdd, maxToAddThisTick); ++i) {
            if (State.physicsParticlesAdded >= hardParticleCap) break;

            const added = Physics.addWaterParticle(WATER_PARTICLE_COLOR);
            if (added) {
                State.physicsParticlesAdded++;
            } else {
                break;
            }
        }

        if (State.physicsParticlesAdded >= hardParticleCap) {
            Visuals.stopPhysicsCheckInterval();
        }
    },

    stopPhysicsCheckInterval: function() {
        if (State.physicsCheckIntervalId) {
            clearInterval(State.physicsCheckIntervalId);
            State.physicsCheckIntervalId = null;
        }
    },

    handlePeriodChange: function(periodInfo) {
        if (Settings.preferences.showSandBars) {
            Visuals.setupPhysicsSandBars(periodInfo);
            return;
        }
        if (Settings.preferences.showWaterFill) {
            Visuals.setupPhysicsWaterFill(periodInfo);
            return;
        }

        Visuals.stopPhysicsCheckInterval();
        Physics.clearDynamicBodies();
        Physics.stop();
    },

    handleDisplayToggle: function() {
        const periodInfo = Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
        if (Settings.preferences.showSandBars) {
            Visuals.setupPhysicsSandBars(periodInfo);
            return;
        }
        if (Settings.preferences.showWaterFill) {
            Visuals.setupPhysicsWaterFill(periodInfo);
            return;
        }

        Visuals.stopPhysicsCheckInterval();
        Physics.clearDynamicBodies();
        Physics.stop();
    },

    handleColorSchemeChange: function() {
         const newColor = Settings.getActiveColourScheme().text || '#FFFFFF';
         document.querySelectorAll('.sand-bar-outline-segment, .water-fill-outline-segment').forEach(outline => {
             outline.style.borderColor = newColor;
         });

         if (Settings.preferences.showScheduleCircles) {
              Visuals.renderScheduleCircles();
         }
     }
};