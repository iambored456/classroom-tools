/** js/clock.js */
import { Utils, getCurrentOffsetTime } from './utils.ts';
import { Settings } from './settings.ts';
import { Layout } from './layout.ts';
import { Alerts } from './alerts.ts';
import { Visuals } from './visuals.ts';
import { State } from './state.ts';
import { DOM } from './dom.ts';

export const Clock = {
    updateIntervalId: null,

    start: function() {
        if (Clock.updateIntervalId) clearInterval(Clock.updateIntervalId);
        Clock.updateIntervalId = setInterval(Clock.update, 1000); // Update every second
        Clock.update(); // Initial call immediately
    },

    stop: function() {
         if (Clock.updateIntervalId) {
              clearInterval(Clock.updateIntervalId);
              Clock.updateIntervalId = null;
         }
    },

    // This needs to be callable early, potentially before full init, handle gracefully
    getCurrentPeriodInfo: function(systemNow = new Date()) {
        try {
            return Settings.getCurrentPeriodInfoForSystemTime(systemNow);
        } catch (e) {
            console.error("Error checking current period.", e);
            return null;
        }
    },

    update: function() {
        // Ensure critical modules are available
        if (!Settings || !Layout || !Alerts || !Visuals || !State || !DOM) {
            console.error("Core modules not available in Clock.update");
            return;
        }

        const systemNow = new Date();
        const periodInfo = Clock.getCurrentPeriodInfo(systemNow);
        const now = periodInfo?.now || getCurrentOffsetTime(systemNow);
        const activeScheme = Settings.getActiveColourScheme();

        Layout.update(); // Apply layout (visibility, font sizes)

        if (!State.activeVisualAlertInterval) {
             Alerts.restoreOriginalStyles(activeScheme); // Apply non-alert colors/styles
        }

        // Update Core Displays (Time, Date)
        if (Settings.preferences.showTime && DOM.timeEl) DOM.timeEl.textContent = Utils.formatTime(now);
        if (Settings.preferences.showDate && DOM.dateEl) DOM.dateEl.textContent = Utils.formatDate(now);

        // Update Visualizations (Circles)
        // Sand bar physics runs independently, particle adding is interval-based
        Visuals.update(now); // Renders circles if enabled

        // --- Detect Period Change ---
        const newPeriodIndex = periodInfo ? periodInfo.index : null;
        if (newPeriodIndex !== State.currentPeriodIndex) {
             const previousPeriodIndex = State.currentPeriodIndex; // Store for logging/debugging if needed
            // console.log(`Period changed from index ${previousPeriodIndex} to ${newPeriodIndex} (${periodInfo?.label || 'None'})`);
            State.currentPeriodLabel = periodInfo ? periodInfo.label : null;
            State.currentPeriodIndex = newPeriodIndex;
            window.dispatchEvent(new CustomEvent('class-clock-period-change'));

            if (State.activeVisualAlertInterval) {
                 Alerts.clearVisualAlert();
                 Alerts.restoreOriginalStyles();
            }

            // Let Visuals module handle state changes related to the period change (e.g., sandbars)
            Visuals.handlePeriodChange(periodInfo);
        }

        // Update display elements related to the current period (Label, CSS Progress)
        Clock.updatePeriodDisplay(now, periodInfo);
    },

    updatePeriodDisplay: function(now, periodInfo) {
        // Ensure DOM is ready
        if (!DOM.periodLabelEl) return;

        if (periodInfo) {
            // --- Update Label ---
            if (Settings.preferences.showScheduleLabel) {
                 DOM.periodLabelEl.textContent = periodInfo.label;
            } else {
                 DOM.periodLabelEl.textContent = ''; // Clear if pref hidden
            }

            // --- Update CSS Progress Bar & Time Left ---
            // Only update if the standard progress bar is the active one
            if (Settings.isProgressBarMode()) {
                 if (DOM.progressEl && DOM.progressBarEl && DOM.timeLeftEl) {
                     const periodStartMs = periodInfo.start.getTime();
                     const periodEndMs = periodInfo.end.getTime();
                     const nowMs = now.getTime();
                     const periodDuration = periodEndMs - periodStartMs;
                     const timeElapsed = Math.max(0, nowMs - periodStartMs);

                     if (periodDuration > 0) {
                         const progressPercent = Math.min(100, Math.max(0, (timeElapsed / periodDuration) * 100));
                         DOM.progressEl.style.width = progressPercent + "%";

                         const progressBarWidth = DOM.progressBarEl.offsetWidth;
                          // Get actual width, provide fallback if not rendered yet
                         const timeLeftWidth = DOM.timeLeftEl.offsetWidth > 0 ? DOM.timeLeftEl.offsetWidth : 60;
                         let finalLeft = (progressPercent / 100) * progressBarWidth - (timeLeftWidth / 2);
                         // Clamp left position to prevent going off edges
                         finalLeft = Math.max(0, Math.min(progressBarWidth - timeLeftWidth, finalLeft));
                         DOM.timeLeftEl.style.left = finalLeft + "px";

                         const timeLeftMs = Math.max(0, periodEndMs - nowMs);
                         const timeLeftSec = Math.floor(timeLeftMs / 1000);
                         const minutes = Math.floor(timeLeftSec / 60);
                         const seconds = timeLeftSec % 60;
                         DOM.timeLeftEl.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
                     } else { // Handle zero/negative duration
                         DOM.progressEl.style.width = (nowMs >= periodStartMs) ? "100%" : "0%";
                         DOM.timeLeftEl.textContent = "0:00";
                         const progressBarWidth = DOM.progressBarEl.offsetWidth;
                         const timeLeftWidth = DOM.timeLeftEl.offsetWidth > 0 ? DOM.timeLeftEl.offsetWidth : 60;
                         DOM.timeLeftEl.style.left = `${progressBarWidth - timeLeftWidth}px`; // Position at end
                     }
                 }
             } else {
                 // Clear standard progress/timeleft if a physics fill is active
                  if (DOM.progressEl) DOM.progressEl.style.width = "0%";
                  if (DOM.timeLeftEl) DOM.timeLeftEl.textContent = "";
            }

        } else {
             // --- No Active Period ---
             if (DOM.periodLabelEl) DOM.periodLabelEl.textContent = "";
             // Clear standard progress bar if it's enabled by preference
             if (DOM.progressEl && Settings.isProgressBarMode()) DOM.progressEl.style.width = "0%";
             if (DOM.timeLeftEl && Settings.isProgressBarMode()) DOM.timeLeftEl.textContent = "";
             // Physics bodies/intervals cleared via Visuals.handlePeriodChange
        }
    }
};
