import assert from 'node:assert/strict';
import test from 'node:test';
import { converter, formatHex, parse } from 'culori';
import { oklchToPlus, plusToOklch, toCartesian } from './color-spaces.js';

const close = (actual, expected, tolerance = 1e-10) =>
    assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('published half-saturation, black, and white anchors', () => {
    const half = oklchToPlus({ l: 1, c: 0.34, h: 120, alpha: 0.5 });
    close(half.l, 1);
    close(half.c, 0.5);
    assert.equal(half.h, 120);
    assert.equal(half.alpha, 0.5);
    close(plusToOklch(half).c, 0.34);
    assert.equal(formatHex({ mode: 'oklch-plus', l: 0, c: 0 }), '#000000');
    assert.equal(formatHex({ mode: 'oklch-plus', l: 1, c: 0 }), '#ffffff');
});

test('converting to Oklch+ and back preserves sRGB colours across the cube', () => {
    const toPlus = converter('oklch-plus');
    const toRgb = converter('rgb');
    // Sample exact 8-bit colours, avoiding half-byte rounding ties at e.g. 0.5.
    const levels = [0, 64 / 255, 128 / 255, 192 / 255, 1];
    for (const r of levels) {
        for (const g of levels) {
            for (const b of levels) {
                const source = { mode: 'rgb', r, g, b, alpha: 0.7 };
                const roundTrip = toRgb(toPlus(source));
                for (const channel of ['r', 'g', 'b']) close(roundTrip[channel], source[channel], 1e-6);
                close(roundTrip.alpha, 0.7);
                assert.equal(formatHex(toPlus(source)), formatHex(source));
            }
        }
    }
});

test('forward/inverse transforms retain hue and coordinates including zero chroma', () => {
    for (const l of [0, 0.001, 0.35, 0.7, 1]) {
        for (const c of [0, 0.001, 0.1, 0.34, 0.4]) {
            const source = { mode: 'oklch', l, c, h: 270 };
            const roundTrip = plusToOklch(oklchToPlus(source));
            close(roundTrip.l, l);
            close(roundTrip.c, c);
            close(roundTrip.h, 270);
        }
    }
});

test('same coordinates produce different colours without hijacking CSS oklch()', () => {
    const standard = { mode: 'oklch', l: 0.7, c: 0.1, h: 40 };
    assert.notEqual(formatHex(standard), formatHex({ ...standard, mode: 'oklch-plus' }));
    assert.equal(parse('oklch(0.7 0.1 40)').mode, 'oklch');
    assert.equal(formatHex('oklch(0.7 0.1 40)'), formatHex(standard));
});

test('3D coordinates use transformed axes and hue in degrees', () => {
    const plus = oklchToPlus({ l: 0.7, c: 0.34, h: 90 });
    const point = toCartesian(plus);
    close(point.a, 0);
    close(point.b, 0.5);
    close(point.l, 0.7 ** 0.73);
});

test('inverse rejects the chroma singularity and invalid inputs', () => {
    for (const c of [-0.1, 1, 2, NaN, Infinity]) {
        assert.throws(() => plusToOklch({ l: 0.7, c, h: 0 }), RangeError);
    }
});
