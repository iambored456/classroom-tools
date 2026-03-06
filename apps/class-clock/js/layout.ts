import { Settings } from './settings.ts';
import { DOM } from './dom.ts';
import { Visuals } from './visuals.ts';

export const Layout = {
    update: function() {
        const prefs = Settings.preferences;
        if (!DOM.clockDisplayArea) {
            console.warn("DOM cache not ready in Layout.update");
            return;
        }

        [
            { el: DOM.dateEl, pref: 'showDate' },
            { el: DOM.timeEl, pref: 'showTime' }
        ].forEach(item => {
            item.el?.classList.toggle('element-hidden', !prefs[item.pref]);
        });

        Visuals.updateScheduleCirclesVisibility();

        const showPeriodInfo = prefs.showScheduleLabel || Settings.hasTimelineVisualization();
        DOM.periodContainerEl?.classList.toggle('element-hidden', !showPeriodInfo);
        if (showPeriodInfo) {
            DOM.periodLabelEl?.classList.toggle('element-hidden', !prefs.showScheduleLabel);
        } else {
            DOM.periodLabelEl?.classList.add('element-hidden');
        }

        const mode = Settings.getVisualizationMode();
        const showProgress = mode === 'progress';
        const showSand = mode === 'sand';
        const showWater = mode === 'water';
        const showStage = Settings.isStageVisualizationMode();

        DOM.progressBarEl?.classList.toggle('element-hidden', !showProgress);
        DOM.sandBarsContainerEl?.classList.toggle('element-hidden', !showSand);
        DOM.waterFillContainerEl?.classList.toggle('element-hidden', !showWater);
        DOM.stageVisualizationContainerEl?.classList.toggle('element-hidden', !showStage);
        DOM.stageVisualizationContainerEl?.classList.toggle('candle-mode', showStage && mode === 'candle');

        if (DOM.sandBarsCanvas) DOM.sandBarsCanvas.style.display = showSand ? 'block' : 'none';
        if (DOM.waterFillCanvas) DOM.waterFillCanvas.style.display = showWater ? 'block' : 'none';
        if (DOM.stageVisualizationCanvas) DOM.stageVisualizationCanvas.style.display = showStage ? 'block' : 'none';

        Layout.applyFontAndSizePreferences();
    },

    applyFontAndSizePreferences: function() {
        const prefs = Settings.preferences;
        if (!DOM.clockDisplayArea) return;
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--clock-pref-date-size', String(Math.max(1, Math.min(14, prefs.dateFontSize))));
        rootStyle.setProperty('--clock-pref-time-size', String(Math.max(5, Math.min(36, prefs.timeFontSize))));
        rootStyle.setProperty('--clock-pref-label-size', String(Math.max(1, Math.min(10, prefs.scheduleLabelFontSize))));
        rootStyle.setProperty('--clock-pref-detail-size', String(Math.max(1, Math.min(20, prefs.sandParticleSize))));
        rootStyle.setProperty('--clock-pref-timeline-height', String(Math.max(8, Math.min(42, prefs.sandHeight))));
        rootStyle.setProperty('--clock-pref-timeline-width', String(Math.max(20, Math.min(100, prefs.sandWidth))));

        document.body.style.fontFamily = "'Atkinson Hyperlegible Next', Arial, sans-serif";

        if (DOM.scheduleCirclesDisplayEl) {
            Visuals.renderScheduleCircles();
        }
    }
};
