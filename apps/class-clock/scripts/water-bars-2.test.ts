import assert from 'node:assert/strict';
import test from 'node:test';
import { createFallbackFillLayout } from '../js/fillLayout.ts';
import { WATER_STEP, WaterBarSimulation } from '../js/waterBars2Simulation.ts';
import { normalizeVisualizationMode, isLegacyFillMode } from '../js/visualizationModes.ts';

function makeBar(width = 1024, height = 240) {
    const bar = new WaterBarSimulation(createFallbackFillLayout(width, height, 5).bars[2], () => 0.5);
    bar.setProgress(0.45, 'current');
    bar.setDetail(5);
    return bar;
}

test('both water modes remain selectable and persist without falling back to progress', () => {
    assert.equal(normalizeVisualizationMode('water'), 'water');
    assert.equal(normalizeVisualizationMode('water2'), 'water2');
    assert.equal(isLegacyFillMode('water2'), true);
});

test('drops form, detach, hit the pool, and leave the clock fill unchanged', () => {
    const bar = makeBar();
    for (let step = 0; step < 120; step++) bar.step();
    assert.ok(bar.formation > 0);
    assert.ok(bar.shapes().length >= 2, 'hanging bead and neck are visible before detachment');
    for (let step = 0; step < 360; step++) bar.step();
    assert.ok(bar.impacts >= 1);
    assert.ok(bar.offsets.some(offset => Math.abs(offset) > 0.01));
    assert.equal(bar.ratio, 0.45);
});

test('each bead holds its random top position until detaching, with sources spanning the jar', () => {
    const samples = [0.01, 0.99, 0.2, 0.8, 0.5];
    let sample = 0;
    const bar = new WaterBarSimulation(createFallbackFillLayout(1024, 240, 5).bars[2], () => samples[sample++ % samples.length]);
    bar.setProgress(0, 'current'); // No splash randomness in an empty jar.
    bar.setDetail(5);
    const sources: number[] = [];
    for (let cycle = 0; cycle < 4; cycle++) {
        for (let step = 0; step < 100; step++) bar.step();
        const formingX = bar.shapes()[0].x;
        for (let step = 0; step < 50; step++) bar.step();
        assert.equal(bar.shapes()[0].x, formingX, 'a growing bead does not slide across the rim');
        let detached = false;
        for (let step = 0; step < 100; step++) {
            const previous = new Set(bar.drops);
            bar.step();
            const drop = bar.drops.find(drop => !previous.has(drop) && !drop.splash);
            if (drop) {
                assert.equal(drop.x, formingX, 'the falling drop begins at the bead position');
                assert.ok(drop.x - drop.radius >= bar.bounds.x);
                assert.ok(drop.x + drop.radius <= bar.bounds.x + bar.bounds.width);
                sources.push(drop.x);
                detached = true;
                break;
            }
        }
        assert.ok(detached);
    }
    assert.equal(new Set(sources).size, 4);
    assert.ok(Math.min(...sources) < bar.bounds.x + bar.bounds.width * 0.25);
    assert.ok(Math.max(...sources) > bar.bounds.x + bar.bounds.width * 0.75);
});

test('impact waves spread to the edges, remain bounded, and settle', () => {
    const bar = makeBar();
    bar.impulse(bar.bounds.x + bar.bounds.width / 2, 350, 5);
    for (let step = 0; step < 120; step++) bar.step(WATER_STEP, false);
    assert.ok(Math.abs(bar.offsets[0]) > 0.0001, 'wave reaches a container wall');
    const peak = Math.max(...bar.offsets.map(Math.abs));
    for (let step = 0; step < 1200; step++) bar.step(WATER_STEP, false);
    assert.ok(Math.max(...bar.offsets.map(Math.abs)) < peak * 0.02);
    assert.ok(bar.offsets.every(Number.isFinite));
});

test('very narrow and large layouts remain finite through sustained impacts', () => {
    for (const [width, height] of [[240, 80], [3840, 1600]]) {
        const bar = makeBar(width, height);
        bar.setDetail(100);
        for (let step = 0; step < 7200; step++) bar.step();
        assert.ok(bar.offsets.every(Number.isFinite));
        assert.ok(bar.velocities.every(Number.isFinite));
        assert.ok(bar.drops.length <= 18);
        assert.ok(Math.max(...bar.offsets.map(Math.abs)) <= bar.bounds.height * 0.12);
    }
});

test('completed and future stages stop emitting, and a nearly full stage has no clipped drip', () => {
    const bar = makeBar();
    for (const [progress, status] of [[1, 'completed'], [0, 'future'], [0.99, 'current']] as const) {
        bar.clearMotion();
        bar.setProgress(progress, status);
        for (let step = 0; step < 600; step++) bar.step();
        assert.equal(bar.shapes().length, 0);
    }
});

test('clock seeks set exact levels immediately and resizing clears stray particles', () => {
    const bar = makeBar();
    for (let step = 0; step < 215; step++) bar.step();
    assert.ok(bar.drops.length > 0);
    bar.setProgress(0.73125, 'current');
    assert.equal(bar.ratio, 0.73125);
    bar.clearMotion();
    assert.equal(bar.drops.length, 0);
    assert.ok(bar.offsets.every(offset => offset === 0));
});
