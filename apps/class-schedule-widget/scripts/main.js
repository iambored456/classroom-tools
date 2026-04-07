/* Launcher logic for opening and managing the popup widget */

let popupRef = null;
const statusEl = document.getElementById('status');
const openBtn = document.getElementById('openWidget');
const focusBtn = document.getElementById('focusWidget');
const showSettingsBtn = document.getElementById('showSettings');
const openInTabBtn = document.getElementById('openInTab');

function features() {
  return [
    'popup=yes',
    'width=380',
    'height=700',
    'left=100',
    'top=100',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',');
}

function updateStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

openBtn?.addEventListener('click', () => {
  popupRef = window.open('widget.html', 'scheduleWidget', features());
  if (!popupRef) {
    updateStatus('Pop-up blocked. Try "Open In Tab".');
  } else {
    focusBtn.disabled = false;
    if (showSettingsBtn) showSettingsBtn.disabled = false;
    updateStatus('Widget opened.');
  }
});

focusBtn?.addEventListener('click', () => {
  if (popupRef && !popupRef.closed) {
    popupRef.focus();
    popupRef.postMessage({ type: 'opener:focus-request' }, '*');
  } else {
    focusBtn.disabled = true;
    if (showSettingsBtn) showSettingsBtn.disabled = true;
    updateStatus('Widget not open.');
  }
});

showSettingsBtn?.addEventListener('click', () => {
  if (popupRef && !popupRef.closed) {
    popupRef.postMessage({ type: 'opener:show-settings' }, '*');
  } else {
    showSettingsBtn.disabled = true;
    updateStatus('Widget not open.');
  }
});

openInTabBtn?.addEventListener('click', () => {
  window.open('widget.html', '_blank');
});

window.addEventListener('message', (ev) => {
  const data = ev.data || {};
  if (data && data.type && typeof data.type === 'string' && data.type.startsWith('widget:')) {
    if (data.type === 'widget:status') {
      updateStatus(String(data.message || ''));
    }
  }
});

// Monitor closure
setInterval(() => {
  if (popupRef && popupRef.closed) {
    popupRef = null;
    focusBtn.disabled = true;
    if (showSettingsBtn) showSettingsBtn.disabled = true;
    updateStatus('Widget window closed.');
  }
}, 1500);
