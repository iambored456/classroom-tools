/** js/timeSync.js */
import { DOM } from './dom.ts';
import { Settings } from './settings.ts';
import { Clock } from './clock.ts';
import { Utils } from './utils.ts';

const TIME_PATTERN = /^\d{2}:\d{2}$/;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseTimeList(value) {
    const matches = String(value || '').match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) || [];
    return Array.from(new Set(matches));
}

function formatTimeList(times) {
    return (Array.isArray(times) ? times : []).join(', ');
}

function collectScheduleBellTimes(schedule) {
    const times = [];
    const addTime = (time) => {
        if (typeof time === 'string' && TIME_PATTERN.test(time) && !times.includes(time)) {
            times.push(time);
        }
    };

    (schedule || []).forEach(period => {
        if (!period) return;
        addTime(period.start);
        const nextPeriodStartsAtEnd = (schedule || []).some(nextPeriod => nextPeriod?.start === period.end);
        if (!nextPeriodStartsAtEnd) {
            addTime(period.end);
        }
    });

    return times;
}

function findNearestTime(times, systemNow = new Date()) {
    const systemNowMs = systemNow.getTime();
    let minDiff = Infinity;
    let nearestEventTime = null;

    (times || []).forEach(time => {
        if (!TIME_PATTERN.test(time)) return;
        try {
            const eventTime = Utils.getTodayTime(time);
            const diff = Math.abs(eventTime.getTime() - systemNowMs);
            if (diff < minDiff) {
                minDiff = diff;
                nearestEventTime = eventTime;
            }
        } catch (e) {
            console.error("Sync error parsing target time:", time, e);
        }
    });

    return nearestEventTime;
}

function formatEventTime(date) {
    return date ? Utils.formatTime(date).replace(' ', '\u00A0') : '';
}

function formatOffset(offsetMs) {
    const totalSeconds = Math.round((Number(offsetMs) || 0) / 1000);
    const sign = totalSeconds >= 0 ? '+' : '-';
    const absSeconds = Math.abs(totalSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    const paddedSeconds = seconds < 10 ? '0' + seconds : seconds;
    return `${sign}${minutes}m ${paddedSeconds}s`;
}

export const TimeSync = {
     attachListeners: function() {
         TimeSync.renderSyncTargets();
         TimeSync.renderActiveTargetSelect();
         DOM.syncToBellBtn?.addEventListener("click", TimeSync.syncToNearestBell);
         DOM.activeSyncTargetSelect?.addEventListener("change", TimeSync.handleActiveSyncTargetChange);
         DOM.syncTargetsContainer?.addEventListener("click", TimeSync.handleSyncTargetClick);
         DOM.syncTargetsContainer?.addEventListener("input", TimeSync.handleSyncTargetInput);
         DOM.syncTargetsContainer?.addEventListener("change", TimeSync.handleSyncTargetChange);
     },

     adjustOffset: function(changeMs, targetId = Settings.preferences.activeSyncTargetId) {
         const target = TimeSync.getSyncTarget(targetId);
         if (!target) return;
         Settings.setSyncTargetOffsetMs(target.id, (Number(target.offsetMs) || 0) + changeMs);
         TimeSync.updateOffsetDisplay(); // Update UI display
         Clock.update(); // Reflect time change immediately
         Settings.save(); // Persist the new offset
     },

     resetOffset: function(targetId = Settings.preferences.activeSyncTargetId, button = DOM.resetOffsetBtn) {
          const target = TimeSync.getSyncTarget(targetId);
          if (!target) return;
          if (Number(target.offsetMs) !== 0) {
              Settings.setSyncTargetOffsetMs(target.id, 0);
              TimeSync.updateOffsetDisplay();
              Clock.update();
              Settings.save();
              Utils.showButtonFeedback(button, "Offset Reset!", 1500);
          } else {
              Utils.showButtonFeedback(button, "Already Zero!", 1000);
          }
     },

     syncToNearestBell: function() {
          // Sync clock to the nearest schedule start/end time
          if (!Settings.schedule || Settings.schedule.length === 0) {
              Utils.showButtonFeedback(DOM.syncToBellBtn, "Add Schedule First!", 2000);
              return;
          }

          const activeTarget = TimeSync.getActiveSyncTarget();
          const nearestEventTime = findNearestTime(activeTarget?.times || collectScheduleBellTimes(Settings.schedule));

          // If a nearest time was found, calculate and apply the offset
          if (nearestEventTime !== null) {
              TimeSync.applySyncToTime(nearestEventTime, DOM.syncToBellBtn, `Synced ${formatEventTime(nearestEventTime)}`, activeTarget?.id);
          } else {
              // No suitable sync points found
              Utils.showButtonFeedback(DOM.syncToBellBtn, "No Valid Times!", 2000);
          }
     },

     applySyncToTime: function(eventTime, button, message = "Synced!", targetId = Settings.preferences.activeSyncTargetId) {
         const systemNow = new Date();
         Settings.setSyncTargetOffsetMs(targetId, eventTime.getTime() - systemNow.getTime());
         TimeSync.updateOffsetDisplay();
         Clock.update(); // Update display immediately
         Settings.save();
         Utils.showButtonFeedback(button, message);
     },

     ensureSyncTargets: function() {
         return Settings.getSyncTargets();
     },

     getSyncTarget: function(targetId) {
         return TimeSync.ensureSyncTargets().find(target => target.id === targetId);
     },

     getActiveSyncTarget: function() {
         return Settings.getActiveSyncTarget();
     },

     renderActiveTargetSelect: function() {
         if (!DOM.activeSyncTargetSelect) return;
         const targets = TimeSync.ensureSyncTargets();
         DOM.activeSyncTargetSelect.innerHTML = targets.map(target => {
             const safeId = escapeHtml(target.id);
             const safeLabel = escapeHtml(target.label);
             return `<option value="${safeId}">${safeLabel}</option>`;
         }).join('');
         DOM.activeSyncTargetSelect.value = Settings.preferences.activeSyncTargetId;
     },

     renderSyncTargets: function() {
         if (!DOM.syncTargetsContainer) return;
         const targets = TimeSync.ensureSyncTargets();
         DOM.syncTargetsContainer.innerHTML = targets.map(target => {
             const safeId = escapeHtml(target.id);
             const safeLabel = escapeHtml(target.label);
             const times = formatTimeList(target.times);
             const offsetString = formatOffset(target.offsetMs);
             const isActive = target.id === Settings.preferences.activeSyncTargetId;
             return `
                 <div class="sync-target-card${isActive ? ' active' : ''}" data-sync-target-id="${safeId}">
                     <div class="sync-target-header">
                         <label class="sync-target-name-label">
                             <span>School Name</span>
                             <input class="sync-target-name" type="text" value="${safeLabel}" data-sync-target-field="label" aria-label="School sync name">
                         </label>
                         <button class="sync-target-action" type="button">Sync to ${safeLabel}</button>
                     </div>
                     <label class="sync-target-times-label">
                         <span>Bell Times</span>
                         <textarea class="sync-target-times" rows="2" data-sync-target-field="times" aria-label="Bell times for ${safeLabel}">${escapeHtml(times)}</textarea>
                     </label>
                     <div class="sync-target-offset-panel">
                         <div class="sync-target-offset-heading">
                             <span>Manual Offset</span>
                             <span class="sync-target-offset">${offsetString}</span>
                         </div>
                         <div class="manual-sync-controls sync-target-manual-controls">
                             <div class="offset-buttons">
                                 <button type="button" data-offset-change="-60000" title="Decrease ${safeLabel} minute offset">-</button><span>Min</span><button type="button" data-offset-change="60000" title="Increase ${safeLabel} minute offset">+</button>
                             </div>
                             <div class="offset-buttons">
                                 <button type="button" data-offset-change="-1000" title="Decrease ${safeLabel} second offset">-</button><span>Sec</span><button type="button" data-offset-change="1000" title="Increase ${safeLabel} second offset">+</button>
                             </div>
                             <button class="sync-target-reset-offset" type="button" title="Reset ${safeLabel} offset to zero">Reset Offset</button>
                         </div>
                     </div>
                     <button class="sync-target-use-current" type="button">Use Current Schedule</button>
                 </div>`;
         }).join('');
         TimeSync.renderActiveTargetSelect();
         TimeSync.updateOffsetDisplay();
     },

     handleSyncTargetInput: function(e) {
         const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
         const card = targetElement.closest?.('.sync-target-card') as HTMLElement | null;
         const target = card ? TimeSync.getSyncTarget(card.dataset.syncTargetId) : null;
         if (!target || targetElement.dataset.syncTargetField !== 'label') return;

         target.label = targetElement.value.trim() || 'School';
         const actionButton = card.querySelector('.sync-target-action') as HTMLButtonElement | null;
         if (actionButton) {
             actionButton.textContent = `Sync to ${target.label}`;
         }
         const option = DOM.activeSyncTargetSelect?.querySelector(`option[value="${target.id}"]`);
         if (option) {
             option.textContent = target.label;
         }
     },

     handleSyncTargetChange: function(e) {
         const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
         const card = targetElement.closest?.('.sync-target-card') as HTMLElement | null;
         const target = card ? TimeSync.getSyncTarget(card.dataset.syncTargetId) : null;
         if (!target || !targetElement.dataset.syncTargetField) return;

         if (targetElement.dataset.syncTargetField === 'label') {
             target.label = targetElement.value.trim() || 'School';
             targetElement.value = target.label;
             TimeSync.renderActiveTargetSelect();
         }

         if (targetElement.dataset.syncTargetField === 'times') {
             const parsedTimes = parseTimeList(targetElement.value);
             if (parsedTimes.length === 0) {
                 Utils.showButtonFeedback(card.querySelector('.sync-target-action'), "Add Times!", 1800);
                 targetElement.value = formatTimeList(target.times);
                 return;
             }
             target.times = parsedTimes;
             targetElement.value = formatTimeList(parsedTimes);
         }

         Settings.save();
     },

     handleActiveSyncTargetChange: function(e) {
         const select = e.target as HTMLSelectElement;
         Settings.setActiveSyncTargetId(select.value);
         TimeSync.renderSyncTargets();
         TimeSync.updateOffsetDisplay();
         Clock.update();
         Settings.save();
     },

     handleSyncTargetClick: function(e) {
         const button = (e.target as HTMLElement).closest?.('button') as HTMLButtonElement | null;
         const card = button?.closest?.('.sync-target-card') as HTMLElement | null;
         const target = card ? TimeSync.getSyncTarget(card.dataset.syncTargetId) : null;
         if (!button || !target) return;

         if (button.dataset.offsetChange) {
             TimeSync.adjustOffset(Number(button.dataset.offsetChange), target.id);
             return;
         }

         if (button.classList.contains('sync-target-reset-offset')) {
             TimeSync.resetOffset(target.id, button);
             return;
         }

         if (button.classList.contains('sync-target-use-current')) {
             target.times = collectScheduleBellTimes(Settings.schedule);
             Settings.save();
             TimeSync.renderSyncTargets();
             const nextButton = DOM.syncTargetsContainer?.querySelector(`[data-sync-target-id="${target.id}"] .sync-target-use-current`);
             Utils.showButtonFeedback(nextButton, "Updated!", 1200);
             return;
         }

         if (!button.classList.contains('sync-target-action')) return;

         const nearestEventTime = findNearestTime(target.times);
         if (!nearestEventTime) {
             Utils.showButtonFeedback(button, "No Valid Times!", 2000);
             return;
         }

         TimeSync.applySyncToTime(nearestEventTime, button, `Synced ${formatEventTime(nearestEventTime)}`, target.id);
     },

     updateOffsetDisplay: function() {
         const activeTarget = TimeSync.getActiveSyncTarget();
         const offsetString = formatOffset(activeTarget?.offsetMs);
         if (DOM.currentOffsetDisplay) { // Check if element exists
             DOM.currentOffsetDisplay.textContent = offsetString;
         }
         DOM.syncTargetsContainer?.querySelectorAll('.sync-target-card').forEach((card: HTMLElement) => {
             const target = TimeSync.getSyncTarget(card.dataset.syncTargetId);
             card.classList.toggle('active', target?.id === Settings.preferences.activeSyncTargetId);
             const offsetEl = card.querySelector('.sync-target-offset');
             if (offsetEl && target) offsetEl.textContent = formatOffset(target.offsetMs);
         });
     }
};
