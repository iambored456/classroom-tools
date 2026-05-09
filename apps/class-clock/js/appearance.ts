import { DOM } from './dom.ts';
import { Settings } from './settings.ts';
import { Layout } from './layout.ts';
import { Visuals } from './visuals.ts';
import { ColorSchemes } from './colorSchemes.ts';
import { Utils } from './utils.ts';

function shouldShowVisualizationSettings() {
    const mode = Settings.getVisualizationMode();
    return mode !== 'none';
}

function getInputPrecision(input: HTMLInputElement) {
    const stepValue = input.step || '';
    if (!stepValue || stepValue === 'any') return 0;
    const decimalIndex = stepValue.indexOf('.');
    return decimalIndex >= 0 ? (stepValue.length - decimalIndex - 1) : 0;
}

function formatInputValue(input: HTMLInputElement, value: number) {
    const precision = getInputPrecision(input);
    if (precision <= 0) {
        return String(Math.round(value));
    }
    return value.toFixed(precision).replace(/\.?0+$/, '');
}

function syncPreferenceInputs(prefKey: string, value: number) {
    document.querySelectorAll<HTMLInputElement>('input[data-pref]').forEach(input => {
        if (input.dataset.pref !== prefKey || (input.type !== 'number' && input.type !== 'range')) return;
        input.value = formatInputValue(input, value);
    });
}

function applyNumericPreference(input: HTMLInputElement, newValue: string | number) {
    const prefKey = input.dataset?.pref;
    if (!prefKey || !Settings.preferences || !Settings.defaultPreferences || !Object.prototype.hasOwnProperty.call(Settings.preferences, prefKey)) {
        return;
    }

    const min = input.min ? parseFloat(input.min) : -Infinity;
    const max = input.max ? parseFloat(input.max) : Infinity;
    let parsedValue = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    parsedValue = Number.isNaN(parsedValue)
        ? Settings.defaultPreferences[prefKey]
        : Math.max(min, Math.min(max, parsedValue));
    const precision = getInputPrecision(input);
    if (precision > 0) {
        const factor = 10 ** precision;
        parsedValue = Math.round(parsedValue * factor) / factor;
    }

    syncPreferenceInputs(prefKey, parsedValue);

    if (Settings.preferences[prefKey] !== parsedValue) {
        Settings.preferences[prefKey] = parsedValue;
        Layout.applyFontAndSizePreferences();

        if (['sandWidth', 'sandHeight', 'sandParticleSize'].includes(prefKey)) {
            requestAnimationFrame(() => {
                Visuals.handleDisplayToggle();
            });
        }

        Settings.save();
    }
}

function applyVisualizationMode(mode: string) {
    if (!Settings.preferences) return;

    Settings.preferences.visualizationMode = mode;
    Settings.applyVisualizationModePreferences();
    Appearance.updateInputs();
    Layout.update();
    Visuals.handleDisplayToggle();
    Settings.save();
}

export const Appearance = {
    attachListeners: function() {
        document.querySelectorAll<HTMLElement>('.number-input-wrapper').forEach(wrapper => {
            const input = wrapper.querySelector<HTMLInputElement>('input[type="number"]');
            const minusBtn = wrapper.querySelector<HTMLButtonElement>('.num-btn.minus');
            const plusBtn = wrapper.querySelector<HTMLButtonElement>('.num-btn.plus');
            if (!input || !input.dataset || !input.dataset.pref || !minusBtn || !plusBtn) {
                return;
            }

            const prefKey = input.dataset.pref;
            let intervalId = null;
            let timeoutId = null;
            const HOLD_DELAY = 500;
            const HOLD_INTERVAL = 100;

            if (!Settings.preferences || !Settings.defaultPreferences || !Object.prototype.hasOwnProperty.call(Settings.preferences, prefKey)) {
                console.warn(`Preference key "${prefKey}" not found in settings for input ${input.id}`);
                return;
            }

            const startRepeating = (stepValue) => {
                const currentValue = parseFloat(input.value);
                applyNumericPreference(input, (Number.isFinite(currentValue) ? currentValue : Settings.preferences[prefKey]) + stepValue);
                stopRepeating();
                timeoutId = setTimeout(() => {
                    intervalId = setInterval(() => {
                        const repeatedValue = parseFloat(input.value);
                        applyNumericPreference(input, (Number.isFinite(repeatedValue) ? repeatedValue : Settings.preferences[prefKey]) + stepValue);
                    }, HOLD_INTERVAL);
                }, HOLD_DELAY);
            };

            const stopRepeating = () => {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                timeoutId = null;
                intervalId = null;
            };

            input.addEventListener("change", () => applyNumericPreference(input, input.value));
            minusBtn.addEventListener("mousedown", () => startRepeating(-(parseFloat(input.step) || 1)));
            plusBtn.addEventListener("mousedown", () => startRepeating(parseFloat(input.step) || 1));
            ["mouseup", "mouseleave", "blur", "touchend", "touchcancel"].forEach(eventName => {
                minusBtn.addEventListener(eventName, stopRepeating);
                plusBtn.addEventListener(eventName, stopRepeating);
            });
        });

        document.querySelectorAll<HTMLInputElement>('input[type="range"][data-pref]').forEach(slider => {
            slider.addEventListener('input', () => applyNumericPreference(slider, slider.value));
            slider.addEventListener('change', () => applyNumericPreference(slider, slider.value));
        });

        const displayChecklist = DOM.displayElementsChecklist as HTMLElement | null;
        displayChecklist?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', Appearance.handleDisplayToggleChange);
        });

        document.querySelectorAll<HTMLElement>('.visualization-mode-card').forEach(card => {
            card.addEventListener('pointerdown', Appearance.captureVisualizationModeSelectionState);
            card.addEventListener('keydown', Appearance.handleVisualizationModeKeyDown);
        });

        DOM.visualizationModeInputs?.forEach((input: HTMLInputElement) => {
            input.addEventListener('click', Appearance.handleVisualizationModeClick);
            input.addEventListener('change', Appearance.handleVisualizationModeChange);
        });

        DOM.resetAppearanceBtn?.addEventListener('click', Appearance.resetFontAndSizeDefaults);
        DOM.resetSchemesBtn?.addEventListener('click', ColorSchemes.resetDefaults);
        document.getElementById('reset-sandbar-defaults')?.addEventListener('click', Appearance.resetVisualizationDefaults);
    },

    handleDisplayToggleChange: function(this: HTMLInputElement) {
        const prefName = this.dataset.pref;
        if (!prefName || !Settings.preferences || !Object.prototype.hasOwnProperty.call(Settings.preferences, prefName)) return;

        Settings.preferences[prefName] = this.checked;
        Layout.update();
        Settings.save();
    },

    handleVisualizationModeChange: function(this: HTMLInputElement) {
        if (!this.checked || !Settings.preferences) return;

        applyVisualizationMode(this.value);
    },

    captureVisualizationModeSelectionState: function(this: HTMLElement) {
        const input = this.querySelector<HTMLInputElement>('input[name="visualization-mode"]');
        if (!input) return;
        input.dataset.wasChecked = String(input.checked);
    },

    handleVisualizationModeClick: function(this: HTMLInputElement) {
        if (this.dataset.wasChecked !== 'true') return;

        this.checked = false;
        this.dataset.wasChecked = 'false';
        applyVisualizationMode('none');
    },

    handleVisualizationModeKeyDown: function(this: HTMLElement, event: KeyboardEvent) {
        if (event.key !== ' ' && event.key !== 'Enter') return;

        const input = this.querySelector<HTMLInputElement>('input[name="visualization-mode"]');
        if (!input?.checked) return;

        event.preventDefault();
        input.checked = false;
        input.dataset.wasChecked = 'false';
        applyVisualizationMode('none');
    },

    updateVisualizationSettingsVisibility: function() {
        DOM.visualizationSettingsSection?.classList.toggle('element-hidden', !shouldShowVisualizationSettings());
    },

    updateInputs: function() {
        if (!Settings.preferences) return;

        syncPreferenceInputs('dateFontSize', Settings.preferences.dateFontSize);
        syncPreferenceInputs('timeFontSize', Settings.preferences.timeFontSize);
        syncPreferenceInputs('scheduleLabelFontSize', Settings.preferences.scheduleLabelFontSize);

        const displayChecklist = DOM.displayElementsChecklist as HTMLElement | null;
        displayChecklist?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
            const prefName = checkbox.dataset.pref;
            if (prefName && Object.prototype.hasOwnProperty.call(Settings.preferences, prefName)) {
                checkbox.checked = !!Settings.preferences[prefName];
            }
        });

        const activeMode = Settings.getVisualizationMode();
        DOM.visualizationModeInputs?.forEach((input: HTMLInputElement) => {
            input.checked = input.value === activeMode;
        });

        const widthInput = document.getElementById('pref-sand-width') as HTMLInputElement | null;
        const heightInput = document.getElementById('pref-sand-height') as HTMLInputElement | null;
        const sizeInput = document.getElementById('pref-sand-particle-size') as HTMLInputElement | null;
        if (widthInput) syncPreferenceInputs('sandWidth', Settings.preferences.sandWidth);
        if (heightInput) syncPreferenceInputs('sandHeight', Settings.preferences.sandHeight);
        if (sizeInput) syncPreferenceInputs('sandParticleSize', Settings.preferences.sandParticleSize);

        Appearance.updateVisualizationSettingsVisibility();
    },

    resetFontAndSizeDefaults: function() {
        if (!confirm("Reset typography percentage settings to defaults?")) return;
        if (!Settings.preferences || !Settings.defaultPreferences) return;

        Settings.preferences.dateFontSize = Settings.defaultPreferences.dateFontSize;
        Settings.preferences.timeFontSize = Settings.defaultPreferences.timeFontSize;
        Settings.preferences.scheduleLabelFontSize = Settings.defaultPreferences.scheduleLabelFontSize;
        Appearance.updateInputs();
        Layout.applyFontAndSizePreferences();
        Settings.save();
        Utils.showButtonFeedback(DOM.resetAppearanceBtn, "Reset!");
    },

    resetVisualizationDefaults: function() {
        if (!confirm("Reset timeline visualization layout settings to defaults?")) return;
        if (!Settings.preferences || !Settings.defaultPreferences) return;

        Settings.preferences.sandWidth = Settings.defaultPreferences.sandWidth;
        Settings.preferences.sandHeight = Settings.defaultPreferences.sandHeight;
        Settings.preferences.sandParticleSize = Settings.defaultPreferences.sandParticleSize;
        Appearance.updateInputs();

        if (shouldShowVisualizationSettings()) {
            requestAnimationFrame(() => {
                Visuals.handleDisplayToggle();
            });
        }

        Settings.save();
        Utils.showButtonFeedback(document.getElementById('reset-sandbar-defaults'), "Reset!");
    }
};
