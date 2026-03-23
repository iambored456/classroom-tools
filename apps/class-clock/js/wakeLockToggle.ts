import { DOM } from './dom.ts';
import { WakeLock, type WakeLockSnapshot } from './wakeLock.ts';

function getStatusMessage(snapshot: WakeLockSnapshot) {
    if (!snapshot.isSupported) {
        return 'Not supported in this browser.';
    }

    switch (snapshot.status) {
        case 'requesting':
            return 'Requesting screen wake lock...';
        case 'active':
            return 'Screen wake lock is active while this tab stays visible.';
        case 'released':
            return snapshot.isEnabled
                ? 'The browser released the wake lock. classClock will try again when the tab becomes visible.'
                : 'Screen wake lock released.';
        case 'error':
            return snapshot.error || 'Could not keep the screen awake.';
        case 'inactive':
            if (snapshot.isEnabled && !snapshot.hasRequestedThisSession) {
                return 'Preference restored. Some browsers require a fresh tap before this session can activate wake lock.';
            }
            return snapshot.isEnabled
                ? 'Wake lock is enabled and will resume after the next successful request.'
                : 'Wake lock is off.';
        case 'unsupported':
            return 'Not supported in this browser.';
        default:
            return '';
    }
}

export const WakeLockToggle = {
    initialized: false,

    init: function() {
        if (WakeLockToggle.initialized) return;
        WakeLockToggle.initialized = true;

        DOM.wakeLockToggleInput?.addEventListener('change', WakeLockToggle.handleToggleChange);
        WakeLock.subscribe(WakeLockToggle.render);
    },

    handleToggleChange: function(this: HTMLInputElement) {
        if (this.checked) {
            void WakeLock.enableWakeLock();
            return;
        }

        void WakeLock.disableWakeLock();
    },

    render: function(snapshot: WakeLockSnapshot) {
        const toggleInput = DOM.wakeLockToggleInput as HTMLInputElement | null;
        const statusEl = DOM.wakeLockStatusEl as HTMLElement | null;
        const messageEl = DOM.wakeLockMessageEl as HTMLElement | null;

        if (toggleInput) {
            toggleInput.checked = snapshot.isEnabled;
            toggleInput.disabled = !snapshot.isSupported;
            toggleInput.setAttribute('aria-describedby', 'wake-lock-status wake-lock-message');
        }

        if (statusEl) {
            statusEl.textContent = snapshot.status;
            statusEl.dataset.status = snapshot.status;
        }

        if (messageEl) {
            const message = getStatusMessage(snapshot);
            messageEl.textContent = message;
            messageEl.dataset.state = snapshot.status;
        }
    }
};
