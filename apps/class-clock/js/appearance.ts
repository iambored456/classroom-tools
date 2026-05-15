import { DOM } from './dom.ts';
import { Settings } from './settings.ts';
import { Layout } from './layout.ts';
import { Visuals } from './visuals.ts';
import { ColorSchemes } from './colorSchemes.ts';
import { Utils } from './utils.ts';

const VIEWPORT_STACK_MAX = 100;
const VIEWPORT_STACK_ITEMS = [
    { prefKey: 'sandHeight', min: 8, max: 42 },
    { prefKey: 'scheduleLabelFontSize', min: 1, max: 10 },
    { prefKey: 'timeFontSize', min: 5, max: 36 },
    { prefKey: 'dateFontSize', min: 1, max: 14 }
];
const VIEWPORT_STACK_PREFS = new Set(VIEWPORT_STACK_ITEMS.map(item => item.prefKey));

function getStepPrecision(stepValue: string | number) {
    const stepText = String(stepValue || '');
    if (!stepText || stepText === 'any') return 0;
    const decimalIndex = stepText.indexOf('.');
    return decimalIndex >= 0 ? (stepText.length - decimalIndex - 1) : 0;
}

function formatValueForStep(stepValue: string | number, value: number) {
    const precision = getStepPrecision(stepValue);
    if (precision <= 0) {
        return String(Math.round(value));
    }
    return value.toFixed(precision).replace(/\.?0+$/, '');
}

function formatInputValue(input: HTMLInputElement, value: number) {
    return formatValueForStep(input.step || '', value);
}

function getViewportStackSizes() {
    return VIEWPORT_STACK_ITEMS.map(item => {
        const fallback = Settings.defaultPreferences?.[item.prefKey] ?? item.min;
        const value = Number(Settings.preferences?.[item.prefKey]);
        const safeValue = Number.isFinite(value) ? value : fallback;
        return Math.max(item.min, Math.min(item.max, Math.round(safeValue)));
    });
}

function getViewportStackPositions(sizes = getViewportStackSizes()) {
    const positions = [];
    sizes.reduce((total, size, index) => {
        const nextTotal = total + size;
        positions[index] = Math.max(0, Math.min(VIEWPORT_STACK_MAX, nextTotal));
        return nextTotal;
    }, 0);
    return positions;
}

function syncViewportStackSlider() {
    const sizes = getViewportStackSizes();
    const positions = getViewportStackPositions(sizes);

    VIEWPORT_STACK_ITEMS.forEach((item, index) => {
        const displayValue = formatValueForStep('1', sizes[index]);
        document.querySelectorAll<HTMLElement>(`.multi-slider-thumb[data-stack-index="${index}"]`).forEach(thumb => {
            const percent = Math.max(0, Math.min(VIEWPORT_STACK_MAX, positions[index]));
            thumb.style.setProperty('--thumb-pos', `${percent}%`);
            thumb.setAttribute('aria-valuenow', displayValue);
            thumb.setAttribute('aria-valuetext', `${displayValue} viewport height units`);
        });
    });
}

function syncPreferenceInputs(prefKey: string, value: number) {
    let displayValue = String(value);
    document.querySelectorAll<HTMLInputElement>('input[data-pref]').forEach(input => {
        if (input.dataset.pref !== prefKey || (input.type !== 'number' && input.type !== 'range')) return;
        displayValue = formatInputValue(input, value);
        input.value = displayValue;
        if (input.type === 'range') {
            const min = input.min ? parseFloat(input.min) : 0;
            const max = input.max ? parseFloat(input.max) : 100;
            const percent = max > min ? ((Number(input.value) - min) / (max - min)) * 100 : 0;
            const fill = `${Math.max(0, Math.min(100, percent))}%`;
            input.style.setProperty('--slider-fill', fill);
            input.closest<HTMLElement>('.slider-track-shell')?.style.setProperty('--slider-fill', fill);
        }
    });
    if (VIEWPORT_STACK_PREFS.has(prefKey)) {
        syncViewportStackSlider();
        document.querySelectorAll<HTMLElement>(`[data-multi-pref="${prefKey}"]`).forEach(thumb => {
            displayValue = formatValueForStep(thumb.dataset.step || '1', value);
        });
    }
    document.querySelectorAll<HTMLElement>(`[data-pref-value="${prefKey}"]`).forEach(element => {
        element.textContent = displayValue;
    });
}

function getMultiSliderBoundaryFromClientX(thumb: HTMLElement, clientX: number) {
    const track = thumb.closest<HTMLElement>('[data-multi-slider]')?.querySelector<HTMLElement>('.multi-slider-track');
    if (!track) return null;

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;

    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(percent * VIEWPORT_STACK_MAX);
}

function getStackIndex(thumb: HTMLElement) {
    const index = Number(thumb.dataset.stackIndex);
    if (!Number.isInteger(index) || index < 0 || index >= VIEWPORT_STACK_ITEMS.length) {
        return null;
    }
    return index;
}

function clampBoundaryPosition(index: number, value: number, positions = getViewportStackPositions()) {
    const items = VIEWPORT_STACK_ITEMS;
    let minBoundary = 0;
    let maxBoundary = VIEWPORT_STACK_MAX;

    if (index === 0) {
        minBoundary = Math.max(items[0].min, positions[1] - items[1].max);
        maxBoundary = Math.min(items[0].max, positions[1] - items[1].min);
    } else if (index === 1) {
        minBoundary = Math.max(positions[0] + items[1].min, positions[2] - items[2].max);
        maxBoundary = Math.min(positions[0] + items[1].max, positions[2] - items[2].min);
    } else if (index === 2) {
        minBoundary = Math.max(positions[1] + items[2].min, positions[3] - items[3].max);
        maxBoundary = Math.min(positions[1] + items[2].max, positions[3] - items[3].min);
    } else if (index === 3) {
        minBoundary = positions[2] + items[3].min;
        maxBoundary = Math.min(VIEWPORT_STACK_MAX, positions[2] + items[3].max);
    }

    return Math.max(minBoundary, Math.min(maxBoundary, Math.round(value)));
}

function applyViewportStackBoundary(index: number, boundaryValue: number) {
    if (!Settings.preferences) return;

    const currentSizes = getViewportStackSizes();
    const positions = getViewportStackPositions(currentSizes);
    const nextPositions = [...positions];
    nextPositions[index] = clampBoundaryPosition(index, boundaryValue, positions);

    const nextSizes = [
        nextPositions[0],
        nextPositions[1] - nextPositions[0],
        nextPositions[2] - nextPositions[1],
        nextPositions[3] - nextPositions[2]
    ].map((size, sizeIndex) => {
        const item = VIEWPORT_STACK_ITEMS[sizeIndex];
        return Math.max(item.min, Math.min(item.max, Math.round(size)));
    });

    let changed = false;
    VIEWPORT_STACK_ITEMS.forEach((item, itemIndex) => {
        const nextValue = nextSizes[itemIndex];
        if (Settings.preferences[item.prefKey] !== nextValue) {
            Settings.preferences[item.prefKey] = nextValue;
            changed = true;
        }
        syncPreferenceInputs(item.prefKey, nextValue);
    });

    if (!changed) {
        syncViewportStackSlider();
        return;
    }

    Layout.applyFontAndSizePreferences();
    requestAnimationFrame(() => {
        Visuals.handleDisplayToggle();
    });
    Settings.save();
}

function applyPreferenceValue(prefKey: string, newValue: string | number, min: number, max: number, step: string | number = 1) {
    if (!prefKey || !Settings.preferences || !Settings.defaultPreferences || !Object.prototype.hasOwnProperty.call(Settings.preferences, prefKey)) {
        return;
    }

    let parsedValue = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));
    parsedValue = Number.isNaN(parsedValue)
        ? Settings.defaultPreferences[prefKey]
        : Math.max(min, Math.min(max, parsedValue));
    const precision = getStepPrecision(step);
    if (precision > 0) {
        const factor = 10 ** precision;
        parsedValue = Math.round(parsedValue * factor) / factor;
    } else {
        parsedValue = Math.round(parsedValue);
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

function applyNumericPreference(input: HTMLInputElement, newValue: string | number) {
    const prefKey = input.dataset?.pref;
    if (!prefKey || !Settings.preferences || !Settings.defaultPreferences || !Object.prototype.hasOwnProperty.call(Settings.preferences, prefKey)) {
        return;
    }

    const min = input.min ? parseFloat(input.min) : -Infinity;
    const max = input.max ? parseFloat(input.max) : Infinity;
    applyPreferenceValue(prefKey, newValue, min, max, input.step || 1);
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
        document.querySelectorAll<HTMLElement>('.number-input-wrapper, .slider-stepper').forEach(wrapper => {
            const input = wrapper.querySelector<HTMLInputElement>('input[type="number"], input[type="range"]');
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

        document.querySelectorAll<HTMLElement>('.multi-slider-thumb[data-multi-pref]').forEach(thumb => {
            thumb.addEventListener('pointerdown', event => {
                event.preventDefault();
                thumb.focus();
                thumb.setPointerCapture?.(event.pointerId);
                const updateFromPointer = (pointerEvent: PointerEvent) => {
                    const stackIndex = getStackIndex(thumb);
                    const nextBoundary = getMultiSliderBoundaryFromClientX(thumb, pointerEvent.clientX);
                    if (stackIndex !== null && nextBoundary !== null) {
                        applyViewportStackBoundary(stackIndex, nextBoundary);
                    }
                };
                updateFromPointer(event);
                const handlePointerMove = (pointerEvent: PointerEvent) => updateFromPointer(pointerEvent);
                const stopDragging = (pointerEvent: PointerEvent) => {
                    thumb.releasePointerCapture?.(pointerEvent.pointerId);
                    window.removeEventListener('pointermove', handlePointerMove);
                    window.removeEventListener('pointerup', stopDragging);
                    window.removeEventListener('pointercancel', stopDragging);
                };
                window.addEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointerup', stopDragging);
                window.addEventListener('pointercancel', stopDragging);
            });

            thumb.addEventListener('keydown', event => {
                if (!Settings.preferences) return;
                const stackIndex = getStackIndex(thumb);
                if (stackIndex === null) return;

                const step = thumb.dataset.step ? parseFloat(thumb.dataset.step) : 1;
                const positions = getViewportStackPositions();
                const currentBoundary = positions[stackIndex];
                let nextBoundary = currentBoundary;

                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextBoundary = currentBoundary - step;
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextBoundary = currentBoundary + step;
                if (event.key === 'PageDown') nextBoundary = currentBoundary - step * 5;
                if (event.key === 'PageUp') nextBoundary = currentBoundary + step * 5;
                if (event.key === 'Home') nextBoundary = 0;
                if (event.key === 'End') nextBoundary = VIEWPORT_STACK_MAX;
                if (nextBoundary === currentBoundary) return;

                event.preventDefault();
                applyViewportStackBoundary(stackIndex, nextBoundary);
            });
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

        DOM.resetTimelineVisualizationBtn?.addEventListener('click', Appearance.resetTimelineVisualizationDefaults);
        DOM.resetSchemesBtn?.addEventListener('click', ColorSchemes.resetDefaults);
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

        syncPreferenceInputs('sandWidth', Settings.preferences.sandWidth);
        syncPreferenceInputs('sandHeight', Settings.preferences.sandHeight);
        syncPreferenceInputs('sandParticleSize', Settings.preferences.sandParticleSize);
    },

    resetTimelineVisualizationDefaults: function() {
        if (!confirm("Reset timeline visualization and scale settings to defaults?")) return;
        if (!Settings.preferences || !Settings.defaultPreferences) return;

        Settings.preferences.dateFontSize = Settings.defaultPreferences.dateFontSize;
        Settings.preferences.timeFontSize = Settings.defaultPreferences.timeFontSize;
        Settings.preferences.scheduleLabelFontSize = Settings.defaultPreferences.scheduleLabelFontSize;
        Settings.preferences.sandWidth = Settings.defaultPreferences.sandWidth;
        Settings.preferences.sandHeight = Settings.defaultPreferences.sandHeight;
        Settings.preferences.sandParticleSize = Settings.defaultPreferences.sandParticleSize;
        Appearance.updateInputs();
        Layout.applyFontAndSizePreferences();
        requestAnimationFrame(() => {
            Visuals.handleDisplayToggle();
        });
        Settings.save();
        Utils.showButtonFeedback(DOM.resetTimelineVisualizationBtn, "Reset!");
    }
};
