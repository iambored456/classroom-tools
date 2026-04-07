import {
  ensureProfile,
  loadSettings,
  saveSettings,
  loadTemplate,
  saveTemplate,
  loadScheduleDay,
  saveScheduleDay,
  clearAll,
  uuid,
} from './storage.js';
import { RafTicker, parseOffset, formatOffset } from './timer.js';

ensureProfile();

const EMOJI_OPTIONS = [
  '✏️','🖍️','📖','📋','📌','📊','🏫','📆','🏳️','🏴','🔍','🎯','👀','👂','👄',
  '📘','📗','📕','📙','📒','📓','📔','📚','📄','📃','📑','📝','✒️','🖊️','🖋️','🖌️','🧾','🖇️','📎','📐','📏','📍','📈','📉','📅','🗓️','📇','📁','📂','🗂️','🗃️','🗄️','🗑️','📤','📥','📦','🗳️','🧮','🧷','🧵','🧶','🧰','🧲','🧪','🧫','🧬','🧯','🧹','🧺','🧻','🧼','🧽','🧿','🪀','🪁',
  '🧠','🔬','🔭','🧱','🧴','🏢','🏛️','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏬','🏯','🏰','🏙️','🏞️','🏟️','🏣','🏤','🏥','🏦','🏧','🏨','🏩','🏪','🏮','🏵️','🏷️',
  '👩‍🏫','👨‍🏫','👩‍🎓','👨‍🎓','👩‍🔬','👨‍🔬','🧑‍🔬','👩‍💻','👨‍💻','🧑‍🏫','🧑‍🎓','🧑‍💻',
  '🌈','☀','☁','☂','☃','☔','🔎','🔺','🔻','⭕','🎲','🎮','🎳','✔','✖','❕','❔','🎵','𝄞','🎸','🎷','🎶','🎻',
  '🌞','👉','👌','👍','👎','👏','👦','👧','👨','👱','👳','👴','👵','👶','👷','👻','👽','🤔','💭','🧘','✍️','✅','🧐','💡','🎨','🧠','🗣️','🎤','📢','🧩','👥',
  '⏰','📍','🗒️','🎉','🥳','🎊','🎁','🎈','🎂','🍰','🎀','🎄','🎃','🕎','🧨','🎆','🎇','🧧','🎍','🎑','🎎','💐','🧹','🪁','🎳','🔧','🍳','✈️','🚶','🕵️','🧥','🎩','🕶️','🧣','🧠','📂','📝','🩸','🧤','🧳','📸','🎥','🎙️','📼','🔐','🛅','👮','🚓','⚖️','👤','🚨','🌒','🌕','🌫️','📡','🕰️','⏳','🗝️','🧩','🗂️','🔒'
];

const DEFAULT_SETTINGS = {
  clockOffsetMs: 0,
  showTitle: true,
  title: 'Class Schedule',
  showSeconds: false,
  autoChain: true,
  startTime: '08:00',
  timeFormat: '12',
  iconSize: 'medium',
  barHeight: 9,
  zoomScale: 1,
  timeTextScale: 1,
  titleTextScale: 1,
  timerPanelSize: { width: 260, height: 360 },
  customAlarmData: null,
  customAlarmName: '',
};

const DEFAULT_TEMPLATE = {
  id: 'default',
  title: 'Default',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  autoChain: true,
  activities: [
    { id: 'math', title: 'Math', icon: { type: 'emoji', value: '🧮' }, durationMin: 45 },
    { id: 'science', title: 'Science', icon: { type: 'emoji', value: '🔬' }, durationMin: 45 },
    { id: 'break', title: 'Break', icon: { type: 'emoji', value: '☕' }, durationMin: 15 },
    { id: 'history', title: 'History', icon: { type: 'emoji', value: '🏛️' }, durationMin: 45 },
    { id: 'english', title: 'English', icon: { type: 'emoji', value: '📖' }, durationMin: 45 },
  ],
};

const TIMER_DEFAULT_MS = 5 * 60 * 1000;
const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024; // ~1.5MB

const deepClone = (value) => JSON.parse(JSON.stringify(value));

let settings = { ...DEFAULT_SETTINGS, ...(loadSettings() || {}) };
let template = loadTemplate() || deepClone(DEFAULT_TEMPLATE);
settings.timerPanelSize = {
  ...DEFAULT_SETTINGS.timerPanelSize,
  ...(settings.timerPanelSize || {}),
};

const todayISO = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

const parseTimeToDate = (timeStr) => {
  const [hh = 0, mm = 0] = (timeStr || '08:00').split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};

const minutesSinceAnchor = (timeStr, anchorStr) => {
  const [ah = 0, am = 0] = (anchorStr || '00:00').split(':').map(Number);
  const [hh = 0, mm = 0] = (timeStr || '00:00').split(':').map(Number);
  return (hh * 60 + mm) - (ah * 60 + am);
};

const formatTime = (date) => {
  const opts = {
    hour: '2-digit',
    minute: '2-digit',
    second: settings.showSeconds ? '2-digit' : undefined,
    hour12: settings.timeFormat === '12',
  };
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
};

const formatRange = (start, end) => {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat === '12' };
  const formatter = new Intl.DateTimeFormat(undefined, opts);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
};

const deriveScheduleForToday = () => {
  const dateISO = todayISO();
  const saved = loadScheduleDay(dateISO);
  const savedMap = new Map();
  if (saved?.activities) saved.activities.forEach((act) => savedMap.set(act.defId, act));

  const anchor = parseTimeToDate(settings.startTime);
  const anchorMs = anchor.getTime();
  let rolling = anchorMs;

  const activities = template.activities.map((def, idx) => {
    const manualStart = !settings.autoChain && Number.isFinite(def.startDeltaMin);
    const startMs = manualStart ? anchorMs + def.startDeltaMin * 60 * 1000 : rolling;
    const durationMin = Math.max(1, Number(def.durationMin) || 45);
    const endMs = startMs + durationMin * 60 * 1000;
    rolling = manualStart ? Math.max(rolling, endMs) : endMs;

    const prev = savedMap.get(def.id);
    return {
      id: `${dateISO}:${def.id}`,
      defId: def.id,
      title: def.title,
      icon: def.icon ? { ...def.icon } : { type: 'emoji', value: '📘' },
      startISO: new Date(startMs).toISOString(),
      endISO: new Date(endMs).toISOString(),
      durationMs: durationMin * 60 * 1000,
      state: prev?.state || 'upcoming',
      notes: prev?.notes || '',
    };
  });

  const day = { id: `day:${dateISO}`, templateId: template.id, dateISO, startTime: settings.startTime, activities };
  saveScheduleDay(dateISO, day);
  return day;
};

let scheduleDay = deriveScheduleForToday();

// DOM references
const headerTitleEl = document.getElementById('headerTitle');
const renameTitleBtn = document.getElementById('renameTitle');
const toggleTimerBtn = document.getElementById('toggleTimer');
const upNextEl = document.getElementById('upNext');
const listEl = document.getElementById('list');
const footerEl = document.getElementById('footer');

const showTitleChk = document.getElementById('showTitle');
const titleTextInp = document.getElementById('titleText');
const startTimeInp = document.getElementById('startTime');
const autoChainChk = document.getElementById('autoChain');
const iconSizeSel = document.getElementById('iconSize');
const timeFormatSel = document.getElementById('timeFormat');
const offsetInp = document.getElementById('clockOffset');
const showSecChk = document.getElementById('showSeconds');
const minus5sBtn = document.getElementById('minus5s');
const plus5sBtn = document.getElementById('plus5s');
const alarmUploadInp = document.getElementById('alarmUpload');
const alarmStatusEl = document.getElementById('alarmStatus');
const playAlarmBtn = document.getElementById('playAlarm');
const clearAlarmBtn = document.getElementById('clearAlarm');

const addActivityBtn = document.getElementById('addActivity');
const activitiesListEl = document.getElementById('activitiesList');
const emojiDatalist = document.getElementById('emojiOptions');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInp = document.getElementById('importFile');
const resetTodayBtn = document.getElementById('resetToday');
const clearAllBtn = document.getElementById('clearAll');

const nowTimeEl = document.getElementById('nowTime');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const zoomInBtn = document.getElementById('zoomIn');
const barHeightDownBtn = document.getElementById('barHeightDown');
const barHeightResetBtn = document.getElementById('barHeightReset');
const barHeightUpBtn = document.getElementById('barHeightUp');
const timeTextDownBtn = document.getElementById('timeTextDown');
const timeTextResetBtn = document.getElementById('timeTextReset');
const timeTextUpBtn = document.getElementById('timeTextUp');
const titleTextDownBtn = document.getElementById('titleTextDown');
const titleTextResetBtn = document.getElementById('titleTextReset');
const titleTextUpBtn = document.getElementById('titleTextUp');
const tabButtons = Array.from(document.querySelectorAll('.bottom-tab'));
const panelSchedule = document.getElementById('panel-schedule');
const panelSettings = document.getElementById('panel-settings');

const timerPanel = document.getElementById('timerPanel');
const closeTimerBtn = document.getElementById('closeTimer');
const timerDisplay = document.getElementById('timerDisplay');
const timerCircle = document.getElementById('timerCircle');
const timerStartBtn = document.getElementById('timerStart');
const timerPauseBtn = document.getElementById('timerPause');
const timerResetBtn = document.getElementById('timerReset');
const timerPresetBtns = Array.from(document.querySelectorAll('.timer-presets button'));
const timerHeaderEl = document.querySelector('.timer-header');
const timerResizeHandle = document.getElementById('timerResizeHandle');

const timerDragState = {
  active: false,
  pointerId: null,
  offsetX: 0,
  offsetY: 0,
};
const timerResizeState = {
  active: false,
  pointerId: null,
  startWidth: DEFAULT_SETTINGS.timerPanelSize.width,
  startHeight: DEFAULT_SETTINGS.timerPanelSize.height,
  startX: 0,
  startY: 0,
};

timerDisplay.setAttribute('contenteditable', 'false');
timerDisplay.spellcheck = false;
timerDisplay.tabIndex = 0;

let audioCtx = null;
const ensureAudioCtx = async () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
};




const timerState = {
  totalMs: TIMER_DEFAULT_MS,
  remainingMs: TIMER_DEFAULT_MS,
  running: false,
  endTime: null,
  alarmNode: null,
  alarmAudio: null,
};
const stopAlarmSound = () => {
  if (timerState.alarmNode) {
    try { timerState.alarmNode.stop(); } catch {}
    try { timerState.alarmNode.disconnect(); } catch {}
    timerState.alarmNode = null;
  }
  if (timerState.alarmAudio) {
    try { timerState.alarmAudio.pause(); timerState.alarmAudio.currentTime = 0; } catch {}
    timerState.alarmAudio = null;
  }
};


let timerEditing = false;
let timerEditSnapshot = '';

const normalizeTimerInput = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(-6);
  if (!digits) {
    return { display: '00:00', seconds: 0 };
  }
  const minutesPart = digits.slice(0, -2) || '0';
  let secondsPart = digits.slice(-2);
  let minutes = parseInt(minutesPart, 10);
  let seconds = parseInt(secondsPart, 10);
  if (!Number.isFinite(minutes)) minutes = 0;
  if (!Number.isFinite(seconds)) seconds = 0;
  if (seconds > 59) seconds = 59;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { display, seconds: minutes * 60 + seconds };
};

const placeCaretAtEnd = (el) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

const startTimerEditing = () => {
  if (timerState.running || timerEditing) return;
  timerEditing = true;
  timerEditSnapshot = timerDisplay.textContent;
  timerDisplay.setAttribute('contenteditable', 'true');
  timerDisplay.classList.add('editing');
  timerCircle.classList.add('editing');
  timerDisplay.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(timerDisplay);
  selection.addRange(range);
};

const stopTimerEditing = (commit) => {
  if (!timerEditing) return;
  timerEditing = false;
  stopAlarmSound();
  timerDisplay.setAttribute('contenteditable', 'false');
  timerDisplay.classList.remove('editing');
  timerCircle.classList.remove('editing');
  if (commit) {
    const { display, seconds } = normalizeTimerInput(timerDisplay.textContent);
    timerState.totalMs = seconds * 1000;
    timerState.remainingMs = timerState.totalMs;
    timerState.running = false;
    timerState.endTime = null;
    timerDisplay.textContent = display;
  } else {
    timerDisplay.textContent = timerEditSnapshot || formatDuration(timerState.remainingMs);
  }
  updateTimerDisplay();
};

const handleTimerDisplayInput = () => {
  if (!timerEditing) return;
  const current = timerDisplay.textContent;
  const { display } = normalizeTimerInput(current);
  if (current !== display) {
    timerDisplay.textContent = display;
    placeCaretAtEnd(timerDisplay);
  }
};

const beginTimerResize = (event) => {
  if (!(event instanceof PointerEvent)) return;
  event.preventDefault();
  event.stopPropagation();
  timerResizeState.active = true;
  timerResizeState.pointerId = event.pointerId;
  timerResizeState.startWidth = settings.timerPanelSize?.width || DEFAULT_SETTINGS.timerPanelSize.width;
  timerResizeState.startHeight = settings.timerPanelSize?.height || DEFAULT_SETTINGS.timerPanelSize.height;
  timerResizeState.startX = event.clientX;
  timerResizeState.startY = event.clientY;
  timerPanel.classList.add('dragging');
  if (timerResizeHandle && timerResizeHandle.setPointerCapture) {
    try { timerResizeHandle.setPointerCapture(event.pointerId); } catch {}
  }
  if (!timerPanel.classList.contains('floating')) {
    const rect = timerPanel.getBoundingClientRect();
    timerPanel.classList.add('floating');
    timerPanel.style.right = 'auto';
    timerPanel.style.left = `${rect.left}px`;
    timerPanel.style.top = `${rect.top}px`;
  }
  timerPanel.dataset.positionSet = 'true';
  window.addEventListener('pointermove', handleTimerResizeMove);
  window.addEventListener('pointerup', endTimerResize);
  window.addEventListener('pointercancel', endTimerResize);
};

const handleTimerResizeMove = (event) => {
  if (!timerResizeState.active || event.pointerId !== timerResizeState.pointerId) return;
  event.preventDefault();
  const deltaX = event.clientX - timerResizeState.startX;
  const deltaY = event.clientY - timerResizeState.startY;
  const width = timerResizeState.startWidth + deltaX;
  const height = timerResizeState.startHeight + deltaY;
  settings.timerPanelSize = { width, height };
  applyTimerPanelSize();
  clampTimerPosition();
};

const endTimerResize = (event) => {
  if (!timerResizeState.active || (event && event.pointerId !== timerResizeState.pointerId)) return;
  timerResizeState.active = false;
  timerResizeState.pointerId = null;
  timerPanel.classList.remove('dragging');
  if (timerResizeHandle && timerResizeHandle.releasePointerCapture && event) {
    try { timerResizeHandle.releasePointerCapture(event.pointerId); } catch {}
  }
  window.removeEventListener('pointermove', handleTimerResizeMove);
  window.removeEventListener('pointerup', endTimerResize);
  window.removeEventListener('pointercancel', endTimerResize);
  clampTimerPosition();
  applyTimerPanelSize();
  persistSettings();
};

const applyIconSize = () => {
  document.body.dataset.iconSize = settings.iconSize || 'medium';
};

const applyBarHeight = () => {
  const height = Math.max(4, settings.barHeight || 9);
  settings.barHeight = height;
  document.documentElement.style.setProperty('--bar-height', `${height}px`);
  if (barHeightResetBtn) {
    barHeightResetBtn.textContent = `${height}px`;
  }
};

const applyZoom = () => {
  const scale = Math.min(1.6, Math.max(0.7, settings.zoomScale || 1));
  settings.zoomScale = scale;
  document.documentElement.style.setProperty('--zoom-scale', scale);
  try {
    document.body.style.zoom = `${scale}`;
  } catch (err) {
    // zoom not supported; font-size scaling via CSS variable is already applied
  }
  if (zoomResetBtn) {
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
  }
};

const applyTimeTextScale = () => {
  const scale = Math.min(2, Math.max(1, settings.timeTextScale || 1));
  settings.timeTextScale = scale;
  document.documentElement.style.setProperty('--time-text-scale', scale);
  if (timeTextResetBtn) {
    timeTextResetBtn.textContent = `Time ${Math.round(scale * 100)}%`;
  }
};

const applyTitleTextScale = () => {
  const scale = Math.min(2, Math.max(0.6, settings.titleTextScale || 1));
  settings.titleTextScale = scale;
  document.documentElement.style.setProperty('--title-text-scale', scale);
  if (titleTextResetBtn) {
    titleTextResetBtn.textContent = `Title ${Math.round(scale * 100)}%`;
  }
};

const applyTimerPanelSize = () => {
  if (!timerPanel) return;
  const size = settings.timerPanelSize || DEFAULT_SETTINGS.timerPanelSize;
  const viewportWidth = typeof window !== 'undefined' && window.innerWidth ? Math.max(240, window.innerWidth - 32) : 520;
  const viewportHeight = typeof window !== 'undefined' && window.innerHeight ? Math.max(300, window.innerHeight - 80) : 640;
  let { width, height } = size;
  width = Math.max(240, Math.min(Math.min(520, viewportWidth), Math.round(width || DEFAULT_SETTINGS.timerPanelSize.width)));
  height = Math.max(300, Math.min(Math.min(640, viewportHeight), Math.round(height || DEFAULT_SETTINGS.timerPanelSize.height)));
  settings.timerPanelSize = { width, height };
  timerPanel.style.width = `${width}px`;
  timerPanel.style.height = `${height}px`;
  document.documentElement.style.setProperty('--timer-panel-width', `${width}px`);
  document.documentElement.style.setProperty('--timer-panel-height', `${height}px`);
  const circleSize = Math.max(160, Math.min(width - 40, height - 160, 400));
  document.documentElement.style.setProperty('--timer-circle-size', `${circleSize}px`);
};

const populateEmojiOptions = () => {
  if (!emojiDatalist) return;
  emojiDatalist.innerHTML = '';
  EMOJI_OPTIONS.forEach((emoji) => {
    const option = document.createElement('option');
    option.value = emoji;
    emojiDatalist.appendChild(option);
  });
};

const adjustBarHeight = (delta) => {
  const base = settings.barHeight || 9;
  const next = Math.max(4, Math.min(120, Math.round(base + delta)));
  if (next === base) return;
  settings.barHeight = next;
  applyBarHeight();
  persistSettings();
  renderSchedule();
};

const adjustZoom = (delta) => {
  const raw = (settings.zoomScale || 1) + delta;
  const next = Math.min(1.6, Math.max(0.7, Math.round(raw * 100) / 100));
  if (next === settings.zoomScale) return;
  settings.zoomScale = next;
  applyZoom();
  persistSettings();
};

const resetZoom = () => {
  settings.zoomScale = 1;
  applyZoom();
  persistSettings();
};

const resetBarHeight = () => {
  settings.barHeight = 9;
  applyBarHeight();
  persistSettings();
  renderSchedule();
};

const adjustTimeTextScale = (delta) => {
  const raw = (settings.timeTextScale || 1) + delta;
  const next = Math.min(2, Math.max(1, Math.round(raw * 100) / 100));
  if (next === settings.timeTextScale) return;
  settings.timeTextScale = next;
  applyTimeTextScale();
  persistSettings();
  renderSchedule();
};

const resetTimeTextScale = () => {
  settings.timeTextScale = 1;
  applyTimeTextScale();
  persistSettings();
  renderSchedule();
};

const adjustTitleTextScale = (delta) => {
  const raw = (settings.titleTextScale || 1) + delta;
  const next = Math.min(2, Math.max(0.6, Math.round(raw * 100) / 100));
  if (next === settings.titleTextScale) return;
  settings.titleTextScale = next;
  applyTitleTextScale();
  persistSettings();
  renderSchedule();
};

const resetTitleTextScale = () => {
  settings.titleTextScale = 1;
  applyTitleTextScale();
  persistSettings();
  renderSchedule();
};

const loadUIFromSettings = () => {
  applyIconSize();
  applyBarHeight();
  applyZoom();
  applyTimeTextScale();
  applyTitleTextScale();
  applyTimerPanelSize();
  headerTitleEl.textContent = settings.title || 'Class Schedule';
  headerTitleEl.style.display = settings.showTitle ? '' : 'none';
  showTitleChk.checked = !!settings.showTitle;
  titleTextInp.value = settings.title;
  startTimeInp.value = settings.startTime;
  autoChainChk.checked = !!settings.autoChain;
  iconSizeSel.value = settings.iconSize || 'medium';
  timeFormatSel.value = settings.timeFormat;
  showSecChk.checked = !!settings.showSeconds;
  offsetInp.value = formatOffset(settings.clockOffsetMs || 0);
  alarmStatusEl.textContent = settings.customAlarmName ? `Loaded: ${settings.customAlarmName}` : 'No custom sound loaded.';
};

const persistSettings = ({ rebuildDay = false } = {}) => {
  saveSettings(settings);
  if (rebuildDay) {
    scheduleDay = deriveScheduleForToday();
    renderSchedule();
    renderActivitiesEditor();
  }
};

const persistTemplate = () => {
  saveTemplate(template);
  scheduleDay = deriveScheduleForToday();
  renderSchedule();
  renderActivitiesEditor();
};

const sendStatus = (msg) => {
  if (window.opener) {
    window.opener.postMessage({ type: 'widget:status', message: msg }, '*');
  }
};

const setView = (view) => {
  document.body.dataset.view = view;
  const showSettings = view === 'settings';
  panelSchedule.classList.toggle('is-active', !showSettings);
  panelSettings.classList.toggle('is-active', showSettings);
  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (typeof sendStatus === 'function') {
    sendStatus(`Widget view: ${view}`);
  }
};

const applyIconTo = (container, icon) => {
  container.textContent = '';
  if (icon?.type === 'emoji' && icon.value) {
    container.textContent = icon.value;
  } else {
    container.textContent = '📘';
  }
};

const syncDayActivity = (index, mutator) => {
  const dayAct = scheduleDay.activities[index];
  if (!dayAct) return;
  mutator(dayAct);
  saveScheduleDay(scheduleDay.dateISO, scheduleDay);
};

const renderSchedule = () => {
  listEl.innerHTML = '';
  const appNow = Date.now() + settings.clockOffsetMs;
  let nextUp = null;

  scheduleDay.activities.forEach((act, index) => {
    const startDate = new Date(act.startISO);
    const endDate = new Date(act.endISO);
    const start = startDate.getTime();
    const end = endDate.getTime();
    const duration = Math.max(1, end - start);
    const progress = Math.min(1, Math.max(0, (appNow - start) / duration));
    let state = 'upcoming';
    if (progress >= 1) state = 'done';
    else if (progress > 0) state = 'in-progress';
    act.state = state;

    if (!nextUp && state === 'upcoming') nextUp = act;

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    if (state === 'done') card.classList.add('card--done');
    if (state === 'in-progress') card.classList.add('card--inprogress');

    const iconEl = document.createElement('div');
    iconEl.className = 'icon';
    applyIconTo(iconEl, act.icon);

    const cardMain = document.createElement('div');
    cardMain.className = 'card-main';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    const titleText = act.title || 'Untitled activity';
    titleEl.textContent = titleText;
    titleEl.classList.toggle('card-title--done', state === 'done');
    cardMain.appendChild(titleEl);

    const body = document.createElement('div');
    body.className = 'card-body';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress';
    const startTag = document.createElement('div');
    startTag.className = 'progress-tag progress-tag--start';
    startTag.textContent = formatTime(startDate);
    progressWrap.appendChild(startTag);
    const endTag = document.createElement('div');
    endTag.className = 'progress-tag progress-tag--end';
    endTag.textContent = formatTime(endDate);
    progressWrap.appendChild(endTag);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const progressPercent = Math.round(progress * 100);
    bar.style.setProperty('--w', `${progressPercent}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(progressPercent));
    progressWrap.appendChild(bar);

    let ariaText = '';
    let remainingLabel = null;
    startTag.classList.remove('hidden');
    endTag.classList.remove('hidden');

    if (state === 'in-progress') {
      const remainingMs = Math.max(0, end - appNow);
      remainingLabel = document.createElement('div');
      remainingLabel.className = 'progress-label';
      remainingLabel.textContent = formatDuration(remainingMs);
      const rawPosition = progress * 100;
      const position = Math.min(95, Math.max(5, rawPosition));
      remainingLabel.style.left = `${position}%`;
      progressWrap.appendChild(remainingLabel);
      ariaText = `${formatDuration(remainingMs)} remaining`;
    } else if (state === 'done') {
      ariaText = 'Complete';
    } else {
      ariaText = 'Upcoming';
    }
    bar.setAttribute('aria-valuetext', ariaText);

    body.appendChild(progressWrap);

    cardMain.appendChild(body);

    card.appendChild(iconEl);
    card.appendChild(cardMain);

    listEl.appendChild(card);

    if (remainingLabel) {
      const labelRect = remainingLabel.getBoundingClientRect();
      const startRect = startTag.getBoundingClientRect();
      const endRect = endTag.getBoundingClientRect();
      if (labelRect.left <= startRect.right + 2) {
        startTag.classList.add('hidden');
      }
      if (labelRect.right >= endRect.left - 2) {
        endTag.classList.add('hidden');
      }
    }
  });

  if (nextUp) {
    upNextEl.innerHTML = `Up next: <strong>${nextUp.title}</strong> at ${formatTime(new Date(nextUp.startISO))}`;
    footerEl.textContent = `Later: ${nextUp.title} (${formatRange(new Date(nextUp.startISO), new Date(nextUp.endISO))})`;
  } else if (scheduleDay.activities.length) {
    upNextEl.textContent = 'All scheduled activities are complete.';
    footerEl.textContent = 'Great work today!';
  } else {
    upNextEl.textContent = 'No activities yet. Add items in Settings.';
    footerEl.textContent = 'Open settings to create a schedule.';
  }
};

const ensureScheduleForToday = () => {
  const today = todayISO();
  if (scheduleDay.dateISO !== today) {
    scheduleDay = deriveScheduleForToday();
    renderActivitiesEditor();
    return true;
  }
  return false;
};

const renderActivitiesEditor = () => {
  activitiesListEl.innerHTML = '';
  if (!template.activities.length) {
    const empty = document.createElement('div');
    empty.className = 'fine';
    empty.textContent = 'No activities yet. Use “Add activity” to begin.';
    activitiesListEl.appendChild(empty);
    return;
  }

  const anchorDate = parseTimeToDate(settings.startTime);

  template.activities.forEach((act, index) => {
    const dayAct = scheduleDay.activities[index];
    const card = document.createElement('div');
    card.className = 'activity-card';

    const header = document.createElement('div');
    header.className = 'activity-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'row';
    const preview = document.createElement('div');
    preview.className = 'icon-preview';
    applyIconTo(preview, act.icon);
    titleGroup.appendChild(preview);
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${act.title || 'Untitled activity'}`;
    titleGroup.appendChild(title);
    header.appendChild(titleGroup);

    const controls = document.createElement('div');
    controls.className = 'activity-controls';

    const moveUp = document.createElement('button');
    moveUp.type = 'button';
    moveUp.textContent = 'Up';
    moveUp.disabled = index === 0;
    moveUp.addEventListener('click', () => {
      if (index === 0) return;
      const items = template.activities;
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      persistTemplate();
    });
    controls.appendChild(moveUp);

    const moveDown = document.createElement('button');
    moveDown.type = 'button';
    moveDown.textContent = 'Down';
    moveDown.disabled = index === template.activities.length - 1;
    moveDown.addEventListener('click', () => {
      if (index === template.activities.length - 1) return;
      const items = template.activities;
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      persistTemplate();
    });
    controls.appendChild(moveDown);

    const duplicate = document.createElement('button');
    duplicate.type = 'button';
    duplicate.textContent = 'Duplicate';
    duplicate.addEventListener('click', () => {
      const clone = deepClone(act);
      clone.id = uuid();
      template.activities.splice(index + 1, 0, clone);
      persistTemplate();
    });
    controls.appendChild(duplicate);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      if (!confirm(`Delete “${act.title || 'Untitled'}”?`)) return;
      template.activities.splice(index, 1);
      persistTemplate();
    });
    controls.appendChild(remove);

    header.appendChild(controls);
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'activity-grid';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = act.title || '';
    titleInput.addEventListener('input', () => {
      act.title = titleInput.value;
      title.textContent = `${index + 1}. ${act.title || 'Untitled activity'}`;
      syncDayActivity(index, (d) => { d.title = act.title; });
      saveTemplate(template);
      renderSchedule();
    });
    titleLabel.appendChild(titleInput);
    grid.appendChild(titleLabel);

    const durationLabel = document.createElement('label');
    durationLabel.textContent = 'Duration (minutes)';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '1';
    durationInput.max = '360';
    durationInput.value = String(Math.max(1, Number(act.durationMin) || 45));
    durationInput.addEventListener('change', () => {
      const value = Number(durationInput.value);
      act.durationMin = Number.isFinite(value) && value > 0 ? value : 45;
      durationInput.value = String(act.durationMin);
      persistTemplate();
    });
    durationLabel.appendChild(durationInput);
    grid.appendChild(durationLabel);

    const startLabel = document.createElement('label');
    startLabel.textContent = 'Start time';
    const startInput = document.createElement('input');
    startInput.type = 'time';
    const startDate = dayAct ? new Date(dayAct.startISO) : new Date(anchorDate.getTime() + index * (act.durationMin || 45) * 60000);
    startInput.value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
    startInput.disabled = !!settings.autoChain;
    startInput.title = settings.autoChain ? 'Disable auto-chain to edit start times.' : '';
    startInput.addEventListener('change', () => {
      if (settings.autoChain) return;
      const mins = minutesSinceAnchor(startInput.value, settings.startTime);
      act.startDeltaMin = mins;
      persistTemplate();
    });
    startLabel.appendChild(startInput);
    if (settings.autoChain) {
      const note = document.createElement('span');
      note.className = 'fine';
      note.textContent = 'Auto-chain is on';
      startLabel.appendChild(note);
    }
    grid.appendChild(startLabel);

    const iconLabel = document.createElement('label');
    iconLabel.textContent = 'Emoji icon';
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.placeholder = 'Choose or type emoji';
    iconInput.setAttribute('list', 'emojiOptions');
    iconInput.value = act.icon?.value || '';
    iconInput.addEventListener('input', () => {
      const value = iconInput.value.trim() || '📘';
      act.icon = { type: 'emoji', value };
      applyIconTo(preview, act.icon);
      syncDayActivity(index, (d) => { d.icon = { ...act.icon }; });
      saveTemplate(template);
      renderSchedule();
    });
    iconLabel.appendChild(iconInput);
    grid.appendChild(iconLabel);

    card.appendChild(grid);
    activitiesListEl.appendChild(card);
  });
};

const setTimerRunning = (running) => {
  if (running) stopTimerEditing(true);
  stopAlarmSound();
  timerState.running = running;
  if (running) {
    timerState.endTime = Date.now() + timerState.remainingMs;
  } else {
    timerState.remainingMs = Math.max(0, timerState.endTime ? timerState.endTime - Date.now() : timerState.remainingMs);
    timerState.endTime = null;
  }
  updateTimerDisplay();
};

const addTimerSeconds = (seconds) => {
  if (timerEditing) stopTimerEditing(true);
  stopAlarmSound();
  const delta = seconds * 1000;
  timerState.remainingMs = Math.max(0, timerState.remainingMs + delta);
  timerState.totalMs = Math.max(timerState.totalMs + delta, timerState.remainingMs || TIMER_DEFAULT_MS);
  if (timerState.running) timerState.endTime = Date.now() + timerState.remainingMs;
  updateTimerDisplay();
};

const resetTimer = () => {
  stopTimerEditing(false);
  stopAlarmSound();
  timerState.totalMs = TIMER_DEFAULT_MS;
  timerState.remainingMs = TIMER_DEFAULT_MS;
  timerState.running = false;
  timerState.endTime = null;
  updateTimerDisplay();
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const updateTimerDisplay = () => {
  if (!timerEditing) {
    timerDisplay.textContent = formatDuration(timerState.remainingMs);
  }
  const progress = 1 - Math.min(1, Math.max(0, timerState.remainingMs / Math.max(1, timerState.totalMs)));
  timerCircle.style.setProperty('--timer-progress', progress);
  timerDisplay.classList.toggle('editing', timerEditing);
  timerCircle.classList.toggle('editing', timerEditing);
};

const playAlarmSound = async () => {
  stopAlarmSound();
  if (settings.customAlarmData) {
    const audio = new Audio(settings.customAlarmData);
    timerState.alarmAudio = audio;
    audio.addEventListener('ended', () => {
      if (timerState.alarmAudio === audio) timerState.alarmAudio = null;
    });
    audio.onended = () => {
      if (timerState.alarmAudio === audio) timerState.alarmAudio = null;
    };
    audio.play().catch(() => { timerState.alarmAudio = null; });
    return;
  }
  await ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.25);
  timerState.alarmNode = osc;
  osc.addEventListener('ended', () => {
    if (timerState.alarmNode === osc) timerState.alarmNode = null;
  });
  osc.onended = () => {
    if (timerState.alarmNode === osc) timerState.alarmNode = null;
  };
};

const handleTimerTick = () => {
  if (!timerState.running) return;
  const remaining = timerState.endTime - Date.now();
  if (remaining <= 0) {
    timerState.remainingMs = 0;
    timerState.running = false;
    timerState.endTime = null;
    updateTimerDisplay();
    playAlarmSound();
  } else {
    timerState.remainingMs = remaining;
    updateTimerDisplay();
  }
};

const clampTimerPosition = () => {
  if (!timerPanel.classList.contains('floating')) return;
  const rect = timerPanel.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  let left = rect.left;
  let top = rect.top;
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  left = Math.min(maxLeft, Math.max(0, left));
  top = Math.min(maxTop, Math.max(0, top));
  timerPanel.style.left = `${left}px`;
  timerPanel.style.top = `${top}px`;
};

const beginTimerDrag = (event) => {
  if (!(event instanceof PointerEvent) || event.button !== 0 || !timerPanel.classList.contains('visible')) return;
  if (event.target instanceof HTMLElement && event.target.closest('button')) return;
  timerDragState.active = true;
  timerDragState.pointerId = event.pointerId;
  const rect = timerPanel.getBoundingClientRect();
  timerPanel.classList.add('floating', 'dragging');
  timerPanel.style.right = 'auto';
  timerPanel.style.left = `${rect.left}px`;
  timerPanel.style.top = `${rect.top}px`;
  timerDragState.offsetX = event.clientX - rect.left;
  timerDragState.offsetY = event.clientY - rect.top;
  timerPanel.dataset.positionSet = 'true';
  event.preventDefault();
};

const handleTimerDragMove = (event) => {
  if (!timerDragState.active || event.pointerId !== timerDragState.pointerId) return;
  const width = timerPanel.offsetWidth;
  const height = timerPanel.offsetHeight;
  let left = event.clientX - timerDragState.offsetX;
  let top = event.clientY - timerDragState.offsetY;
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  left = Math.min(maxLeft, Math.max(0, left));
  top = Math.min(maxTop, Math.max(0, top));
  timerPanel.style.left = `${left}px`;
  timerPanel.style.top = `${top}px`;
};

const endTimerDrag = (event) => {
  if (!timerDragState.active || (event && event.pointerId !== timerDragState.pointerId)) return;
  timerDragState.active = false;
  timerDragState.pointerId = null;
  timerPanel.classList.remove('dragging');
  clampTimerPosition();
};

const handleAlarmUpload = async () => {
  const file = alarmUploadInp.files?.[0];
  if (!file) return;
  if (file.size > MAX_AUDIO_BYTES) {
    alert('Please choose an audio file under 1.5 MB.');
    alarmUploadInp.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    settings.customAlarmData = reader.result;
    settings.customAlarmName = file.name;
    persistSettings();
    alarmStatusEl.textContent = `Loaded: ${file.name}`;
    alarmUploadInp.value = '';
  };
  reader.readAsDataURL(file);
};

const clearAlarm = () => {
  settings.customAlarmData = null;
  settings.customAlarmName = '';
  persistSettings();
  alarmStatusEl.textContent = 'No custom sound loaded.';
};

// Event bindings
showTitleChk.addEventListener('change', () => {
  settings.showTitle = showTitleChk.checked;
  persistSettings();
  loadUIFromSettings();
});

titleTextInp.addEventListener('input', () => {
  settings.title = titleTextInp.value;
  persistSettings();
  loadUIFromSettings();
});

startTimeInp.addEventListener('change', () => {
  settings.startTime = startTimeInp.value || '08:00';
  persistSettings({ rebuildDay: true });
});

autoChainChk.addEventListener('change', () => {
  settings.autoChain = autoChainChk.checked;
  persistSettings({ rebuildDay: true });
});

iconSizeSel.addEventListener('change', () => {
  settings.iconSize = iconSizeSel.value;
  persistSettings();
  applyIconSize();
  renderSchedule();
});

zoomInBtn?.addEventListener('click', () => adjustZoom(0.1));
zoomOutBtn?.addEventListener('click', () => adjustZoom(-0.1));
zoomResetBtn?.addEventListener('click', resetZoom);

barHeightUpBtn?.addEventListener('click', () => adjustBarHeight(1));
barHeightDownBtn?.addEventListener('click', () => adjustBarHeight(-1));
barHeightResetBtn?.addEventListener('click', resetBarHeight);

timeTextUpBtn?.addEventListener('click', () => adjustTimeTextScale(0.1));
timeTextDownBtn?.addEventListener('click', () => adjustTimeTextScale(-0.1));
timeTextResetBtn?.addEventListener('click', resetTimeTextScale);

titleTextUpBtn?.addEventListener('click', () => adjustTitleTextScale(0.1));
titleTextDownBtn?.addEventListener('click', () => adjustTitleTextScale(-0.1));
titleTextResetBtn?.addEventListener('click', resetTitleTextScale);

timerDisplay.addEventListener('click', () => {
  if (timerState.running) return;
  if (!timerEditing) startTimerEditing();
});

timerDisplay.addEventListener('input', handleTimerDisplayInput);

timerDisplay.addEventListener('blur', () => {
  if (timerEditing) stopTimerEditing(true);
});

timerDisplay.addEventListener('keydown', (event) => {
  if (!timerEditing) {
    if (!timerState.running && event.key === 'Enter') {
      event.preventDefault();
      startTimerEditing();
    }
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    stopTimerEditing(true);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    stopTimerEditing(false);
  } else if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
    event.preventDefault();
  }
});

timerCircle.addEventListener('click', (event) => {
  if (timerState.running) return;
  if (event.target === timerDisplay) return;
  startTimerEditing();
});

window.addEventListener('resize', () => {
  applyTimerPanelSize();
  clampTimerPosition();
});

timerResizeHandle?.addEventListener('pointerdown', beginTimerResize);

timeFormatSel.addEventListener('change', () => {
  settings.timeFormat = timeFormatSel.value;
  persistSettings();
  renderSchedule();
});

showSecChk.addEventListener('change', () => {
  settings.showSeconds = showSecChk.checked;
  persistSettings();
});

offsetInp.addEventListener('change', () => {
  const value = offsetInp.value.trim();
  settings.clockOffsetMs = parseOffset(value);
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
  renderSchedule();
});

minus5sBtn.addEventListener('click', () => {
  settings.clockOffsetMs -= 5000;
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
});

plus5sBtn.addEventListener('click', () => {
  settings.clockOffsetMs += 5000;
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
});

alarmUploadInp.addEventListener('change', handleAlarmUpload);
clearAlarmBtn.addEventListener('click', clearAlarm);
playAlarmBtn.addEventListener('click', () => playAlarmSound());

addActivityBtn.addEventListener('click', () => {
  const lastDuration = template.activities.at(-1)?.durationMin || 45;
  template.activities.push({
    id: uuid(),
    title: 'New activity',
    icon: { type: 'emoji', value: '📘' },
    durationMin: lastDuration,
    startDeltaMin: settings.autoChain ? undefined : template.activities.length * lastDuration,
  });
  persistTemplate();
});

exportBtn.addEventListener('click', () => {
  const dateISO = todayISO();
  const bundle = {
    settings,
    template,
    today: loadScheduleDay(dateISO),
    exportedAt: new Date().toISOString(),
    version: 'ttw:v1',
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `schedule_export_${dateISO}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFileInp.click());
importFileInp.addEventListener('change', async () => {
  const file = importFileInp.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data?.version?.startsWith('ttw:v1')) throw new Error('Unsupported file');
    settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    settings.timerPanelSize = { ...DEFAULT_SETTINGS.timerPanelSize, ...(settings.timerPanelSize || {}) };
    template = data.template || deepClone(DEFAULT_TEMPLATE);
    saveSettings(settings);
    saveTemplate(template);
    scheduleDay = deriveScheduleForToday();
    loadUIFromSettings();
    populateEmojiOptions();
    renderActivitiesEditor();
    renderSchedule();
  } catch (err) {
    alert('Import failed. Please choose a compatible file.');
  } finally {
    importFileInp.value = '';
  }
});

resetTodayBtn.addEventListener('click', () => {
  scheduleDay = deriveScheduleForToday();
  renderSchedule();
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all locally saved data?')) return;
  clearAll();
  settings = { ...DEFAULT_SETTINGS };
  settings.timerPanelSize = { ...DEFAULT_SETTINGS.timerPanelSize };
  template = deepClone(DEFAULT_TEMPLATE);
  saveSettings(settings);
  saveTemplate(template);
  scheduleDay = deriveScheduleForToday();
  loadUIFromSettings();
  populateEmojiOptions();
  renderActivitiesEditor();
  renderSchedule();
});

renameTitleBtn.addEventListener('click', () => {
  setView('settings');
  titleTextInp.focus();
  titleTextInp.select();
});

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.tab));
});

toggleTimerBtn.addEventListener('click', () => {
  timerPanel.classList.toggle('visible');
  const showing = timerPanel.classList.contains('visible');
  timerPanel.setAttribute('aria-hidden', showing ? 'false' : 'true');
  if (showing) {
    if (timerPanel.classList.contains('floating')) clampTimerPosition();
    applyTimerPanelSize();
    updateTimerDisplay();
  } else {
    stopTimerEditing(false);
    stopAlarmSound();
  }
});

closeTimerBtn.addEventListener('click', () => {
  timerPanel.classList.remove('visible');
  timerPanel.setAttribute('aria-hidden', 'true');
  stopTimerEditing(false);
  stopAlarmSound();
  if (timerDragState.active) {
    timerDragState.active = false;
    timerDragState.pointerId = null;
    timerPanel.classList.remove('dragging');
  }
});

timerStartBtn.addEventListener('click', async () => {
  await ensureAudioCtx();
  if (timerState.remainingMs <= 0) {
    resetTimer();
  }
  setTimerRunning(true);
});

timerPauseBtn.addEventListener('click', () => {
  if (!timerState.running) return;
  setTimerRunning(false);
});

timerResetBtn.addEventListener('click', () => {
  resetTimer();
});

timerPresetBtns.forEach((btn) => {
  const seconds = Number(btn.dataset.add);
  btn.addEventListener('click', () => addTimerSeconds(seconds));
});

timerHeaderEl?.addEventListener('pointerdown', beginTimerDrag);
window.addEventListener('pointermove', handleTimerDragMove);
window.addEventListener('pointerup', endTimerDrag);
window.addEventListener('pointercancel', endTimerDrag);

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    scheduleDay = deriveScheduleForToday();
    renderSchedule();
  }
});

window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'opener:focus-request') window.focus();
  if (data.type === 'opener:show-settings') setView('settings');
  if (data.type === 'opener:show-schedule') setView('schedule');
});

if (!loadTemplate()) saveTemplate(template);

loadUIFromSettings();
populateEmojiOptions();
renderActivitiesEditor();
renderSchedule();
setView('schedule');
updateTimerDisplay();

const ticker = new RafTicker(() => {
  const now = new Date(Date.now() + settings.clockOffsetMs);
  nowTimeEl.textContent = formatTime(now);
  const refreshed = ensureScheduleForToday();
  renderSchedule();
  if (refreshed) sendStatus('New day started — schedule refreshed.');
  handleTimerTick();
});

ticker.start();
sendStatus('Widget ready.');
const applyIconSize = () => {
  document.body.dataset.iconSize = settings.iconSize || 'medium';
};

const applyBarHeight = () => {
  const height = Math.max(4, settings.barHeight || 9);
  settings.barHeight = height;
  document.documentElement.style.setProperty('--bar-height', `${height}px`);
  if (barHeightResetBtn) {
    barHeightResetBtn.textContent = `${height}px`;
  }
};

const applyZoom = () => {
  const scale = Math.min(1.6, Math.max(0.7, settings.zoomScale || 1));
  settings.zoomScale = scale;
  document.documentElement.style.setProperty('--zoom-scale', scale);
  try {
    document.body.style.zoom = `${scale}`;
  } catch (err) {
    // zoom not supported; font-size scaling via CSS variable is already applied
  }
  if (zoomResetBtn) {
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
  }
};

const applyTimeTextScale = () => {
  const scale = Math.min(2, Math.max(1, settings.timeTextScale || 1));
  settings.timeTextScale = scale;
  document.documentElement.style.setProperty('--time-text-scale', scale);
  if (timeTextResetBtn) {
    timeTextResetBtn.textContent = `Time ${Math.round(scale * 100)}%`;
  }
};

const applyTitleTextScale = () => {
  const scale = Math.min(2, Math.max(0.6, settings.titleTextScale || 1));
  settings.titleTextScale = scale;
  document.documentElement.style.setProperty('--title-text-scale', scale);
  if (titleTextResetBtn) {
    titleTextResetBtn.textContent = `Title ${Math.round(scale * 100)}%`;
  }
};


  timerPanel.style.width = `${width}px`;
  timerPanel.style.height = `${height}px`;
  document.documentElement.style.setProperty('--timer-panel-width', `${width}px`);
  document.documentElement.style.setProperty('--timer-panel-height', `${height}px`);
  const circleSize = Math.max(
    160,
    Math.min(width - 40, height - 160, 400)
  );
  document.documentElement.style.setProperty('--timer-circle-size', `${circleSize}px`);
};

const populateEmojiOptions = () => {
  if (!emojiDatalist) return;
  emojiDatalist.innerHTML = '';
  EMOJI_OPTIONS.forEach((emoji) => {
    const option = document.createElement('option');
    option.value = emoji;
    emojiDatalist.appendChild(option);
  });
};

const adjustBarHeight = (delta) => {
  const base = settings.barHeight || 9;
  const next = Math.max(4, Math.min(120, Math.round(base + delta)));
  if (next === base) return;
  settings.barHeight = next;
  applyBarHeight();
  persistSettings();
  renderSchedule();
};

const adjustZoom = (delta) => {
  const raw = (settings.zoomScale || 1) + delta;
  const next = Math.min(1.6, Math.max(0.7, Math.round(raw * 100) / 100));
  if (next === settings.zoomScale) return;
  settings.zoomScale = next;
  applyZoom();
  persistSettings();
};

const resetZoom = () => {
  settings.zoomScale = 1;
  applyZoom();
  persistSettings();
};

const resetBarHeight = () => {
  settings.barHeight = 9;
  applyBarHeight();
  persistSettings();
  renderSchedule();
};

const adjustTimeTextScale = (delta) => {
  const raw = (settings.timeTextScale || 1) + delta;
  const next = Math.min(2, Math.max(1, Math.round(raw * 100) / 100));
  if (next === settings.timeTextScale) return;
  settings.timeTextScale = next;
  applyTimeTextScale();
  persistSettings();
  renderSchedule();
};

const resetTimeTextScale = () => {
  settings.timeTextScale = 1;
  applyTimeTextScale();
  persistSettings();
  renderSchedule();
};

const adjustTitleTextScale = (delta) => {
  const raw = (settings.titleTextScale || 1) + delta;
  const next = Math.min(2, Math.max(0.6, Math.round(raw * 100) / 100));
  if (next === settings.titleTextScale) return;
  settings.titleTextScale = next;
  applyTitleTextScale();
  persistSettings();
  renderSchedule();
};

const resetTitleTextScale = () => {
  settings.titleTextScale = 1;
  applyTitleTextScale();
  persistSettings();
  renderSchedule();
};

const loadUIFromSettings = () => {
  applyIconSize();
  applyBarHeight();
  applyZoom();
  applyTimeTextScale();
  applyTitleTextScale();
  applyTimerPanelSize();
  headerTitleEl.textContent = settings.title || 'Class Schedule';
  headerTitleEl.style.display = settings.showTitle ? '' : 'none';
  showTitleChk.checked = !!settings.showTitle;
  titleTextInp.value = settings.title;
  startTimeInp.value = settings.startTime;
  autoChainChk.checked = !!settings.autoChain;
  iconSizeSel.value = settings.iconSize || 'medium';
  timeFormatSel.value = settings.timeFormat;
  showSecChk.checked = !!settings.showSeconds;
  offsetInp.value = formatOffset(settings.clockOffsetMs || 0);
  alarmStatusEl.textContent = settings.customAlarmName ? `Loaded: ${settings.customAlarmName}` : 'No custom sound loaded.';
};

const persistSettings = ({ rebuildDay = false } = {}) => {
  saveSettings(settings);
  if (rebuildDay) {
    scheduleDay = deriveScheduleForToday();
    renderSchedule();
    renderActivitiesEditor();
  }
};

const persistTemplate = () => {
  saveTemplate(template);
  scheduleDay = deriveScheduleForToday();
  renderSchedule();
  renderActivitiesEditor();
};

const sendStatus = (msg) => {
  if (window.opener) {
    window.opener.postMessage({ type: 'widget:status', message: msg }, '*');
  }
};

const setView = (view) => {
  document.body.dataset.view = view;
  const showSettings = view === 'settings';
  panelSchedule.classList.toggle('is-active', !showSettings);
  panelSettings.classList.toggle('is-active', showSettings);
  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (typeof sendStatus === 'function') {
    sendStatus(`Widget view: ${view}`);
  }
};

const applyIconTo = (container, icon) => {
  container.textContent = '';
  if (icon?.type === 'emoji' && icon.value) {
    container.textContent = icon.value;
  } else {
    container.textContent = '📘';
  }
};

const syncDayActivity = (index, mutator) => {
  const dayAct = scheduleDay.activities[index];
  if (!dayAct) return;
  mutator(dayAct);
  saveScheduleDay(scheduleDay.dateISO, scheduleDay);
};

const renderSchedule = () => {
  listEl.innerHTML = '';
  const appNow = Date.now() + settings.clockOffsetMs;
  let nextUp = null;

  scheduleDay.activities.forEach((act, index) => {
    const startDate = new Date(act.startISO);
    const endDate = new Date(act.endISO);
    const start = startDate.getTime();
    const end = endDate.getTime();
    const duration = Math.max(1, end - start);
    const progress = Math.min(1, Math.max(0, (appNow - start) / duration));
    let state = 'upcoming';
    if (progress >= 1) state = 'done';
    else if (progress > 0) state = 'in-progress';
    act.state = state;

    if (!nextUp && state === 'upcoming') nextUp = act;

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    if (state === 'done') card.classList.add('card--done');
    if (state === 'in-progress') card.classList.add('card--inprogress');

    const iconEl = document.createElement('div');
    iconEl.className = 'icon';
    applyIconTo(iconEl, act.icon);

    const cardMain = document.createElement('div');
    cardMain.className = 'card-main';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    const titleText = act.title || 'Untitled activity';
    titleEl.textContent = titleText;
    titleEl.classList.toggle('card-title--done', state === 'done');
    cardMain.appendChild(titleEl);

    const body = document.createElement('div');
    body.className = 'card-body';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress';
    const startTag = document.createElement('div');
    startTag.className = 'progress-tag progress-tag--start';
    startTag.textContent = formatTime(startDate);
    progressWrap.appendChild(startTag);
    const endTag = document.createElement('div');
    endTag.className = 'progress-tag progress-tag--end';
    endTag.textContent = formatTime(endDate);
    progressWrap.appendChild(endTag);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const progressPercent = Math.round(progress * 100);
    bar.style.setProperty('--w', `${progressPercent}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(progressPercent));
    progressWrap.appendChild(bar);

    let ariaText = '';
    startTag.classList.remove('hidden');
    endTag.classList.remove('hidden');

    if (state === 'in-progress') {
      const remainingMs = Math.max(0, end - appNow);
      const remainingLabel = document.createElement('div');
      remainingLabel.className = 'progress-label';
      remainingLabel.textContent = formatDuration(remainingMs);
      const rawPosition = progress * 100;
      const position = Math.min(95, Math.max(5, rawPosition));
      remainingLabel.style.left = `${position}%`;
      progressWrap.appendChild(remainingLabel);
      ariaText = `${formatDuration(remainingMs)} remaining`;
      if (rawPosition < 13) {
        startTag.classList.add('hidden');
      }
      if ((100 - rawPosition) < 13) {
        endTag.classList.add('hidden');
      }
    } else if (state === 'done') {
      ariaText = 'Complete';
    } else {
      ariaText = 'Upcoming';
    }
    bar.setAttribute('aria-valuetext', ariaText);

    body.appendChild(progressWrap);

    cardMain.appendChild(body);

    card.appendChild(iconEl);
    card.appendChild(cardMain);

    listEl.appendChild(card);

    if (remainingLabel) {
      requestAnimationFrame(() => {
        const labelRect = remainingLabel.getBoundingClientRect();
        const startRect = startTag.getBoundingClientRect();
        const endRect = endTag.getBoundingClientRect();
        if (labelRect.left <= startRect.right + 2) {
          startTag.classList.add('hidden');
        }
        if (labelRect.right >= endRect.left - 2) {
          endTag.classList.add('hidden');
        }
      });
    }
  });

  if (nextUp) {
    upNextEl.innerHTML = `Up next: <strong>${nextUp.title}</strong> at ${formatTime(new Date(nextUp.startISO))}`;
    footerEl.textContent = `Later: ${nextUp.title} (${formatRange(new Date(nextUp.startISO), new Date(nextUp.endISO))})`;
  } else if (scheduleDay.activities.length) {
    upNextEl.textContent = 'All scheduled activities are complete.';
    footerEl.textContent = 'Great work today!';
  } else {
    upNextEl.textContent = 'No activities yet. Add items in Settings.';
    footerEl.textContent = 'Open settings to create a schedule.';
  }
};

const ensureScheduleForToday = () => {
  const today = todayISO();
  if (scheduleDay.dateISO !== today) {
    scheduleDay = deriveScheduleForToday();
    renderActivitiesEditor();
    return true;
  }
  return false;
};

const renderActivitiesEditor = () => {
  activitiesListEl.innerHTML = '';
  if (!template.activities.length) {
    const empty = document.createElement('div');
    empty.className = 'fine';
    empty.textContent = 'No activities yet. Use “Add activity” to begin.';
    activitiesListEl.appendChild(empty);
    return;
  }

  const anchorDate = parseTimeToDate(settings.startTime);

  template.activities.forEach((act, index) => {
    const dayAct = scheduleDay.activities[index];
    const card = document.createElement('div');
    card.className = 'activity-card';

    const header = document.createElement('div');
    header.className = 'activity-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'row';
    const preview = document.createElement('div');
    preview.className = 'icon-preview';
    applyIconTo(preview, act.icon);
    titleGroup.appendChild(preview);
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${act.title || 'Untitled activity'}`;
    titleGroup.appendChild(title);
    header.appendChild(titleGroup);

    const controls = document.createElement('div');
    controls.className = 'activity-controls';

    const moveUp = document.createElement('button');
    moveUp.type = 'button';
    moveUp.textContent = 'Up';
    moveUp.disabled = index === 0;
    moveUp.addEventListener('click', () => {
      if (index === 0) return;
      const items = template.activities;
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      persistTemplate();
    });
    controls.appendChild(moveUp);

    const moveDown = document.createElement('button');
    moveDown.type = 'button';
    moveDown.textContent = 'Down';
    moveDown.disabled = index === template.activities.length - 1;
    moveDown.addEventListener('click', () => {
      if (index === template.activities.length - 1) return;
      const items = template.activities;
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      persistTemplate();
    });
    controls.appendChild(moveDown);

    const duplicate = document.createElement('button');
    duplicate.type = 'button';
    duplicate.textContent = 'Duplicate';
    duplicate.addEventListener('click', () => {
      const clone = deepClone(act);
      clone.id = uuid();
      template.activities.splice(index + 1, 0, clone);
      persistTemplate();
    });
    controls.appendChild(duplicate);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      if (!confirm(`Delete “${act.title || 'Untitled'}”?`)) return;
      template.activities.splice(index, 1);
      persistTemplate();
    });
    controls.appendChild(remove);

    header.appendChild(controls);
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'activity-grid';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = act.title || '';
    titleInput.addEventListener('input', () => {
      act.title = titleInput.value;
      title.textContent = `${index + 1}. ${act.title || 'Untitled activity'}`;
      syncDayActivity(index, (d) => { d.title = act.title; });
      saveTemplate(template);
      renderSchedule();
    });
    titleLabel.appendChild(titleInput);
    grid.appendChild(titleLabel);

    const durationLabel = document.createElement('label');
    durationLabel.textContent = 'Duration (minutes)';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '1';
    durationInput.max = '360';
    durationInput.value = String(Math.max(1, Number(act.durationMin) || 45));
    durationInput.addEventListener('change', () => {
      const value = Number(durationInput.value);
      act.durationMin = Number.isFinite(value) && value > 0 ? value : 45;
      durationInput.value = String(act.durationMin);
      persistTemplate();
    });
    durationLabel.appendChild(durationInput);
    grid.appendChild(durationLabel);

    const startLabel = document.createElement('label');
    startLabel.textContent = 'Start time';
    const startInput = document.createElement('input');
    startInput.type = 'time';
    const startDate = dayAct ? new Date(dayAct.startISO) : new Date(anchorDate.getTime() + index * (act.durationMin || 45) * 60000);
    startInput.value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
    startInput.disabled = !!settings.autoChain;
    startInput.title = settings.autoChain ? 'Disable auto-chain to edit start times.' : '';
    startInput.addEventListener('change', () => {
      if (settings.autoChain) return;
      const mins = minutesSinceAnchor(startInput.value, settings.startTime);
      act.startDeltaMin = mins;
      persistTemplate();
    });
    startLabel.appendChild(startInput);
    if (settings.autoChain) {
      const note = document.createElement('span');
      note.className = 'fine';
      note.textContent = 'Auto-chain is on';
      startLabel.appendChild(note);
    }
    grid.appendChild(startLabel);

    const iconLabel = document.createElement('label');
    iconLabel.textContent = 'Emoji icon';
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.placeholder = 'Choose or type emoji';
    iconInput.setAttribute('list', 'emojiOptions');
    iconInput.value = act.icon?.value || '';
    iconInput.addEventListener('input', () => {
      const value = iconInput.value.trim() || '📘';
      act.icon = { type: 'emoji', value };
      applyIconTo(preview, act.icon);
      syncDayActivity(index, (d) => { d.icon = { ...act.icon }; });
      saveTemplate(template);
      renderSchedule();
    });
    iconLabel.appendChild(iconInput);
    grid.appendChild(iconLabel);

    card.appendChild(grid);
    activitiesListEl.appendChild(card);
  });
};

const setTimerRunning = (running) => {
  if (running) stopTimerEditing(true);
  stopAlarmSound();
  timerState.running = running;
  if (running) {
    timerState.endTime = Date.now() + timerState.remainingMs;
  } else {
    timerState.remainingMs = Math.max(0, timerState.endTime ? timerState.endTime - Date.now() : timerState.remainingMs);
    timerState.endTime = null;
  }
  updateTimerDisplay();
};

const addTimerSeconds = (seconds) => {
  if (timerEditing) stopTimerEditing(true);
  stopAlarmSound();
  const delta = seconds * 1000;
  timerState.remainingMs = Math.max(0, timerState.remainingMs + delta);
  timerState.totalMs = Math.max(timerState.totalMs + delta, timerState.remainingMs || TIMER_DEFAULT_MS);
  if (timerState.running) timerState.endTime = Date.now() + timerState.remainingMs;
  updateTimerDisplay();
};

const resetTimer = () => {
  stopTimerEditing(false);
  stopAlarmSound();
  timerState.totalMs = TIMER_DEFAULT_MS;
  timerState.remainingMs = TIMER_DEFAULT_MS;
  timerState.running = false;
  timerState.endTime = null;
  updateTimerDisplay();
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const updateTimerDisplay = () => {
  if (!timerEditing) {
    timerDisplay.textContent = formatDuration(timerState.remainingMs);
  }
  const progress = 1 - Math.min(1, Math.max(0, timerState.remainingMs / Math.max(1, timerState.totalMs)));
  timerCircle.style.setProperty('--timer-progress', progress);
  timerDisplay.classList.toggle('editing', timerEditing);
  timerCircle.classList.toggle('editing', timerEditing);
};

const playAlarmSound = async () => {
  stopAlarmSound();
  if (settings.customAlarmData) {
    const audio = new Audio(settings.customAlarmData);
    timerState.alarmAudio = audio;
    audio.addEventListener('ended', () => {
      if (timerState.alarmAudio === audio) timerState.alarmAudio = null;
    });
    audio.onended = () => {
      if (timerState.alarmAudio === audio) timerState.alarmAudio = null;
    };
    audio.play().catch(() => { timerState.alarmAudio = null; });
    return;
  }
  await ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.25);
  timerState.alarmNode = osc;
  osc.addEventListener('ended', () => {
    if (timerState.alarmNode === osc) timerState.alarmNode = null;
  });
  osc.onended = () => {
    if (timerState.alarmNode === osc) timerState.alarmNode = null;
  };
};

const handleTimerTick = () => {
  if (!timerState.running) return;
  const remaining = timerState.endTime - Date.now();
  if (remaining <= 0) {
    timerState.remainingMs = 0;
    timerState.running = false;
    timerState.endTime = null;
    updateTimerDisplay();
    playAlarmSound();
  } else {
    timerState.remainingMs = remaining;
    updateTimerDisplay();
  }
};

const clampTimerPosition = () => {
  if (!timerPanel.classList.contains('floating')) return;
  const rect = timerPanel.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  let left = rect.left;
  let top = rect.top;
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  left = Math.min(maxLeft, Math.max(0, left));
  top = Math.min(maxTop, Math.max(0, top));
  timerPanel.style.left = `${left}px`;
  timerPanel.style.top = `${top}px`;
};

const beginTimerDrag = (event) => {
  if (!(event instanceof PointerEvent) || event.button !== 0 || !timerPanel.classList.contains('visible')) return;
  if (event.target instanceof HTMLElement && event.target.closest('button')) return;
  timerDragState.active = true;
  timerDragState.pointerId = event.pointerId;
  const rect = timerPanel.getBoundingClientRect();
  timerPanel.classList.add('floating', 'dragging');
  timerPanel.style.right = 'auto';
  timerPanel.style.left = `${rect.left}px`;
  timerPanel.style.top = `${rect.top}px`;
  timerDragState.offsetX = event.clientX - rect.left;
  timerDragState.offsetY = event.clientY - rect.top;
  timerPanel.dataset.positionSet = 'true';
  event.preventDefault();
};

const handleTimerDragMove = (event) => {
  if (!timerDragState.active || event.pointerId !== timerDragState.pointerId) return;
  const width = timerPanel.offsetWidth;
  const height = timerPanel.offsetHeight;
  let left = event.clientX - timerDragState.offsetX;
  let top = event.clientY - timerDragState.offsetY;
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  left = Math.min(maxLeft, Math.max(0, left));
  top = Math.min(maxTop, Math.max(0, top));
  timerPanel.style.left = `${left}px`;
  timerPanel.style.top = `${top}px`;
};

const endTimerDrag = (event) => {
  if (!timerDragState.active || (event && event.pointerId !== timerDragState.pointerId)) return;
  timerDragState.active = false;
  timerDragState.pointerId = null;
  timerPanel.classList.remove('dragging');
  clampTimerPosition();
};

const handleAlarmUpload = async () => {
  const file = alarmUploadInp.files?.[0];
  if (!file) return;
  if (file.size > MAX_AUDIO_BYTES) {
    alert('Please choose an audio file under 1.5 MB.');
    alarmUploadInp.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    settings.customAlarmData = reader.result;
    settings.customAlarmName = file.name;
    persistSettings();
    alarmStatusEl.textContent = `Loaded: ${file.name}`;
    alarmUploadInp.value = '';
  };
  reader.readAsDataURL(file);
};

const clearAlarm = () => {
  settings.customAlarmData = null;
  settings.customAlarmName = '';
  persistSettings();
  alarmStatusEl.textContent = 'No custom sound loaded.';
};

// Event bindings
showTitleChk.addEventListener('change', () => {
  settings.showTitle = showTitleChk.checked;
  persistSettings();
  loadUIFromSettings();
});

titleTextInp.addEventListener('input', () => {
  settings.title = titleTextInp.value;
  persistSettings();
  loadUIFromSettings();
});

startTimeInp.addEventListener('change', () => {
  settings.startTime = startTimeInp.value || '08:00';
  persistSettings({ rebuildDay: true });
});

autoChainChk.addEventListener('change', () => {
  settings.autoChain = autoChainChk.checked;
  persistSettings({ rebuildDay: true });
});

iconSizeSel.addEventListener('change', () => {
  settings.iconSize = iconSizeSel.value;
  persistSettings();
  applyIconSize();
  renderSchedule();
});

zoomInBtn?.addEventListener('click', () => adjustZoom(0.1));
zoomOutBtn?.addEventListener('click', () => adjustZoom(-0.1));
zoomResetBtn?.addEventListener('click', resetZoom);

barHeightUpBtn?.addEventListener('click', () => adjustBarHeight(1));
barHeightDownBtn?.addEventListener('click', () => adjustBarHeight(-1));
barHeightResetBtn?.addEventListener('click', resetBarHeight);

timeTextUpBtn?.addEventListener('click', () => adjustTimeTextScale(0.1));
timeTextDownBtn?.addEventListener('click', () => adjustTimeTextScale(-0.1));
timeTextResetBtn?.addEventListener('click', resetTimeTextScale);

titleTextUpBtn?.addEventListener('click', () => adjustTitleTextScale(0.1));
titleTextDownBtn?.addEventListener('click', () => adjustTitleTextScale(-0.1));
titleTextResetBtn?.addEventListener('click', resetTitleTextScale);

timerDisplay.addEventListener('click', () => {
  if (timerState.running) return;
  if (!timerEditing) startTimerEditing();
});

timerDisplay.addEventListener('input', handleTimerDisplayInput);

timerDisplay.addEventListener('blur', () => {
  if (timerEditing) stopTimerEditing(true);
});

timerDisplay.addEventListener('keydown', (event) => {
  if (!timerEditing) {
    if (!timerState.running && event.key === 'Enter') {
      event.preventDefault();
      startTimerEditing();
    }
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    stopTimerEditing(true);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    stopTimerEditing(false);
  } else if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
    event.preventDefault();
  }
});

timerCircle.addEventListener('click', (event) => {
  if (timerState.running) return;
  if (event.target === timerDisplay) return;
  startTimerEditing();
});

timerResizeHandle?.addEventListener('pointerdown', beginTimerResize);

timeFormatSel.addEventListener('change', () => {
  settings.timeFormat = timeFormatSel.value;
  persistSettings();
  renderSchedule();
});

showSecChk.addEventListener('change', () => {
  settings.showSeconds = showSecChk.checked;
  persistSettings();
});

offsetInp.addEventListener('change', () => {
  const value = offsetInp.value.trim();
  settings.clockOffsetMs = parseOffset(value);
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
  renderSchedule();
});

minus5sBtn.addEventListener('click', () => {
  settings.clockOffsetMs -= 5000;
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
});

plus5sBtn.addEventListener('click', () => {
  settings.clockOffsetMs += 5000;
  offsetInp.value = formatOffset(settings.clockOffsetMs);
  persistSettings();
});

alarmUploadInp.addEventListener('change', handleAlarmUpload);
clearAlarmBtn.addEventListener('click', clearAlarm);
playAlarmBtn.addEventListener('click', () => playAlarmSound());

addActivityBtn.addEventListener('click', () => {
  const lastDuration = template.activities.at(-1)?.durationMin || 45;
  template.activities.push({
    id: uuid(),
    title: 'New activity',
    icon: { type: 'emoji', value: '📘' },
    durationMin: lastDuration,
    startDeltaMin: settings.autoChain ? undefined : template.activities.length * lastDuration,
  });
  persistTemplate();
});

exportBtn.addEventListener('click', () => {
  const dateISO = todayISO();
  const bundle = {
    settings,
    template,
    today: loadScheduleDay(dateISO),
    exportedAt: new Date().toISOString(),
    version: 'ttw:v1',
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `schedule_export_${dateISO}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFileInp.click());
importFileInp.addEventListener('change', async () => {
  const file = importFileInp.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data?.version?.startsWith('ttw:v1')) throw new Error('Unsupported file');
    settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    template = data.template || deepClone(DEFAULT_TEMPLATE);
    saveSettings(settings);
    saveTemplate(template);
    scheduleDay = deriveScheduleForToday();
    loadUIFromSettings();
    populateEmojiOptions();
    renderActivitiesEditor();
    renderSchedule();
  } catch (err) {
    alert('Import failed. Please choose a compatible file.');
  } finally {
    importFileInp.value = '';
  }
});



tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.tab));
});

toggleTimerBtn.addEventListener('click', () => {
  timerPanel.classList.toggle('visible');
  const showing = timerPanel.classList.contains('visible');
  timerPanel.setAttribute('aria-hidden', showing ? 'false' : 'true');
  if (showing) {
    if (timerPanel.classList.contains('floating')) clampTimerPosition();
    updateTimerDisplay();
  } else {
    stopTimerEditing(false);
    stopAlarmSound();
  }
});

closeTimerBtn.addEventListener('click', () => {
  timerPanel.classList.remove('visible');
  timerPanel.setAttribute('aria-hidden', 'true');
  stopTimerEditing(false);
  stopAlarmSound();
  if (timerDragState.active) {
    timerDragState.active = false;
    timerDragState.pointerId = null;
    timerPanel.classList.remove('dragging');
  }
});

timerStartBtn.addEventListener('click', async () => {
  await ensureAudioCtx();
  if (timerState.remainingMs <= 0) {
    resetTimer();
  }
  setTimerRunning(true);
});

timerPauseBtn.addEventListener('click', () => {
  if (!timerState.running) return;
  setTimerRunning(false);
});

timerResetBtn.addEventListener('click', () => {
  resetTimer();
});

timerPresetBtns.forEach((btn) => {
  const seconds = Number(btn.dataset.add);
  btn.addEventListener('click', () => addTimerSeconds(seconds));
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    scheduleDay = deriveScheduleForToday();
    renderSchedule();
  }
});

window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'opener:focus-request') window.focus();
  if (data.type === 'opener:show-settings') setView('settings');
  if (data.type === 'opener:show-schedule') setView('schedule');
});

if (!loadTemplate()) saveTemplate(template);

loadUIFromSettings();
populateEmojiOptions();
renderActivitiesEditor();
renderSchedule();
setView('schedule');
updateTimerDisplay();

const ticker = new RafTicker(() => {
  const now = new Date(Date.now() + settings.clockOffsetMs);
  nowTimeEl.textContent = formatTime(now);
  const refreshed = ensureScheduleForToday();
  renderSchedule();
  if (refreshed) sendStatus('New day started — schedule refreshed.');
  handleTimerTick();
});

ticker.start();
sendStatus('Widget ready.');
