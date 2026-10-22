import assert from 'node:assert/strict';
import test from 'node:test';
import { Visuals } from '../js/visuals.ts';
import { Clock } from '../js/clock.ts';
import { Settings } from '../js/settings.ts';

// Node has no document; provide the property so each test can mock and restore it.
Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: undefined });

test('hidden particle checks defer filling until a single visible resync', t => {
    t.mock.property(globalThis, 'document', { hidden: true });
    const mode = t.mock.method(Settings, 'getVisualizationMode', () => 'water');
    const updates: string[] = [];
    t.mock.method(Clock, 'update', () => {
        assert.equal(Visuals.waterNeedsProgressSync, true);
        updates.push('clock');
    });
    t.mock.method(Visuals, 'syncWaterBarsToCurrentProgress', () => updates.push('fill'));
    Visuals.waterNeedsProgressSync = false;
    for (let i = 0; i < 100; i++) Visuals.checkAndAddWaterParticles();
    assert.equal(Visuals.waterNeedsProgressSync, true);
    assert.deepEqual(updates, []);
    assert.equal(mode.mock.callCount(), 0);

    document.hidden = false;
    Visuals.handleVisibilityChange();
    assert.deepEqual(updates, ['clock', 'fill']);
    assert.equal(Visuals.waterNeedsProgressSync, false);
    Visuals.handleVisibilityChange();
    assert.deepEqual(updates, ['clock', 'fill']);
});

test('particle check also resyncs if it runs before the visible event', t => {
    t.mock.property(globalThis, 'document', { hidden: false });
    t.mock.method(Settings, 'getVisualizationMode', () => 'water');
    t.mock.method(Clock, 'update', () => {});
    const sync = t.mock.method(Visuals, 'syncWaterBarsToCurrentProgress', () => {});
    Visuals.waterNeedsProgressSync = true;
    Visuals.checkAndAddWaterParticles();
    assert.equal(sync.mock.callCount(), 1);
    assert.equal(Visuals.waterNeedsProgressSync, false);
});

test('background and resumed period changes skip drain replay', t => {
    t.mock.property(globalThis, 'document', { hidden: true });
    t.mock.method(Settings, 'getVisualizationMode', () => 'water');
    const setup = t.mock.method(Visuals, 'setupPhysicsWaterFill', async () => {});
    Visuals.waterNeedsProgressSync = false;
    Visuals.handlePeriodChange(null);
    assert.equal(setup.mock.calls[0].arguments[1].animateDrainReset, false);
    document.hidden = false;
    Visuals.waterNeedsProgressSync = true;
    Visuals.handlePeriodChange(null);
    assert.equal(setup.mock.calls[1].arguments[1].animateDrainReset, false);
    Visuals.waterNeedsProgressSync = false;
    Visuals.handlePeriodChange(null);
    assert.equal(setup.mock.calls[2].arguments[1].animateDrainReset, true);
});

test('returning in another visualization does not restart water', t => {
    t.mock.property(globalThis, 'document', { hidden: false });
    t.mock.method(Settings, 'getVisualizationMode', () => 'sand');
    const sync = t.mock.method(Visuals, 'syncWaterBarsToCurrentProgress', () => {});
    const clock = t.mock.method(Clock, 'update', () => {});
    Visuals.waterNeedsProgressSync = true;
    Visuals.handleVisibilityChange();
    assert.equal(sync.mock.callCount(), 0);
    assert.equal(clock.mock.callCount(), 0);
    assert.equal(Visuals.waterNeedsProgressSync, false);
});
