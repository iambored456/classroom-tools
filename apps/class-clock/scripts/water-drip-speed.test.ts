import assert from 'node:assert/strict';
import test from 'node:test';
import { Appearance } from '../js/appearance.ts';
import { Settings } from '../js/settings.ts';
import { Visuals } from '../js/visuals.ts';
import { State } from '../js/state.ts';
import { Clock } from '../js/clock.ts';
import { DOM } from '../js/dom.ts';
import { WaterBars } from '../js/waterBars.ts';

function period(durationMinutes: number) {
    const start = new Date('2026-10-23T00:00:00Z');
    return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
}

function targetAt(periodInfo, capacity: number, elapsedSeconds: number) {
    const now = new Date(periodInfo.start.getTime() + elapsedSeconds * 1000);
    return Visuals.getTimelineTargetUnits(capacity, periodInfo, now, 0).targetUnits.reduce((sum, units) => sum + units, 0);
}

for (const speed of [0.05, 0.1, 0.5, 2]) {
    test(`${speed} drops/sec stays consistent across section lengths and all five bars`, t => {
        t.mock.property(Settings, 'preferences', { ...Settings.defaultPreferences, waterDripSpeed: speed });
        for (const minutes of [10, 75, 530]) {
            const section = period(minutes);
            const metrics = Visuals.calculateWaterMetrics({}, section);
            for (let barIndex = 0; barIndex < State.SAND_COLORS.length; barIndex++) {
                const elapsed = minutes * 60 * barIndex / State.SAND_COLORS.length + 12.05;
                const drops = targetAt(section, metrics.capacityPerBar, elapsed + 60)
                    - targetAt(section, metrics.capacityPerBar, elapsed);
                assert.equal(drops, speed * 60, `${minutes} minute section, bar ${barIndex}`);
                const barStart = minutes * 60 * barIndex / State.SAND_COLORS.length;
                const firstDropAt = barStart + 1 / speed;
                assert.equal(targetAt(section, metrics.capacityPerBar, firstDropAt - 0.01), barIndex * metrics.capacityPerBar);
                assert.equal(targetAt(section, metrics.capacityPerBar, firstDropAt + 0.01), barIndex * metrics.capacityPerBar + 1);
            }
            const nearEnd = targetAt(section, metrics.capacityPerBar, minutes * 60 - 0.01);
            assert.equal(nearEnd, metrics.totalCapacity - 1);
        }
    });
}

test('resizing and sand detail do not change water cadence or droplet size', t => {
    t.mock.property(Settings, 'preferences', { ...Settings.defaultPreferences });
    const section = period(75);
    const original = Visuals.calculateWaterMetrics({ width: 600, height: 150 }, section);
    Settings.preferences.sandParticleSize = 20;
    assert.deepEqual(Visuals.calculateWaterMetrics({ width: 1200, height: 300 }, section), original);
});

test('saved drip speeds are bounded, with a default for existing settings', () => {
    assert.equal(Settings.getWaterDripSpeed({}), 0.5);
    assert.equal(Settings.getWaterDripSpeed({ waterDripSpeed: 'invalid' }), 0.5);
    assert.equal(Settings.getWaterDripSpeed({ waterDripSpeed: -1 }), 0.05);
    assert.equal(Settings.getWaterDripSpeed({ waterDripSpeed: 100 }), 2);
    assert.equal(Settings.getWaterDripSpeed({ waterDripSpeed: 0.18 }), 0.2);
    assert.equal(Settings.getWaterDripSpeed({ waterDripSpeed: 0.05 }), 0.05);
});

Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: undefined });
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, writable: true, value: undefined });

test('section changes drain the outgoing capacity before applying the next drip rate', async t => {
    t.mock.property(Settings, 'preferences', { ...Settings.defaultPreferences, visualizationMode: 'water' });
    t.mock.property(globalThis, 'document', { hidden: false });
    t.mock.property(globalThis, 'requestAnimationFrame', callback => { callback(0); return 1; });
    t.mock.method(globalThis, 'setInterval', () => 1 as any);
    Object.assign(DOM, { waterFillCanvas: {}, waterFillContainerEl: {} });
    t.after(() => { delete DOM.waterFillCanvas; delete DOM.waterFillContainerEl; });
    t.mock.method(Clock, 'getCurrentPeriodInfo', () => period(75) as any);
    t.mock.method(Visuals, 'getWaterFillLayout', () => ({ width: 600, height: 150 }) as any);
    t.mock.method(Visuals, 'syncWaterBarsToCurrentProgress', () => {});
    t.mock.method(Visuals, 'handleColorSchemeChange', () => {});
    t.mock.method(Visuals, 'checkAndAddWaterParticles', () => {});
    t.mock.property(State, 'physicsCheckIntervalId', null);
    t.mock.property(WaterBars, 'barCapacity', 600);
    const order: string[] = [];
    t.mock.method(WaterBars, 'drainReset', async () => {
        assert.equal(WaterBars.barCapacity, 600);
        order.push('drain');
    });
    t.mock.method(WaterBars, 'init', () => { order.push('init'); });
    t.mock.method(WaterBars, 'start', () => {});
    await Visuals.setupPhysicsWaterFill(period(75), { animateDrainReset: true });
    assert.deepEqual(order, ['drain', 'init']);
    assert.equal(WaterBars.barCapacity, 450);
});

test('Water Bars replaces Animation Detail with Drip Speed when modes change', t => {
    t.mock.property(Settings, 'preferences', { ...Settings.defaultPreferences, visualizationMode: 'water' });
    const detailRow = { hidden: false };
    const dripRow = { hidden: true };
    t.mock.property(globalThis, 'document', {
        getElementById: id => id === 'animation-detail-pref' ? detailRow : dripRow,
        querySelectorAll: () => []
    });
    Appearance.updateInputs();
    assert.equal(detailRow.hidden, true);
    assert.equal(dripRow.hidden, false);
    Settings.preferences.visualizationMode = 'sand';
    Appearance.updateInputs();
    assert.equal(detailRow.hidden, false);
    assert.equal(dripRow.hidden, true);
});
