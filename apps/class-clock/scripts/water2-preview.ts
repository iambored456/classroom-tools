import { WaterBars2 } from '../js/waterBars2.ts';
import { measureFillLayout } from '../js/fillLayout.ts';

const container = document.querySelector<HTMLElement>('#water-fill-container')!;
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
// Exercise devices with no WebGL as well as the context-loss path, without changing global APIs.
if (new URLSearchParams(location.search).has('canvas')) {
    const getContext = canvas.getContext.bind(canvas);
    canvas.getContext = ((kind: string, options?: object) => kind === 'webgl' ? null : getContext(kind, options)) as typeof canvas.getContext;
}
const progress = document.querySelector<HTMLInputElement>('#progress')!;
const detail = document.querySelector<HTMLInputElement>('#detail')!;
let palette = false;
let light = false;
const measureLayout = () => measureFillLayout(container, container.querySelectorAll('.water-fill-outline-segment'), 5);
const getState = () => ({ bars: Array.from({ length: 5 }, (_, index) => {
    const ratio = palette ? [0.25, 0.4, 0.55, 0.7, 0.85][index] : Math.max(0, Math.min(1, Number(progress.value) / 100 * 5 - index));
    return { progress: ratio, status: ratio >= 1 ? 'completed' : ratio <= 0 ? 'future' : 'current' };
}) });
function init() {
    const layout = measureLayout();
    WaterBars2.init(canvas, layout.width, layout.height, { measureLayout, getState, particleRadius: Number(detail.value), backgroundColor: light ? '#f0f0f0' : '#080b0f' });
    WaterBars2.syncProgress();
    WaterBars2.start();
}
init();
new ResizeObserver(() => { const layout = measureLayout(); WaterBars2.resize(layout.width, layout.height); WaterBars2.syncProgress(); WaterBars2.renderOnce(); }).observe(container);
progress.addEventListener('input', () => { palette = false; WaterBars2.syncProgress(); WaterBars2.renderOnce(); });
detail.addEventListener('input', init);
document.querySelector('#palette')!.addEventListener('click', () => { palette = !palette; WaterBars2.syncProgress(); WaterBars2.renderOnce(); });
document.querySelector('#drain')!.addEventListener('click', async () => { await WaterBars2.drainReset(); WaterBars2.syncProgress(); WaterBars2.renderOnce(); });
document.querySelector('#theme')!.addEventListener('click', event => {
    light = !light;
    document.body.classList.toggle('light', light);
    (event.target as HTMLButtonElement).textContent = light ? 'Dark background' : 'Light background';
    WaterBars2.setBackgroundColor(light ? '#f0f0f0' : '#080b0f');
});
document.querySelector('#pause')!.addEventListener('click', event => {
    if (WaterBars2.isRunning) WaterBars2.stop(); else WaterBars2.start();
    (event.target as HTMLButtonElement).textContent = WaterBars2.isRunning ? 'Pause' : 'Resume';
});
// Only this development fixture intentionally loses a context, to exercise the production recovery.
const context = canvas.getContext('webgl');
const contextControl = context?.getExtension('WEBGL_lose_context');
document.querySelector('#context')!.addEventListener('click', () => contextControl?.loseContext());
document.querySelector('#restore')!.addEventListener('click', () => contextControl?.restoreContext());
setInterval(() => {
    const error = context && !context.isContextLost() ? context.getError() : 0;
    const impacts = WaterBars2.bars.reduce((sum, bar) => sum + bar.impacts, 0);
    const drops = WaterBars2.bars.reduce((sum, bar) => sum + bar.drops.length, 0);
    document.querySelector('output')!.textContent = `Renderer: ${WaterBars2.renderer} · GL error: ${error} · Impacts: ${impacts} · Airborne drops: ${drops} · Fill: ${WaterBars2.bars.map(bar => bar.ratio.toFixed(3)).join(', ')} · Reduced motion: ${matchMedia('(prefers-reduced-motion: reduce)').matches}`;
}, 250);
