/** js/app.js */
// Import all necessary modules
import { updateDOMCache, DOM } from './dom.ts'; // Import the function and the variable
import { Settings } from './settings.ts';
import { Appearance } from './appearance.ts';
import { ColorSchemes } from './colorSchemes.ts';
import { Schedule } from './schedule.ts';
import { Alerts } from './alerts.ts';
import { TimeSync } from './timeSync.ts';
import { Layout } from './layout.ts';
import { Clock } from './clock.ts';
import { State } from './state.ts';
import { Visuals } from './visuals.ts';

const MENU_OPEN_ICON = '\u25B2';
const MENU_CLOSED_ICON = '\u25BC';
const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];

export const App = {
    fillResizeFrameId: null,
    fillResizeObserver: null,
    controlsReady: false,

    init: function() {
        updateDOMCache();

        Settings.load();

        Layout.update();

        Clock.start();
        App.scheduleDeferredControlsInit();
    },

    scheduleDeferredControlsInit: function() {
        if (App.controlsReady) return;

        requestAnimationFrame(() => {
            const runDeferredInit = () => {
                if (App.controlsReady) return;
                App.controlsReady = true;

                Appearance.updateInputs();
                ColorSchemes.renderTabs();
                Schedule.renderTable();
                TimeSync.updateOffsetDisplay();

                Appearance.attachListeners();
                ColorSchemes.attachListeners();
                Schedule.attachListeners();
                Alerts.attachListeners();
                TimeSync.attachListeners();
                App.attachGlobalListeners();

                if (State.currentPeriodIndex === null && !Settings.isProgressBarMode() && Settings.hasTimelineVisualization()) {
                    Visuals.handleDisplayToggle();
                }
            };

            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(runDeferredInit, { timeout: 500 });
                return;
            }

            window.setTimeout(runDeferredInit, 0);
        });
    },

    attachGlobalListeners: function() {
        // Settings Menu Toggle Button
        DOM.menuToggle?.addEventListener("click", () => {
            const isOpen = DOM.settingsMenu?.classList.contains("open");
            App.setSettingsMenuOpen(!isOpen);
        });
        DOM.navHomeButton?.addEventListener("click", App.goToHub);
        DOM.navFullscreenButton?.addEventListener("click", App.handleFullscreenButtonClick);
        App.updateMenuToggleState();
        App.syncFullscreenButtonState();

        // Settings Menu Resizer Handles
        DOM.menuResizer?.addEventListener("mousedown", App.handleResizeMouseDown);
        document.addEventListener("mousemove", App.handleResizeMouseMove);
        document.addEventListener("mouseup", App.handleResizeMouseUp);
        document.addEventListener("mouseleave", App.handleResizeMouseUp);

        // Main Settings Tabs (Appearance / Schedule & Alerts)
        DOM.tabsContainer?.querySelectorAll(".tab-button").forEach(button => {
            button.addEventListener("click", App.handleTabClick);
        });

        window.addEventListener("resize", App.scheduleFillLayoutRefresh);
        window.addEventListener("orientationchange", App.scheduleFillLayoutRefresh);
        FULLSCREEN_EVENTS.forEach(eventName => {
            document.addEventListener(eventName, App.handleFullscreenChange);
        });

        if (typeof ResizeObserver === 'function') {
            App.fillResizeObserver = new ResizeObserver(() => {
                App.scheduleFillLayoutRefresh();
            });
            DOM.sandBarsContainerEl && App.fillResizeObserver.observe(DOM.sandBarsContainerEl);
            DOM.waterFillContainerEl && App.fillResizeObserver.observe(DOM.waterFillContainerEl);
            DOM.stageVisualizationContainerEl && App.fillResizeObserver.observe(DOM.stageVisualizationContainerEl);
        }
    },

    setSettingsMenuOpen: function(isOpen) {
        DOM.settingsMenu?.classList.toggle("open", Boolean(isOpen));
        App.updateMenuToggleState(Boolean(isOpen));
    },

    updateMenuToggleState: function(isOpen = DOM.settingsMenu?.classList.contains("open")) {
        if (!DOM.menuToggle) return;
        DOM.menuToggle.textContent = isOpen ? MENU_OPEN_ICON : MENU_CLOSED_ICON;
    },

    goToHub: function() {
        window.location.assign(App.resolveHubUrl());
    },

    resolveHubUrl: function() {
        const baseUrl = typeof import.meta.env.BASE_URL === 'string' ? import.meta.env.BASE_URL : '';
        let hubPath = baseUrl.replace(/class-clock\/?$/, '');

        if (hubPath === baseUrl) {
            hubPath = window.location.pathname.replace(/class-clock(?:\/.*)?$/, '');
        }

        if (!hubPath) hubPath = '/';
        if (!hubPath.startsWith('/')) hubPath = `/${hubPath}`;
        if (!hubPath.endsWith('/')) hubPath = `${hubPath}/`;

        const hubUrl = new URL(hubPath, window.location.origin);
        if (import.meta.env.DEV && window.location.port === '5174') {
            hubUrl.port = '5173';
        }

        return hubUrl.toString();
    },

    handleFullscreenButtonClick: function() {
        if (App.isFullscreenActive()) {
            App.exitFullscreen();
            return;
        }

        const requestStarted = App.requestFullscreen();
        if (requestStarted) {
            App.setSettingsMenuOpen(false);
        }
    },

    handleFullscreenChange: function() {
        App.syncFullscreenButtonState();
        App.scheduleFillLayoutRefresh();
    },

    isFullscreenActive: function() {
        const fullscreenDocument = document as any;
        return Boolean(
            document.fullscreenElement ||
            fullscreenDocument.webkitFullscreenElement ||
            fullscreenDocument.mozFullScreenElement ||
            fullscreenDocument.msFullscreenElement ||
            fullscreenDocument.webkitIsFullScreen
        );
    },

    syncFullscreenButtonState: function() {
        if (!DOM.navFullscreenButton) return;
        const isFullscreen = App.isFullscreenActive();
        const buttonLabel = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

        DOM.navFullscreenButton.classList.toggle('is-active', isFullscreen);
        DOM.navFullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
        DOM.navFullscreenButton.setAttribute('aria-label', buttonLabel);
        DOM.navFullscreenButton.title = buttonLabel;
    },

    requestFullscreen: function() {
        const targets = [document.documentElement, document.body, DOM.clockDisplayArea].filter(Boolean);

        for (const element of targets) {
            const fullscreenElement = element as any;

            try {
                let requestResult = null;

                if (typeof fullscreenElement.requestFullscreen === 'function') {
                    requestResult = fullscreenElement.requestFullscreen({ navigationUI: 'hide' });
                } else if (typeof fullscreenElement.webkitRequestFullscreen === 'function') {
                    requestResult = fullscreenElement.webkitRequestFullscreen();
                } else if (typeof fullscreenElement.mozRequestFullScreen === 'function') {
                    requestResult = fullscreenElement.mozRequestFullScreen();
                } else if (typeof fullscreenElement.msRequestFullscreen === 'function') {
                    requestResult = fullscreenElement.msRequestFullscreen();
                } else {
                    continue;
                }

                if (requestResult && typeof requestResult.then === 'function') {
                    requestResult
                        .then(() => {
                            App.tryLockCurrentOrientation();
                            App.handleFullscreenChange();
                        })
                        .catch((error) => {
                            console.warn('Fullscreen request was rejected.', error);
                            App.syncFullscreenButtonState();
                        });
                } else {
                    App.tryLockCurrentOrientation();
                    App.handleFullscreenChange();
                }

                return true;
            } catch (error) {
                console.warn('Fullscreen request failed on target.', error);
            }
        }

        return false;
    },

    exitFullscreen: function() {
        const fullscreenDocument = document as any;

        try {
            let exitResult = null;

            if (typeof document.exitFullscreen === 'function') {
                exitResult = document.exitFullscreen();
            } else if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
                exitResult = fullscreenDocument.webkitExitFullscreen();
            } else if (typeof fullscreenDocument.mozCancelFullScreen === 'function') {
                exitResult = fullscreenDocument.mozCancelFullScreen();
            } else if (typeof fullscreenDocument.msExitFullscreen === 'function') {
                exitResult = fullscreenDocument.msExitFullscreen();
            } else {
                return false;
            }

            if (exitResult && typeof exitResult.then === 'function') {
                exitResult
                    .then(() => {
                        App.handleFullscreenChange();
                    })
                    .catch((error) => {
                        console.warn('Exiting fullscreen was rejected.', error);
                        App.syncFullscreenButtonState();
                    });
            } else {
                App.handleFullscreenChange();
            }

            return true;
        } catch (error) {
            console.warn('Exiting fullscreen failed.', error);
            return false;
        }
    },

    tryLockCurrentOrientation: function() {
        const orientation = window.screen?.orientation as any;
        if (!orientation || typeof orientation.lock !== 'function') return;

        const currentType = typeof orientation.type === 'string' ? orientation.type : '';
        const preferredLock =
            currentType.startsWith('portrait') ? 'portrait' :
            currentType.startsWith('landscape') ? 'landscape' :
            null;

        if (!preferredLock) return;

        Promise.resolve(orientation.lock(preferredLock)).catch(() => {
            // Browsers commonly reject orientation lock even after fullscreen.
        });
    },

    handleTabClick: function() { // 'this' refers to the clicked tab button
         if (!DOM.tabsContainer || !DOM.tabContentsContainer) return;
         DOM.tabsContainer.querySelectorAll(".tab-button.active").forEach(btn => btn.classList.remove("active"));
         DOM.tabContentsContainer.querySelectorAll(".tab-content.active").forEach(content => content.classList.remove("active"));
         this.classList.add("active");
         const tabId = this.getAttribute("data-tab");
         if (tabId) {
             const targetContent = DOM.tabContentsContainer.querySelector(`#${tabId}`);
             if (targetContent) targetContent.classList.add("active");
         }
    },

    scheduleFillLayoutRefresh: function() {
        if (App.fillResizeFrameId) return;
        App.fillResizeFrameId = requestAnimationFrame(() => {
            App.fillResizeFrameId = null;
            Layout.applyFontAndSizePreferences();
            Visuals.refreshActiveFillLayout();
        });
    },

    // --- Menu Resizer Handlers ---
    handleResizeMouseDown: function(e) {
          State.isResizingMenu = true;
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = 'none';
          document.body.style.setProperty('-webkit-user-select', 'none');
     },
     handleResizeMouseMove: function(e) {
          if (!State.isResizingMenu || !DOM.settingsMenu) return;
          const newWidth = window.innerWidth - e.clientX;
          const minWidth = 400;
          const maxWidth = Math.min(950, window.innerWidth - 50);
          if (newWidth >= minWidth && newWidth <= maxWidth) {
              DOM.settingsMenu.style.width = newWidth + "px";
          }
     },
     handleResizeMouseUp: function(e) {
          if (State.isResizingMenu) {
              State.isResizingMenu = false;
              document.body.style.cursor = "default";
              document.body.style.userSelect = '';
              document.body.style.removeProperty('-webkit-user-select');
          }
     }
};
