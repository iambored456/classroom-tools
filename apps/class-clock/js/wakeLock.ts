export type WakeLockStatus = 'unsupported' | 'inactive' | 'requesting' | 'active' | 'released' | 'error';

export type WakeLockSnapshot = {
    isSupported: boolean;
    isEnabled: boolean;
    status: WakeLockStatus;
    error: string | null;
    hasRequestedThisSession: boolean;
};

type WakeLockSubscriber = (snapshot: WakeLockSnapshot) => void;
type WakeLockRequestSource = 'user' | 'visibility';

const STORAGE_KEY = 'classClock.keepScreenAwake';
const RELEASE_EVENT = 'release';
const DEBUG_PREFIX = '[WakeLock]';

const subscribers = new Set<WakeLockSubscriber>();

let initialized = false;
let sentinel: WakeLockSentinel | null = null;
let sentinelReleaseListener: ((event: Event) => void) | null = null;
let pendingRequest: Promise<boolean> | null = null;
let requestToken = 0;
let manualReleaseSentinel: WakeLockSentinel | null = null;

function debugLog(message: string, details?: unknown) {
    if (!import.meta.env.DEV) return;
    if (typeof details === 'undefined') {
        console.debug(DEBUG_PREFIX, message);
        return;
    }
    console.debug(DEBUG_PREFIX, message, details);
}

function loadEnabledPreference() {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (storedValue === null) return false;
        return JSON.parse(storedValue) === true;
    } catch (error) {
        debugLog('Failed to load persisted wake lock preference.', error);
        return false;
    }
}

function saveEnabledPreference(value: boolean) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
        debugLog('Failed to persist wake lock preference.', error);
    }
}

function notifySubscribers() {
    const snapshot = WakeLock.getSnapshot();
    subscribers.forEach((subscriber) => subscriber(snapshot));
}

function setWakeLockState(status: WakeLockStatus, error: string | null = null) {
    WakeLock.status = status;
    WakeLock.error = error;
    notifySubscribers();
}

function detachSentinel(target: WakeLockSentinel | null = sentinel) {
    if (!target) return;

    if (sentinelReleaseListener) {
        target.removeEventListener(RELEASE_EVENT, sentinelReleaseListener);
    }

    if (sentinel === target) {
        sentinel = null;
    }

    sentinelReleaseListener = null;
}

function humanizeWakeLockError(error: unknown) {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotAllowedError':
                return 'The browser blocked the screen wake lock. Keep the tab visible and try again.';
            case 'NotSupportedError':
                return 'Not supported in this browser.';
            case 'SecurityError':
                return 'Screen wake lock requires HTTPS or localhost.';
            case 'AbortError':
                return 'The screen wake lock request was interrupted. Try again.';
            default:
                break;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Could not keep the screen awake. Try again while classClock is visible.';
}

function handleWakeLockRelease(releasedSentinel: WakeLockSentinel) {
    const wasManualRelease = manualReleaseSentinel === releasedSentinel;

    if (sentinel !== releasedSentinel) {
        if (wasManualRelease) {
            manualReleaseSentinel = null;
        }
        debugLog('Ignored release event from a stale wake lock sentinel.');
        return;
    }

    debugLog(wasManualRelease ? 'Screen wake lock released by user.' : 'Screen wake lock released by the browser.');

    detachSentinel(releasedSentinel);

    if (manualReleaseSentinel === releasedSentinel) {
        manualReleaseSentinel = null;
    }

    setWakeLockState('released');
}

function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') {
        debugLog('Document hidden; waiting for release or next visible state.');
        return;
    }

    if (!WakeLock.isEnabled || !WakeLock.isSupported) {
        return;
    }

    if (!WakeLock.hasRequestedThisSession) {
        debugLog('Skipped auto re-acquire because the user has not activated wake lock in this session.');
        return;
    }

    void WakeLock.requestWakeLock('visibility');
}

export const WakeLock = {
    isSupported: false,
    isEnabled: false,
    status: 'unsupported' as WakeLockStatus,
    error: null as string | null,
    hasRequestedThisSession: false,

    init: function() {
        if (initialized) return;
        initialized = true;

        WakeLock.isSupported = Boolean(navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
        WakeLock.isEnabled = loadEnabledPreference();
        WakeLock.status = WakeLock.isSupported ? 'inactive' : 'unsupported';
        WakeLock.error = WakeLock.isSupported ? null : 'Not supported in this browser.';

        if (WakeLock.isEnabled) {
            debugLog('Loaded persisted enabled preference. Waiting for a session activation before auto re-acquire.');
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        notifySubscribers();
    },

    getSnapshot: function(): WakeLockSnapshot {
        return {
            isSupported: WakeLock.isSupported,
            isEnabled: WakeLock.isEnabled,
            status: WakeLock.status,
            error: WakeLock.error,
            hasRequestedThisSession: WakeLock.hasRequestedThisSession
        };
    },

    subscribe: function(subscriber: WakeLockSubscriber) {
        subscribers.add(subscriber);
        subscriber(WakeLock.getSnapshot());

        return () => {
            subscribers.delete(subscriber);
        };
    },

    enableWakeLock: function() {
        WakeLock.isEnabled = true;
        WakeLock.hasRequestedThisSession = true;
        saveEnabledPreference(true);
        notifySubscribers();

        return WakeLock.requestWakeLock('user');
    },

    disableWakeLock: async function() {
        WakeLock.isEnabled = false;
        WakeLock.hasRequestedThisSession = false;
        WakeLock.error = null;
        saveEnabledPreference(false);

        requestToken += 1;
        pendingRequest = null;

        const activeSentinel = sentinel;
        if (!activeSentinel || activeSentinel.released) {
            detachSentinel(activeSentinel);
            setWakeLockState('inactive');
            return false;
        }

        manualReleaseSentinel = activeSentinel;
        notifySubscribers();

        try {
            await activeSentinel.release();
            if (sentinel === activeSentinel) {
                handleWakeLockRelease(activeSentinel);
            }
            return true;
        } catch (error) {
            manualReleaseSentinel = null;
            setWakeLockState('error', humanizeWakeLockError(error));
            debugLog('Failed to release the active wake lock.', error);
            return false;
        }
    },

    requestWakeLock: async function(source: WakeLockRequestSource = 'visibility') {
        if (!WakeLock.isSupported) {
            setWakeLockState('unsupported', 'Not supported in this browser.');
            return false;
        }

        if (!WakeLock.isEnabled) {
            setWakeLockState('inactive');
            return false;
        }

        if (document.visibilityState !== 'visible') {
            debugLog('Skipped wake lock request because the document is hidden.');
            return false;
        }

        if (sentinel && !sentinel.released) {
            setWakeLockState('active');
            return true;
        }

        if (pendingRequest) {
            debugLog('Wake lock request already in progress.');
            return pendingRequest;
        }

        if (source !== 'user' && !WakeLock.hasRequestedThisSession) {
            debugLog('Blocked auto request before any user activation in this session.');
            return false;
        }

        const currentRequestToken = ++requestToken;
        setWakeLockState('requesting');
        debugLog(`Requesting screen wake lock via ${source}.`);

        pendingRequest = navigator.wakeLock.request('screen')
            .then(async (nextSentinel) => {
                if (
                    currentRequestToken !== requestToken
                    || !WakeLock.isEnabled
                    || document.visibilityState !== 'visible'
                ) {
                    debugLog('Discarding a stale wake lock request result.');
                    await nextSentinel.release().catch(() => undefined);
                    return false;
                }

                detachSentinel();

                sentinel = nextSentinel;
                sentinelReleaseListener = () => {
                    handleWakeLockRelease(nextSentinel);
                };
                nextSentinel.addEventListener(RELEASE_EVENT, sentinelReleaseListener);

                setWakeLockState('active');
                debugLog('Screen wake lock is active.');
                return true;
            })
            .catch((error) => {
                if (currentRequestToken !== requestToken) {
                    debugLog('Ignored wake lock error from a stale request.', error);
                    return false;
                }

                const message = humanizeWakeLockError(error);
                setWakeLockState('error', message);
                debugLog('Wake lock request failed.', error);
                return false;
            })
            .finally(() => {
                if (currentRequestToken === requestToken) {
                    pendingRequest = null;
                }
            });

        return pendingRequest;
    }
};
