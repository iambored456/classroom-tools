// requestAnimationFrame-based ticker with throttling ~10-15 fps

export class RafTicker {
  constructor(callback, targetFps = 12) {
    this.cb = callback;
    this.target = 1000 / Math.max(1, targetFps);
    this._raf = null;
    this._last = 0;
    this._running = false;
  }
  start() {
    if (this._running) return;
    this._running = true;
    const loop = (t) => {
      if (!this._running) return;
      if (!this._last) this._last = t;
      const dt = t - this._last;
      if (dt >= this.target) {
        this._last = t;
        try { this.cb(performance.now()); } catch {}
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._last = 0;
  }
}

export function parseOffset(text) {
  // "+mm:ss" or "-mm:ss" or "+m" (minutes)
  if (!text) return 0;
  const m = String(text).trim().match(/^([+-])?(\d{1,3})(?::(\d{2}))?$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const mm = parseInt(m[2] || '0', 10);
  const ss = parseInt(m[3] || '0', 10);
  return sign * ((mm * 60 + ss) * 1000);
}

export function formatOffset(ms) {
  const sign = ms < 0 ? '-' : '+';
  const v = Math.abs(ms) / 1000 | 0;
  const mm = Math.floor(v / 60);
  const ss = v % 60;
  return `${sign}${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

