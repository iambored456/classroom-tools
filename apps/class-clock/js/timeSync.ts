/** js/timeSync.js */
import { DOM } from './dom.ts';
import { Settings } from './settings.ts';
import { Clock } from './clock.ts';
import { Utils } from './utils.ts';
import { Schedule } from './schedule.ts';
import { State } from './state.ts';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function getValidScheduleTimes(schedule) {
    const times = [];
    const addTime = (time) => {
        if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) && !times.includes(time)) {
            times.push(time);
        }
    };

    (Array.isArray(schedule) ? schedule : []).forEach(row => {
        addTime(row?.start);
        addTime(row?.end);
    });

    return times;
}

function getNearestScheduleTime(schedule, systemNow = new Date()) {
    const times = getValidScheduleTimes(schedule);
    let nearest = null;
    let nearestDiff = Infinity;

    times.forEach(time => {
        const baseTime = Utils.getTodayTime(time);
        [-1, 0, 1].forEach(dayOffset => {
            const candidate = new Date(baseTime.getTime());
            candidate.setDate(candidate.getDate() + dayOffset);
            const diff = Math.abs(candidate.getTime() - systemNow.getTime());
            if (diff < nearestDiff) {
                nearestDiff = diff;
                nearest = { time, date: candidate };
            }
        });
    });

    return nearest;
}

export const TimeSync = {
     editingTargetId: null,

     attachListeners: function() {
         TimeSync.renderSyncTargets();
         DOM.syncTargetsContainer?.addEventListener("click", TimeSync.handleSyncTargetClick);
         DOM.syncTargetsContainer?.addEventListener("input", TimeSync.handleSyncTargetInput);
         DOM.syncTargetsContainer?.addEventListener("change", TimeSync.handleSyncTargetChange);
         DOM.syncTargetsContainer?.addEventListener("keydown", TimeSync.handleSyncTargetKeyDown);
         DOM.syncTargetsContainer?.addEventListener("focusout", TimeSync.handleSyncTargetFocusOut);
     },

     adjustOffset: function(changeMs, targetId = Settings.preferences.activeSyncTargetId) {
         const target = TimeSync.getSyncTarget(targetId);
         if (!target) return;
         Settings.setSyncTargetOffsetMs(target.id, (Number(target.offsetMs) || 0) + changeMs);
         TimeSync.updateOffsetDisplay(); // Update UI display
         Clock.update(); // Reflect time change immediately
         Settings.save(); // Persist the new offset
     },

     resetOffset: function(targetId = Settings.preferences.activeSyncTargetId, button = null) {
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

     ensureSyncTargets: function() {
         return Settings.getSyncTargets();
     },

     getSyncTarget: function(targetId) {
         return TimeSync.ensureSyncTargets().find(target => target.id === targetId);
     },

     getActiveSyncTarget: function() {
         return Settings.getActiveSyncTarget();
     },

     renderSyncTargets: function() {
         if (!DOM.syncTargetsContainer) return;
         Schedule.updateTitle();
         const targets = TimeSync.ensureSyncTargets();
         DOM.syncTargetsContainer.innerHTML = targets.map(target => {
             const safeId = escapeHtml(target.id);
             const safeLabel = escapeHtml(target.label);
             const offsetString = formatOffset(target.offsetMs);
             const isActive = target.id === Settings.preferences.activeSyncTargetId;
             const isEditing = TimeSync.editingTargetId === target.id;
             return `
                 <div class="school-sync-row${isActive ? ' active' : ''}" data-sync-target-id="${safeId}">
                     <div class="school-sync-main">
                         <button class="school-sync-edit" type="button" aria-label="Edit ${safeLabel} name" title="Edit school name">&#9999;&#65039;</button>
                         ${isEditing
                             ? `<input class="school-sync-name-input" type="text" value="${safeLabel}" data-sync-target-field="label" aria-label="School name">`
                             : `<button class="school-sync-button" type="button" aria-pressed="${isActive ? 'true' : 'false'}">${safeLabel}</button>`
                         }
                     </div>
                     <div class="school-sync-offset-panel" aria-label="${safeLabel} clock offset">
                         <span class="school-sync-offset-label">Bell Offset</span>
                         <span class="school-sync-offset-value">${offsetString}</span>
                         <div class="school-sync-offset-controls">
                             <button type="button" data-offset-change="-60000" title="Decrease ${safeLabel} minute offset">-</button>
                             <span>Min</span>
                             <button type="button" data-offset-change="60000" title="Increase ${safeLabel} minute offset">+</button>
                             <button type="button" data-offset-change="-1000" title="Decrease ${safeLabel} second offset">-</button>
                             <span>Sec</span>
                             <button type="button" data-offset-change="1000" title="Increase ${safeLabel} second offset">+</button>
                             <button class="school-sync-reset-offset" type="button" title="Reset ${safeLabel} offset to zero">Reset</button>
                             <button class="school-sync-to-bell" type="button" title="Sync ${safeLabel} to the nearest class schedule bell">Sync to Bell</button>
                         </div>
                     </div>
                 </div>`;
         }).join('');
         if (TimeSync.editingTargetId) {
             requestAnimationFrame(() => {
                 const input = DOM.syncTargetsContainer?.querySelector(`[data-sync-target-id="${TimeSync.editingTargetId}"] .school-sync-name-input`) as HTMLInputElement | null;
                 input?.focus();
                 input?.select();
             });
         }
     },

     handleSyncTargetInput: function(e) {
         const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
         const row = targetElement.closest?.('.school-sync-row') as HTMLElement | null;
         const target = row ? TimeSync.getSyncTarget(row.dataset.syncTargetId) : null;
         if (!target || targetElement.dataset.syncTargetField !== 'label') return;

         target.label = targetElement.value.trim() || 'School';
     },

     handleSyncTargetChange: function(e) {
         const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
         const row = targetElement.closest?.('.school-sync-row') as HTMLElement | null;
         const target = row ? TimeSync.getSyncTarget(row.dataset.syncTargetId) : null;
         if (!target || !targetElement.dataset.syncTargetField) return;

         if (targetElement.dataset.syncTargetField === 'label') {
             target.label = targetElement.value.trim() || 'School';
             targetElement.value = target.label;
             TimeSync.editingTargetId = null;
             TimeSync.renderSyncTargets();
             Schedule.updateTitle();
         }

         Settings.save();
     },

     handleSyncTargetClick: function(e) {
         const button = (e.target as HTMLElement).closest?.('button') as HTMLButtonElement | null;
         const row = button?.closest?.('.school-sync-row') as HTMLElement | null;
         const target = row ? TimeSync.getSyncTarget(row.dataset.syncTargetId) : null;
         if (!button || !target) return;

         if (button.dataset.offsetChange) {
             TimeSync.adjustOffset(Number(button.dataset.offsetChange), target.id);
             return;
         }

         if (button.classList.contains('school-sync-reset-offset')) {
             TimeSync.resetOffset(target.id, button);
             return;
         }

         if (button.classList.contains('school-sync-to-bell')) {
             TimeSync.syncToNearestScheduleBell(target.id, button);
             return;
         }

         if (button.classList.contains('school-sync-edit')) {
             TimeSync.editingTargetId = target.id;
             TimeSync.renderSyncTargets();
             return;
         }

         if (!button.classList.contains('school-sync-button')) return;
         if (target.id === Settings.preferences.activeSyncTargetId) {
             return;
         }

         Settings.setActiveSyncTargetId(target.id);
         State.selectedScheduleRowIndex = null;
         State.currentPeriodIndex = null;
         State.currentPeriodLabel = null;
         Schedule.renderTable();
         TimeSync.renderSyncTargets();
         Clock.update();
         Settings.save();
     },

     syncToNearestScheduleBell: function(targetId, button) {
         const target = TimeSync.getSyncTarget(targetId);
         if (!target) return;

         const isActiveTarget = target.id === Settings.preferences.activeSyncTargetId;
         const schedule = isActiveTarget ? Settings.schedule : target.schedule;
         const systemNow = new Date();
         const nearest = getNearestScheduleTime(schedule, systemNow);

         if (!nearest) {
             Utils.showButtonFeedback(button, "No Bells!", 1500);
             return;
         }

         Settings.setSyncTargetOffsetMs(target.id, nearest.date.getTime() - systemNow.getTime());
         TimeSync.updateOffsetDisplay();
         Clock.update();
         Settings.save();
         Utils.showButtonFeedback(button, `Synced ${nearest.time}`, 1600);
     },

     handleSyncTargetKeyDown: function(e) {
         const input = e.target as HTMLInputElement;
         if (!input?.classList?.contains('school-sync-name-input')) return;
         if (e.key === 'Enter') {
             e.preventDefault();
             input.dispatchEvent(new Event('change', { bubbles: true }));
         }
         if (e.key === 'Escape') {
             e.preventDefault();
             TimeSync.editingTargetId = null;
             TimeSync.renderSyncTargets();
         }
     },

     handleSyncTargetFocusOut: function(e) {
         const input = e.target as HTMLInputElement;
         if (!input?.classList?.contains('school-sync-name-input')) return;
         input.dispatchEvent(new Event('change', { bubbles: true }));
     },

     updateOffsetDisplay: function() {
         DOM.syncTargetsContainer?.querySelectorAll('.school-sync-row').forEach((row: HTMLElement) => {
             const target = TimeSync.getSyncTarget(row.dataset.syncTargetId);
             row.classList.toggle('active', target?.id === Settings.preferences.activeSyncTargetId);
             const schoolButton = row.querySelector('.school-sync-button') as HTMLButtonElement | null;
             if (schoolButton && target) {
                 schoolButton.setAttribute('aria-pressed', target.id === Settings.preferences.activeSyncTargetId ? 'true' : 'false');
             }
             const offsetEl = row.querySelector('.school-sync-offset-value');
             if (offsetEl && target) offsetEl.textContent = formatOffset(target.offsetMs);
         });
     }
};
