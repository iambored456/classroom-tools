import assert from 'node:assert/strict';
import test from 'node:test';
import { WaterBars } from '../js/waterBars.ts';

function setup(fillUnits: number, radius: number) {
    WaterBars.width = 600;
    WaterBars.height = 150;
    WaterBars.barCapacity = 100;
    WaterBars.ctx = {};
    WaterBars.isInitialized = true;
    WaterBars.setParticleRadius(radius);
    WaterBars.rebuildBars([fillUnits]);
}

for (const radius of [1.6, 3, 12]) {
    test(`nearly full bar shows a droplet before merging (radius ${radius})`, () => {
        setup(99, radius);
        assert.equal(WaterBars.addDroplet(0, '#ff0000'), true);
        for (let frame = 0; frame < 8; frame++) WaterBars.updateDroplets(1 / 60);
        assert.equal(WaterBars.getPendingForBar(0), 1);
        assert.equal(WaterBars.bars[0].fillUnits, 99);
        const drop = WaterBars.droplets[0];
        assert.ok(drop.y > WaterBars.bars[0].yTop);
        assert.ok(drop.y < WaterBars.bars[0].yBottom);
        assert.equal(drop.vy, 0);
        for (let frame = 0; frame < 5; frame++) WaterBars.updateDroplets(1 / 60);
        assert.equal(WaterBars.getPendingForBar(0), 0);
        assert.equal(WaterBars.bars[0].fillUnits, 100);
        WaterBars.updateDroplets(1);
        assert.equal(WaterBars.bars[0].fillUnits, 100);
    });
}

test('droplet still falls normally when there is enough space', () => {
    setup(0, 3);
    WaterBars.addDroplet(0, '#ff0000');
    const initialY = WaterBars.droplets[0].y;
    for (let frame = 0; frame < 12; frame++) WaterBars.updateDroplets(1 / 60);
    assert.equal(WaterBars.getPendingForBar(0), 1);
    assert.ok(WaterBars.droplets[0].y > initialY);
    assert.ok(WaterBars.droplets[0].vy > 0);
    assert.equal(WaterBars.bars[0].fillUnits, 0);
    for (let frame = 0; frame < 90; frame++) WaterBars.updateDroplets(1 / 60);
    assert.equal(WaterBars.getPendingForBar(0), 0);
    assert.equal(WaterBars.bars[0].fillUnits, 1);
});
