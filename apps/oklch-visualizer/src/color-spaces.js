import { converter, modeOklch, useMode } from 'culori';

// Naoyuki Uchida, Oklch+ (2026), section 3.5:
// https://arxiv.org/html/2606.05255v1#S3.SS5
// This experimental extension is registered locally with Culori, not CSS.
const ALPHA = 0.73;
const N = 0.87;
const SIGMA = 0.34;
const SIGMA_N = SIGMA ** N;
const signedPower = (value, exponent) => Math.sign(value) * Math.abs(value) ** exponent;

export function oklchToPlus(color) {
    const chroma = Math.max(0, color.c ?? 0) ** N;
    return {
        ...color,
        mode: 'oklch-plus',
        l: signedPower(color.l, ALPHA),
        c: chroma / (chroma + SIGMA_N)
    };
}

export function plusToOklch(color) {
    const c = color.c ?? 0;
    if (!Number.isFinite(c) || c < 0 || c >= 1) {
        throw new RangeError('Oklch+ chroma must be in [0, 1).');
    }
    return {
        ...color,
        mode: 'oklch',
        l: signedPower(color.l, 1 / ALPHA),
        c: SIGMA * (c / (1 - c)) ** (1 / N)
    };
}

const toRgb = converter('rgb');
const toOklch = converter('oklch');

useMode({
    ...modeOklch,
    mode: 'oklch-plus',
    // Do not register the native oklch() parser/serializer for different coordinates.
    parse: [],
    serialize: undefined,
    ranges: { ...modeOklch.ranges, c: [0, 0.55] },
    toMode: {
        oklch: plusToOklch,
        rgb: color => toRgb(plusToOklch(color))
    },
    fromMode: {
        oklch: oklchToPlus,
        rgb: color => oklchToPlus(toOklch(color))
    }
});

export const COLOR_SPACES = {
    oklch: { label: 'OKLCH', maxChroma: 0.4 },
    'oklch-plus': { label: 'Oklch+', maxChroma: 0.55 }
};

// Cartesian coordinates of the selected space, including transformed L/C in Oklch+.
export function toCartesian({ l, c, h = 0 }) {
    const radians = h * Math.PI / 180;
    return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}
