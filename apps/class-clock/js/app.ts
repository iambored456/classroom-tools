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

export const App = {
    fillResizeFrameId: null,
    fillResizeObserver: null,

    init: function() {
        console.log("Classroom Clock Initializing...");
        // 1. Update DOM Cache (needs DOM ready)
        updateDOMCache();

        // 2. Load Settings
        Settings.load();

        // 3. Initialize UI Inputs based on Settings
        Appearance.updateInputs();
        ColorSchemes.renderTabs();
        Schedule.renderTable();
        TimeSync.updateOffsetDisplay();

        // 4. Attach Event Listeners
        Appearance.attachListeners();
        ColorSchemes.attachListeners();
        Schedule.attachListeners();
        Alerts.attachListeners();
        TimeSync.attachListeners();
        App.attachGlobalListeners();

        // 5. Apply Initial Layout (makes containers visible if settings allow)
        Layout.update();

        // 6. Initialize Visuals (Physics needs layout applied first for dimensions)
        // Visuals.handleDisplayToggle() will check settings and setup physics if needed
        Visuals.handleDisplayToggle();

        // 7. Start the Clock
        Clock.start();

        console.log("Classroom Clock Initialized.");
    },

    attachGlobalListeners: function() {
         // Settings Menu Toggle Button
         DOM.menuToggle?.addEventListener("click", () => {
             const isOpen = DOM.settingsMenu?.classList.toggle("open");
             if (DOM.menuToggle) { // Check if toggle button exists
                 DOM.menuToggle.innerHTML = isOpen ? "▲" : "▼"; // Update chevron
             }
         });

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
        document.addEventListener("fullscreenchange", App.scheduleFillLayoutRefresh);

        if (typeof ResizeObserver === 'function') {
            App.fillResizeObserver = new ResizeObserver(() => {
                App.scheduleFillLayoutRefresh();
            });
            DOM.sandBarsContainerEl && App.fillResizeObserver.observe(DOM.sandBarsContainerEl);
            DOM.waterFillContainerEl && App.fillResizeObserver.observe(DOM.waterFillContainerEl);
            DOM.stageVisualizationContainerEl && App.fillResizeObserver.observe(DOM.stageVisualizationContainerEl);
        }
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
