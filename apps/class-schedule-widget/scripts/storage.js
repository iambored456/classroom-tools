// Simple namespaced localStorage with debounce and profile bootstrap

export const KEYS = {
  profile: 'ttw:v1:profile',
  settings: 'ttw:v1:settings',
  templateDefault: 'ttw:v1:templates:default',
  scheduleFor: (dateISO) => `ttw:v1:schedule:${dateISO}`,
};

export function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

let pending = new Map();
export function writeJSONDebounced(key, value, delay = 300) {
  if (pending.has(key)) clearTimeout(pending.get(key));
  const t = setTimeout(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    pending.delete(key);
  }, delay);
  pending.set(key, t);
}

export function ensureProfile() {
  let profile = readJSON(KEYS.profile, null);
  if (!profile) {
    profile = { userId: uuid(), createdAt: new Date().toISOString() };
    try { localStorage.setItem(KEYS.profile, JSON.stringify(profile)); } catch {}
  }
  return profile;
}

export function loadSettings() {
  return readJSON(KEYS.settings, null);
}

export function saveSettings(settings) {
  writeJSONDebounced(KEYS.settings, settings);
}

export function loadTemplate() {
  return readJSON(KEYS.templateDefault, null);
}

export function saveTemplate(tpl) {
  writeJSONDebounced(KEYS.templateDefault, tpl);
}

export function loadScheduleDay(dateISO) {
  return readJSON(KEYS.scheduleFor(dateISO), null);
}

export function saveScheduleDay(dateISO, day) {
  writeJSONDebounced(KEYS.scheduleFor(dateISO), day);
}

export function clearAll() {
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.templateDefault);
  // Remove schedule entries
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ttw:v1:schedule:')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

