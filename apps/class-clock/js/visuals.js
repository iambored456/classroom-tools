/** js/visuals.js */
import { Settings } from './settings.js';
import { DOM } from './dom.js';
import { Clock } from './clock.js';
import { getCurrentOffsetTime } from './utils.js';
import { State } from './state.js';
import { Physics } from './physics.js';
import { WaterBars } from './waterBars.js';

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
        WaterBars.stop();
        WaterBars.reset();
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
        Physics.stop();
        State.physicsParticlesAdded = 0;
        State.totalParticlesForPeriod = 0;

        if (!Settings.preferences.showWaterFill || !DOM.waterFillCanvas || !DOM.waterFillContainerEl) {
            WaterBars.stop();
            WaterBars.reset();
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
                WaterBars.stop();
                return;
            }

            const barCount = State.SAND_COLORS.length;
            const particleRadius = Math.max(2, (Settings.preferences?.sandParticleSize || 5) * 0.75);
            const particleArea = Math.PI * particleRadius * particleRadius;
            const horizontalPadding = 8;
            const gap = 10;
            const usableWidth = Math.max(20, containerWidth - (horizontalPadding * 2));
            const usableHeight = Math.max(20, containerHeight - 8);
            const segmentWidth = Math.max(6, (usableWidth - (gap * (barCount - 1))) / barCount);
            const packingDensity = 0.7;

            State.visualMaxParticlesPerSegment = Math.max(30, Math.floor((segmentWidth * usableHeight * packingDensity) / particleArea));
            State.totalParticlesForPeriod = State.visualMaxParticlesPerSegment * barCount;
            console.log(`Est. Max Water Droplets Per Segment: ${State.visualMaxParticlesPerSegment}, Total Target: ${State.totalParticlesForPeriod}, Particle Area: ${particleArea.toFixed(2)}`);

            WaterBars.init(DOM.waterFillCanvas, containerWidth, containerHeight, {
                colors: State.SAND_COLORS,
                capacityPerBar: State.visualMaxParticlesPerSegment,
                particleRadius
            });
            WaterBars.setCapacity(State.visualMaxParticlesPerSegment);
            WaterBars.setParticleRadius(particleRadius);
            WaterBars.reset();
            WaterBars.start();
            Visuals.handleColorSchemeChange();

            const activePeriod = periodInfo || Clock.getCurrentPeriodInfo(getCurrentOffsetTime());
            if (activePeriod) {
                const periodDurationMs = activePeriod.end.getTime() - activePeriod.start.getTime();
                if (periodDurationMs > 0) {
                    Visuals.checkAndAddWaterParticles();
                    State.physicsCheckIntervalId = setInterval(Visuals.checkAndAddWaterParticles, State.physicsCheckIntervalMs);
                } else {
                    console.log("Period duration is zero or negative, showing empty water bars.");
                }
            } else {
                console.log("No current period found, showing empty water bars.");
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
        return WaterBars.isNearTop();
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
        if (!Settings.preferences.showWaterFill || !WaterBars.isRunning || State.totalParticlesForPeriod <= 0) {
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
        const remainingToFull = Math.max(0, totalCapacity - filledUnits);

        let targetTotalParticles = baseTargetTotalParticles;
        if (totalFillPercentage >= 0.9) {
            targetTotalParticles = Math.max(targetTotalParticles, Math.min(totalCapacity, filledUnits + Math.ceil(remainingToFull * 0.35)));
        }
        if (totalFillPercentage >= 0.97) {
            targetTotalParticles = Math.max(targetTotalParticles, Math.min(totalCapacity, filledUnits + Math.ceil(remainingToFull * 0.75)));
        }
        if (totalFillPercentage >= 0.995) {
            targetTotalParticles = Math.max(targetTotalParticles, totalCapacity);
        }
        if (totalFillPercentage >= 0.9 && targetTotalParticles <= producedUnits && remainingToFull > 0) {
            targetTotalParticles = Math.min(hardParticleCap, producedUnits + Math.min(18, remainingToFull * 2));
        }

        targetTotalParticles = Math.min(targetTotalParticles, hardParticleCap);

        const particlesToAdd = targetTotalParticles - producedUnits;
        if (particlesToAdd <= 0) return;

        let maxToAddThisTick = 5;
        if (totalFillPercentage >= 0.9) maxToAddThisTick = 10;
        if (totalFillPercentage >= 0.97) maxToAddThisTick = 18;
        if (totalFillPercentage >= 0.995) maxToAddThisTick = 28;

        for (let i = 0; i < Math.min(particlesToAdd, maxToAddThisTick); ++i) {
            const projectedProduced = producedUnits + i;
            if (projectedProduced >= hardParticleCap) break;

            const segmentDuration = periodDurationMs / State.SAND_COLORS.length;
            const nextParticleIndex = projectedProduced;
            let preferredSegmentIndex;

            if (nextParticleIndex < totalCapacity) {
                const particleRepresentsTime = (nextParticleIndex + 0.5) / totalCapacity * periodDurationMs;
                preferredSegmentIndex = Math.min(State.SAND_COLORS.length - 1, Math.floor(particleRepresentsTime / segmentDuration));
            } else {
                preferredSegmentIndex = nextParticleIndex % State.SAND_COLORS.length;
            }

            const segmentIndex = WaterBars.findBestBarIndex(preferredSegmentIndex);
            if (segmentIndex >= 0) {
                const added = WaterBars.addDroplet(segmentIndex, State.SAND_COLORS[segmentIndex]);
                if (!added) break;
            } else {
                break;
            }
        }

        const finalPending = WaterBars.getPendingDropletCount();
        if (Visuals.isWaterNearTop() && finalPending === 0) {
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
        WaterBars.stop();
        WaterBars.reset();
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
        WaterBars.stop();
        WaterBars.reset();
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
