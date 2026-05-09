import { createFallbackFillLayout } from './fillLayout.ts';
import { State } from './state.ts';

const BAR_COUNT = 5;
const CANDLE_TINT_COLORS = State.SAND_COLORS;
const MODE_ACCENTS = {
    candle: '#ffbd73',
    ice: '#84dbff',
    plant: '#92d35f',
    bubbles: '#8cecff'
};
const PLANT_STAGE_SPECS = [
    { stemCount: 1, stemHeight: 0.2, leafPairs: 1, buds: 0, flowers: 0, flowerColor: '#ffe29a' },
    { stemCount: 1, stemHeight: 0.34, leafPairs: 2, buds: 0, flowers: 0, flowerColor: '#ffe29a' },
    { stemCount: 2, stemHeight: 0.46, leafPairs: 3, buds: 0, flowers: 0, flowerColor: '#ffe29a' },
    { stemCount: 2, stemHeight: 0.58, leafPairs: 4, buds: 1, flowers: 0, flowerColor: '#ffc27a' },
    { stemCount: 3, stemHeight: 0.68, leafPairs: 4, buds: 0, flowers: 3, flowerColor: '#ffb1c8' }
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
    return start + ((end - start) * amount);
}

function rgba(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(hex, fallback = { r: 255, g: 255, b: 255 }) {
    if (typeof hex !== 'string') return fallback;
    const normalized = hex.trim().replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(character => `${character}${character}`).join('')
        : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
}

function lighten(rgb, amount) {
    return {
        r: clamp(Math.round(rgb.r + amount), 0, 255),
        g: clamp(Math.round(rgb.g + amount), 0, 255),
        b: clamp(Math.round(rgb.b + amount), 0, 255)
    };
}

function darken(rgb, amount) {
    return lighten(rgb, -amount);
}

function mixRgb(a, b, amount) {
    const ratio = clamp(Number(amount) || 0, 0, 1);
    return {
        r: Math.round(lerp(a.r, b.r, ratio)),
        g: Math.round(lerp(a.g, b.g, ratio)),
        b: Math.round(lerp(a.b, b.b, ratio))
    };
}

function addRoundedRectPath(ctx, x, y, width, height, radius) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.arcTo(x, y, x + safeRadius, y, safeRadius);
    ctx.closePath();
}

function createSeededRandom(seed) {
    let value = seed >>> 0;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function createDefaultState() {
    return {
        active: false,
        overallProgress: 0,
        bars: Array.from({ length: BAR_COUNT }, (_, index) => ({
            index,
            status: 'future',
            progress: 0
        }))
    };
}

function createBarModel(layoutBar, index) {
    const random = createSeededRandom((index + 1) * 7919);
    const width = layoutBar.width;
    const height = layoutBar.height;
    const baseX = layoutBar.x;
    const baseY = layoutBar.yTop;
    const planterY = baseY + (height * 0.77);

    return {
        ...layoutBar,
        index,
        candleLean: (random() - 0.5) * 0.08,
        dripOffset: random() * Math.PI * 2,
        bubbleOffsets: Array.from({ length: 24 }, (_, bubbleIndex) => ({
            seed: random(),
            radius: lerp(width * 0.035, width * 0.11, random()),
            sway: random() * Math.PI * 2,
            speed: lerp(0.35, 1, random()),
            lane: bubbleIndex / 23
        })),
        branchSegments: buildFractalSegments(baseX + (width / 2), baseY + height - 6, Math.min(width, height) * 0.2, Math.PI / 2, 5, createSeededRandom((index + 1) * 193)),
        stalks: Array.from({ length: 2 + index }, (_, stalkIndex) => ({
            x: baseX + lerp(width * 0.22, width * 0.78, (stalkIndex + 1) / (index + 3)),
            sway: random() * Math.PI * 2,
            heightFactor: lerp(0.62, 1, random())
        })),
        planterY
    };
}

function buildFractalSegments(x, y, length, angle, depth, random) {
    if (depth <= 0 || length < 2) return [];

    const endX = x + (Math.cos(angle) * length);
    const endY = y - (Math.sin(angle) * length);
    const segment = { x1: x, y1: y, x2: endX, y2: endY, depth };
    const branchCount = depth > 3 ? 2 : 3;
    const nextLength = length * lerp(0.64, 0.78, random());
    const spread = lerp(0.36, 0.62, random());

    let childSegments = [];
    for (let branchIndex = 0; branchIndex < branchCount; branchIndex++) {
        const branchOffset = ((branchIndex - ((branchCount - 1) / 2)) * spread) + ((random() - 0.5) * 0.16);
        childSegments = childSegments.concat(
            buildFractalSegments(endX, endY, nextLength, angle + branchOffset, depth - 1, random)
        );
    }

    return [segment, ...childSegments];
}

function insetBar(bar, insetX, insetY = insetX) {
    return {
        x: bar.x + insetX,
        y: bar.yTop + insetY,
        width: Math.max(1, bar.width - (insetX * 2)),
        height: Math.max(1, bar.height - (insetY * 2)),
        yBottom: bar.yTop + insetY + Math.max(1, bar.height - (insetY * 2)),
        radius: Math.max(2, bar.cornerRadius - Math.max(insetX, insetY))
    };
}

function getBarOpacity(status) {
    if (status === 'future') return 0.72;
    if (status === 'completed') return 0.94;
    return 1;
}

function getStageProgress(state) {
    if (state.status === 'completed') return 1;
    if (state.status === 'current') return clamp(state.progress, 0, 1);
    return 0;
}

function getModeAccent(mode) {
    return hexToRgb(MODE_ACCENTS[mode] || MODE_ACCENTS.candle);
}

function drawLeaf(ctx, x, y, width, height, direction, color, alpha = 0.92) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
        x + (direction * width),
        y - (height * 0.45),
        x + (direction * width * 0.92),
        y + (height * 0.18)
    );
    ctx.quadraticCurveTo(
        x + (direction * width * 0.24),
        y + (height * 0.36),
        x,
        y
    );
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
}

function drawFlowerHead(ctx, x, y, radius, petalRgb, scale = 1) {
    const safeRadius = Math.max(2, radius * scale);
    for (let petalIndex = 0; petalIndex < 5; petalIndex++) {
        const angle = (Math.PI * 2 * petalIndex) / 5;
        ctx.beginPath();
        ctx.ellipse(
            x + Math.cos(angle) * safeRadius * 0.76,
            y + Math.sin(angle) * safeRadius * 0.76,
            safeRadius * 0.6,
            safeRadius * 0.92,
            angle,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = rgba(lighten(petalRgb, petalIndex * 4), 0.94);
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, safeRadius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 241, 179, 0.96)';
    ctx.fill();
}

function drawColumnOverlay(ctx, innerBar, accentRgb, status) {
    ctx.save();
    ctx.beginPath();
    addRoundedRectPath(ctx, innerBar.x, innerBar.y, innerBar.width, innerBar.height, innerBar.radius);
    ctx.clip();

    const shadowGradient = ctx.createLinearGradient(innerBar.x, innerBar.y, innerBar.x + innerBar.width, innerBar.y);
    shadowGradient.addColorStop(0, rgba(lighten(accentRgb, 40), status === 'future' ? 0.08 : 0.14));
    shadowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    shadowGradient.addColorStop(1, rgba(darken(accentRgb, 50), 0.14));
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(innerBar.x, innerBar.y, innerBar.width, innerBar.height);

    ctx.restore();
}

function drawCandleSmokePuffs(ctx, wickX, wickY, candleWidth, timestamp, bar) {
    const smokeRgb = { r: 222, g: 221, b: 214 };
    const puffCount = 8;
    const smokeHeight = Math.max(30, candleWidth * 0.92);
    const driftWidth = Math.max(6, candleWidth * 0.18);
    const baseRadius = Math.max(1.8, candleWidth * 0.045);
    const time = (timestamp * 0.00016) + (bar.dripOffset * 0.11);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (let puffIndex = 0; puffIndex < puffCount; puffIndex++) {
        const seed = (puffIndex * 0.137) + (bar.index * 0.071);
        const age = (time + seed) % 1;
        const liftEase = 1 - Math.pow(1 - age, 1.45);
        const fade = Math.pow(1 - age, 1.85);
        const birthFade = clamp(age / 0.16, 0, 1);
        const alpha = 0.14 * fade * birthFade;
        if (alpha <= 0.004) continue;

        const wobble = Math.sin((timestamp * 0.0009) + bar.dripOffset + (puffIndex * 1.8));
        const x = wickX + (wobble * driftWidth * age) + (Math.sin(seed * Math.PI * 2) * driftWidth * 0.16);
        const y = wickY - 4 - (liftEase * smokeHeight);
        const radius = baseRadius * lerp(0.65, 2.7, age);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.2);
        gradient.addColorStop(0, rgba(lighten(smokeRgb, 24), alpha));
        gradient.addColorStop(0.54, rgba(smokeRgb, alpha * 0.42));
        gradient.addColorStop(1, 'rgba(222, 221, 214, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(
            x,
            y,
            radius * lerp(0.9, 1.45, age),
            radius * lerp(0.72, 1.2, age),
            wobble * 0.42,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.restore();
}

function drawCandleBar(ctx, bar, state, timestamp) {
    const innerBar = insetBar(bar, Math.max(5, bar.width * 0.13), 6);
    const waxRgb = hexToRgb('#efe2bb');
    const tintRgb = hexToRgb(CANDLE_TINT_COLORS[state.index] || CANDLE_TINT_COLORS[0] || '#efe2bb');
    const tintedWaxRgb = mixRgb(waxRgb, tintRgb, 0.18);
    const tintedHighlightRgb = mixRgb(lighten(waxRgb, 28), lighten(tintRgb, 54), 0.14);
    const tintedShadowRgb = mixRgb(darken(waxRgb, 28), darken(tintRgb, 26), 0.18);
    const shadowRgb = hexToRgb('#8c6b3f');
    const flameRgb = hexToRgb('#ffb347');
    const meltedRatio = getStageProgress(state);
    const remainingHeight = state.status === 'future'
        ? innerBar.height * 0.94
        : lerp(innerBar.height * 0.94, 0, meltedRatio);
    const candleWidth = innerBar.width * 0.62;
    const candleBaseY = innerBar.yBottom - 1;
    const candleX = innerBar.x + ((innerBar.width - candleWidth) / 2) + (state.status === 'current' ? Math.sin(timestamp * 0.0015 + bar.dripOffset) * bar.candleLean : 0);
    const candleY = candleBaseY - remainingHeight;
    const waxPoolWidth = candleWidth * lerp(0.78, 1.08, meltedRatio);
    const waxPoolHeight = Math.max(4, innerBar.height * 0.05);

    const bodyGradient = ctx.createLinearGradient(candleX, candleY, candleX + candleWidth, candleY);
    bodyGradient.addColorStop(0, rgba(tintedShadowRgb, 0.94));
    bodyGradient.addColorStop(0.32, rgba(tintedHighlightRgb, 0.99));
    bodyGradient.addColorStop(0.62, rgba(tintedWaxRgb, 0.97));
    bodyGradient.addColorStop(1, rgba(mixRgb(darken(waxRgb, 12), tintRgb, 0.16), 0.95));

    ctx.save();
    ctx.globalAlpha = state.status === 'future' ? 0.96 : state.status === 'completed' ? 0.94 : 1;
    ctx.fillStyle = rgba(shadowRgb, 0.22);
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), candleBaseY + 4, waxPoolWidth * 0.66, waxPoolHeight * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(tintRgb, state.status === 'completed' ? 0.2 : 0.11);
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), candleBaseY + 1, waxPoolWidth * 0.58, waxPoolHeight * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(mixRgb(lighten(waxRgb, 8), tintRgb, 0.22), 0.88);
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), candleBaseY - 1, waxPoolWidth * 0.5, waxPoolHeight * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    if (remainingHeight > 1) {
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        addRoundedRectPath(ctx, candleX, candleY, candleWidth, remainingHeight, Math.min(14, candleWidth / 2));
        ctx.fill();
    }

    if (state.status === 'current' && remainingHeight > 1) {
        const dripCount = 2;
        for (let dripIndex = 0; dripIndex < dripCount; dripIndex++) {
            const dripProgress = clamp((Math.sin((timestamp * 0.0022) + bar.dripOffset + dripIndex) + 1) / 2, 0.2, 1);
            const dripBottom = lerp(candleY + remainingHeight * 0.34, candleBaseY - 2, dripProgress * meltedRatio);
            const dripX = candleX + candleWidth * (dripIndex === 0 ? 0.18 : 0.78);
            ctx.beginPath();
            ctx.moveTo(dripX, candleY + remainingHeight * 0.1);
            ctx.bezierCurveTo(dripX + 4, candleY + remainingHeight * 0.24, dripX + 4, dripBottom, dripX, dripBottom);
            ctx.bezierCurveTo(dripX - 4, dripBottom, dripX - 4, candleY + remainingHeight * 0.24, dripX, candleY + remainingHeight * 0.1);
            ctx.fillStyle = rgba(lighten(waxRgb, 26), 0.78);
            ctx.fill();
        }
    }

    const wickX = candleX + (candleWidth / 2);
    const wickBaseY = remainingHeight > 1 ? candleY + 3 : candleBaseY - 1;
    const wickY = wickBaseY - 9;
    ctx.strokeStyle = rgba(darken(shadowRgb, 20), state.status === 'future' ? 0.45 : 0.9);
    ctx.lineWidth = Math.max(1.2, candleWidth * 0.06);
    ctx.beginPath();
    ctx.moveTo(wickX, wickBaseY);
    ctx.lineTo(wickX, wickY);
    ctx.stroke();

    if (state.status === 'current') {
        const flicker = 0.85 + (Math.sin(timestamp * 0.017 + bar.dripOffset) * 0.08);
        const flameHeight = candleWidth * 0.68 * flicker;
        const flameWidth = candleWidth * 0.34 * flicker;
        const glowRadius = Math.max(candleWidth * 4.6, innerBar.height * 2.35);
        const glow = ctx.createRadialGradient(wickX, wickY - flameHeight * 0.55, 0, wickX, wickY - flameHeight * 0.18, glowRadius);
        glow.addColorStop(0, rgba(flameRgb, 0.42));
        glow.addColorStop(0.24, rgba(flameRgb, 0.24));
        glow.addColorStop(0.58, rgba(flameRgb, 0.13));
        glow.addColorStop(0.82, rgba(flameRgb, 0.055));
        glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(wickX, wickY - flameHeight * 0.2, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(wickX, wickY - flameHeight);
        ctx.bezierCurveTo(wickX + flameWidth, wickY - flameHeight * 0.45, wickX + flameWidth * 0.7, wickY + flameHeight * 0.25, wickX, wickY + flameHeight * 0.45);
        ctx.bezierCurveTo(wickX - flameWidth * 0.7, wickY + flameHeight * 0.25, wickX - flameWidth, wickY - flameHeight * 0.45, wickX, wickY - flameHeight);
        ctx.fillStyle = rgba(flameRgb, 0.96);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(wickX, wickY - flameHeight * 0.45, flameWidth * 0.42, flameHeight * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 244, 214, 0.82)';
        ctx.fill();
    } else if (state.status === 'completed' && state.isPreviousToCurrent) {
        drawCandleSmokePuffs(ctx, wickX, wickY, candleWidth, timestamp, bar);
    }

    ctx.restore();
}

function drawIceBar(ctx, bar, state, timestamp) {
    const innerBar = insetBar(bar, Math.max(5, bar.width * 0.1), 6);
    const iceRgb = hexToRgb('#7fd4ff');
    const puddleRgb = hexToRgb('#4aa8ff');
    const meltRatio = getStageProgress(state);
    const puddleHeight = lerp(innerBar.height * 0.02, innerBar.height * 0.07, meltRatio);
    const blockHeight = state.status === 'future'
        ? innerBar.height * 0.94
        : lerp(innerBar.height * 0.94, innerBar.height * 0.07, meltRatio);
    const blockY = innerBar.yBottom - blockHeight;
    const blockAlpha = state.status === 'future' ? 0.88 : lerp(0.9, 0.18, meltRatio);
    const puddleWidth = lerp(innerBar.width * 0.12, innerBar.width * 0.82, meltRatio);

    ctx.save();
    ctx.globalAlpha = getBarOpacity(state.status);

    if (meltRatio > 0.03) {
        const puddleGradient = ctx.createLinearGradient(innerBar.x, innerBar.yBottom - puddleHeight, innerBar.x, innerBar.yBottom);
        puddleGradient.addColorStop(0, rgba(lighten(puddleRgb, 28), 0.3 + (meltRatio * 0.16)));
        puddleGradient.addColorStop(1, rgba(darken(puddleRgb, 14), 0.46 + (meltRatio * 0.18)));
        ctx.fillStyle = puddleGradient;
        ctx.beginPath();
        ctx.ellipse(innerBar.x + (innerBar.width / 2), innerBar.yBottom - 2, puddleWidth * 0.5, puddleHeight, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    if (blockHeight > 4) {
        ctx.save();
        ctx.globalAlpha *= blockAlpha;
        const blockGradient = ctx.createLinearGradient(innerBar.x, blockY, innerBar.x + innerBar.width, blockY + blockHeight);
        blockGradient.addColorStop(0, rgba(lighten(iceRgb, 54), 0.68));
        blockGradient.addColorStop(0.5, rgba(lighten(iceRgb, 24), 0.5));
        blockGradient.addColorStop(1, rgba(darken(iceRgb, 18), 0.66));
        ctx.fillStyle = blockGradient;
        ctx.beginPath();
        addRoundedRectPath(ctx, innerBar.x, blockY, innerBar.width, blockHeight, innerBar.radius);
        ctx.fill();

        const shimmer = ctx.createLinearGradient(innerBar.x, blockY, innerBar.x, innerBar.yBottom);
        shimmer.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
        shimmer.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmer;
        ctx.beginPath();
        addRoundedRectPath(ctx, innerBar.x + (innerBar.width * 0.08), blockY + 6, innerBar.width * 0.18, Math.max(8, blockHeight * 0.78), innerBar.radius * 0.6);
        ctx.fill();
        ctx.restore();
    }

    ctx.strokeStyle = rgba(lighten(iceRgb, 80), 0.32);
    ctx.lineWidth = Math.max(1, innerBar.width * 0.04);
    for (let crackIndex = 0; crackIndex < 3 + Math.round(meltRatio * 3); crackIndex++) {
        const crackX = innerBar.x + innerBar.width * (0.2 + (crackIndex * 0.19));
        const crackTop = blockY + innerBar.height * (0.08 + (crackIndex * 0.04));
        const crackBottom = blockY + blockHeight * (0.7 + (Math.sin(timestamp * 0.0013 + crackIndex) * 0.04));
        ctx.beginPath();
        ctx.moveTo(crackX, crackTop);
        ctx.lineTo(crackX + ((crackIndex % 2 === 0 ? 1 : -1) * innerBar.width * 0.08), crackBottom);
        ctx.stroke();
    }

    if (state.status !== 'future') {
        const dripX = innerBar.x + innerBar.width * 0.76;
        const dripLength = innerBar.height * (0.08 + (meltRatio * 0.12));
        ctx.strokeStyle = rgba(lighten(puddleRgb, 45), 0.46);
        ctx.lineWidth = Math.max(1.2, innerBar.width * 0.05);
        ctx.beginPath();
        ctx.moveTo(dripX, blockY + blockHeight * 0.16);
        ctx.lineTo(dripX, blockY + blockHeight * 0.16 + dripLength);
        ctx.stroke();
    }

    if (state.status === 'completed') {
        ctx.strokeStyle = rgba(lighten(puddleRgb, 70), 0.24);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(innerBar.x + (innerBar.width / 2), innerBar.yBottom - 2, puddleWidth * 0.38, puddleHeight * (0.68 + (Math.sin(timestamp * 0.0016 + state.index) * 0.08)), 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawColumnOverlay(ctx, innerBar, iceRgb, state.status);
    ctx.restore();
}

function drawPlantBar(ctx, bar, state, timestamp) {
    const innerBar = insetBar(bar, Math.max(4, bar.width * 0.08), 6);
    const soilRgb = hexToRgb('#4a3324');
    const planterRgb = hexToRgb('#8f5d3a');
    const stemRgb = hexToRgb('#4f9b45');
    const leafRgb = hexToRgb('#7fcc59');
    const planterHeight = innerBar.height * 0.18;
    const planterY = innerBar.yBottom - planterHeight;
    const growth = getStageProgress(state);
    const stageSpec = PLANT_STAGE_SPECS[Math.min(state.index, PLANT_STAGE_SPECS.length - 1)];
    const flowerRgb = hexToRgb(stageSpec.flowerColor);

    ctx.save();
    ctx.globalAlpha = getBarOpacity(state.status);

    const planterGradient = ctx.createLinearGradient(innerBar.x, planterY, innerBar.x, innerBar.yBottom);
    planterGradient.addColorStop(0, rgba(lighten(planterRgb, 8), 0.94));
    planterGradient.addColorStop(1, rgba(darken(planterRgb, 14), 0.98));
    ctx.fillStyle = planterGradient;
    ctx.beginPath();
    addRoundedRectPath(ctx, innerBar.x, planterY, innerBar.width, planterHeight, Math.min(12, innerBar.radius));
    ctx.fill();

    const soilGradient = ctx.createLinearGradient(innerBar.x, planterY, innerBar.x, innerBar.yBottom);
    soilGradient.addColorStop(0, rgba(lighten(soilRgb, 10), 0.92));
    soilGradient.addColorStop(1, rgba(darken(soilRgb, 18), 0.98));
    ctx.fillStyle = soilGradient;
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), planterY + 2, innerBar.width * 0.46, planterHeight * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    if (state.status === 'future') {
        for (let seedIndex = 0; seedIndex < 3; seedIndex++) {
            const seedX = innerBar.x + innerBar.width * (0.28 + (seedIndex * 0.22));
            ctx.beginPath();
            ctx.ellipse(seedX, planterY - 2, innerBar.width * 0.03, innerBar.width * 0.016, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(221, 198, 122, 0.4)';
            ctx.fill();
        }
        drawColumnOverlay(ctx, innerBar, getModeAccent('plant'), state.status);
        ctx.restore();
        return;
    }

    const stemReveal = clamp(growth / 0.46, 0, 1);
    const leafReveal = clamp((growth - 0.16) / 0.42, 0, 1);
    const budReveal = clamp((growth - 0.62) / 0.16, 0, 1);
    const bloomReveal = clamp((growth - 0.74) / 0.2, 0, 1);

    bar.stalks.slice(0, stageSpec.stemCount).forEach((stalk, stalkIndex) => {
        const sway = Math.sin((timestamp * 0.0011) + stalk.sway) * innerBar.width * 0.04;
        const stemHeight = innerBar.height * stageSpec.stemHeight * stalk.heightFactor * stemReveal;
        const topX = stalk.x + sway;
        const topY = planterY - stemHeight;
        if (stemHeight <= 0.5) return;

        ctx.strokeStyle = rgba(stemRgb, 0.92);
        ctx.lineWidth = Math.max(1.6, innerBar.width * 0.045);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(stalk.x, planterY);
        ctx.quadraticCurveTo(stalk.x + sway * 0.45, planterY - stemHeight * 0.46, topX, topY);
        ctx.stroke();

        for (let leafPairIndex = 0; leafPairIndex < stageSpec.leafPairs; leafPairIndex++) {
            const reveal = clamp((leafReveal * stageSpec.leafPairs) - leafPairIndex, 0, 1);
            if (reveal <= 0) continue;
            const ratio = (leafPairIndex + 1) / (stageSpec.leafPairs + 1);
            const leafX = lerp(stalk.x, topX, ratio);
            const leafY = lerp(planterY - stemHeight * 0.16, topY + 8, ratio);
            const leafWidth = innerBar.width * lerp(0.08, 0.14, ratio) * reveal;
            const leafHeight = innerBar.height * 0.05 * reveal;
            drawLeaf(ctx, leafX, leafY, leafWidth, leafHeight, leafPairIndex % 2 === 0 ? -1 : 1, lighten(leafRgb, leafPairIndex * 3), 0.88);
            drawLeaf(ctx, leafX, leafY + 1, leafWidth * 0.92, leafHeight * 0.92, leafPairIndex % 2 === 0 ? 1 : -1, darken(leafRgb, 10), 0.52);
        }

        if (stageSpec.buds > 0 && stalkIndex < stageSpec.buds && budReveal > 0) {
            const budRadius = innerBar.width * 0.055 * budReveal;
            ctx.beginPath();
            ctx.arc(topX, topY, budRadius, 0, Math.PI * 2);
            ctx.fillStyle = rgba(flowerRgb, 0.92);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(topX, topY + budRadius * 0.36, budRadius * 0.72, 0, Math.PI * 2);
            ctx.fillStyle = rgba(stemRgb, 0.82);
            ctx.fill();
        }

        if (stageSpec.flowers > 0 && stalkIndex < stageSpec.flowers && bloomReveal > 0) {
            drawFlowerHead(ctx, topX, topY, innerBar.width * 0.06, flowerRgb, bloomReveal);
        }
    });

    if (state.index === BAR_COUNT - 1 && state.status === 'completed') {
        for (let insectIndex = 0; insectIndex < 2; insectIndex++) {
            const orbit = timestamp * 0.0012 + bar.dripOffset + (insectIndex * Math.PI * 1.1);
            const insectX = innerBar.x + innerBar.width * (0.35 + (Math.sin(orbit) * 0.18));
            const insectY = innerBar.y + innerBar.height * (0.2 + (Math.cos(orbit * 1.2) * 0.08));
            ctx.fillStyle = insectIndex === 0 ? 'rgba(255, 203, 75, 0.88)' : 'rgba(122, 202, 255, 0.82)';
            ctx.beginPath();
            ctx.ellipse(insectX, insectY, innerBar.width * 0.04, innerBar.width * 0.026, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(insectX - innerBar.width * 0.03, insectY - 1, innerBar.width * 0.035, innerBar.width * 0.02, -0.45, 0, Math.PI * 2);
            ctx.ellipse(insectX + innerBar.width * 0.03, insectY - 1, innerBar.width * 0.035, innerBar.width * 0.02, 0.45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.34)';
            ctx.fill();
        }
    }

    drawColumnOverlay(ctx, innerBar, getModeAccent('plant'), state.status);
    ctx.restore();
}

function drawBubblesBar(ctx, bar, state, timestamp) {
    const innerBar = insetBar(bar, Math.max(5, bar.width * 0.08), 6);
    const bubbleRgb = hexToRgb('#82e7ff');
    const glassRgb = hexToRgb('#effcff');
    const density = state.status === 'future'
        ? 0.08
        : state.status === 'completed'
            ? 1
            : lerp(0.16, 1, getStageProgress(state));
    const bubbleCount = state.status === 'future'
        ? 2
        : 6 + Math.round(density * 16);
    const streamHeightTop = state.status === 'future'
        ? innerBar.yBottom - (innerBar.height * 0.28)
        : innerBar.y + 10;

    ctx.save();
    ctx.globalAlpha = getBarOpacity(state.status);

    ctx.beginPath();
    addRoundedRectPath(ctx, innerBar.x, innerBar.y, innerBar.width, innerBar.height, innerBar.radius);
    ctx.clip();

    const glassWash = ctx.createLinearGradient(innerBar.x, innerBar.y, innerBar.x + innerBar.width, innerBar.yBottom);
    glassWash.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    glassWash.addColorStop(1, 'rgba(132, 225, 255, 0.05)');
    ctx.fillStyle = glassWash;
    ctx.fillRect(innerBar.x, innerBar.y, innerBar.width, innerBar.height);

    const emitterGlow = ctx.createRadialGradient(
        innerBar.x + (innerBar.width / 2),
        innerBar.yBottom - 2,
        innerBar.width * 0.08,
        innerBar.x + (innerBar.width / 2),
        innerBar.yBottom - 2,
        innerBar.width * 0.82
    );
    emitterGlow.addColorStop(0, rgba(lighten(bubbleRgb, 48), 0.16 + (density * 0.16)));
    emitterGlow.addColorStop(1, 'rgba(140, 236, 255, 0)');
    ctx.fillStyle = emitterGlow;
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), innerBar.yBottom - 2, innerBar.width * 0.42, innerBar.height * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let bubbleIndex = 0; bubbleIndex < bubbleCount; bubbleIndex++) {
        const bubble = bar.bubbleOffsets[bubbleIndex];
        const rise = (timestamp * 0.00018 * bubble.speed + bubble.seed + (state.index * 0.11)) % 1;
        const laneSway = Math.sin((timestamp * 0.0015) + bubble.sway) * innerBar.width * 0.04;
        const bubbleX = innerBar.x + innerBar.width * (0.16 + (bubble.lane * 0.68)) + laneSway;
        const bubbleY = lerp(innerBar.yBottom - 8, streamHeightTop, rise);
        const alpha = 0.16 + (density * 0.42 * (1 - (rise * 0.2)));
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(186, 239, 255, ${alpha + 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    if (density > 0.2) {
        const frothCount = 5 + Math.round(density * 6);
        for (let frothIndex = 0; frothIndex < frothCount; frothIndex++) {
            const frothX = innerBar.x + innerBar.width * (0.18 + ((frothIndex % 6) * 0.12));
            const frothY = innerBar.yBottom - 4 - ((frothIndex % 3) * innerBar.height * 0.018);
            const frothRadius = innerBar.width * lerp(0.018, 0.036, (frothIndex % 4) / 4);
            ctx.beginPath();
            ctx.arc(frothX, frothY, frothRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 252, 255, ${0.1 + (density * 0.2)})`;
            ctx.fill();
        }
    }

    ctx.restore();

    ctx.strokeStyle = rgba(glassRgb, 0.35);
    ctx.lineWidth = Math.max(1.1, innerBar.width * 0.035);
    ctx.beginPath();
    addRoundedRectPath(ctx, innerBar.x, innerBar.y, innerBar.width, innerBar.height, innerBar.radius);
    ctx.stroke();

    drawColumnOverlay(ctx, innerBar, bubbleRgb, state.status);
}

function drawFractalBar(ctx, bar, state, timestamp) {
    const innerBar = insetBar(bar, Math.max(5, bar.width * 0.08), 6);
    const branchRgb = state.index % 2 === 0 ? hexToRgb('#68e0ff') : hexToRgb('#92f0c1');
    const statusOpacity = getBarOpacity(state.status);
    const totalSegments = bar.branchSegments.length;
    const visibleSegmentCount = state.status === 'future'
        ? 2
        : state.status === 'completed'
            ? totalSegments
            : Math.max(3, Math.floor(totalSegments * state.progress));

    ctx.save();
    ctx.globalAlpha = statusOpacity;
    ctx.lineCap = 'round';

    for (let segmentIndex = 0; segmentIndex < visibleSegmentCount; segmentIndex++) {
        const segment = bar.branchSegments[segmentIndex];
        const depthFactor = segment.depth / 5;
        ctx.strokeStyle = rgba(lighten(branchRgb, depthFactor * 55), 0.26 + (depthFactor * 0.34));
        ctx.lineWidth = Math.max(0.9, innerBar.width * (0.02 + (depthFactor * 0.018)));
        ctx.beginPath();
        ctx.moveTo(segment.x1, segment.y1);
        ctx.lineTo(segment.x2, segment.y2);
        ctx.stroke();
    }

    const tipCount = state.status === 'completed' ? 6 : Math.max(2, Math.floor(visibleSegmentCount * 0.08));
    for (let tipIndex = 0; tipIndex < tipCount; tipIndex++) {
        const segment = bar.branchSegments[Math.max(0, visibleSegmentCount - 1 - tipIndex)];
        ctx.beginPath();
        ctx.arc(segment.x2, segment.y2, innerBar.width * 0.018 * (1 + Math.sin(timestamp * 0.003 + tipIndex) * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = rgba(lighten(branchRgb, 95), 0.45);
        ctx.fill();
    }

    drawColumnOverlay(ctx, innerBar, branchRgb, state.status);
    ctx.restore();
}

function drawProgressiveBackground(ctx, innerBar, colorRgb, status) {
    ctx.save();
    ctx.globalAlpha = status === 'future' ? 0.06 : 0.14;
    const glow = ctx.createLinearGradient(innerBar.x, innerBar.y, innerBar.x, innerBar.yBottom);
    glow.addColorStop(0, rgba(lighten(colorRgb, 35), 0.16));
    glow.addColorStop(1, rgba(darken(colorRgb, 30), 0.28));
    ctx.fillStyle = glow;
    ctx.beginPath();
    addRoundedRectPath(ctx, innerBar.x, innerBar.y, innerBar.width, innerBar.height, innerBar.radius);
    ctx.fill();
    ctx.restore();
}

function drawPlantingGround(ctx, innerBar) {
    ctx.fillStyle = 'rgba(26, 18, 12, 0.22)';
    ctx.beginPath();
    ctx.ellipse(innerBar.x + (innerBar.width / 2), innerBar.yBottom + 2, innerBar.width * 0.42, innerBar.height * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawCandleWallLine(ctx, bars) {
    if (!Array.isArray(bars) || bars.length === 0) return;

    const firstBar = bars[0];
    const lastBar = bars[bars.length - 1];
    const minX = firstBar.x;
    const maxX = lastBar.x + lastBar.width;
    const averageBottom = bars.reduce((sum, bar) => sum + bar.yBottom, 0) / bars.length;
    const averageHeight = bars.reduce((sum, bar) => sum + bar.height, 0) / bars.length;
    const wallLineY = averageBottom - (averageHeight * 0.12);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 226, 176, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(minX, wallLineY);
    ctx.lineTo(maxX, wallLineY);
    ctx.stroke();

    const floorGlow = ctx.createLinearGradient(0, wallLineY, 0, averageBottom + 8);
    floorGlow.addColorStop(0, 'rgba(255, 188, 94, 0.055)');
    floorGlow.addColorStop(1, 'rgba(255, 188, 94, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(minX, wallLineY, maxX - minX, Math.max(1, averageBottom + 8 - wallLineY));
    ctx.restore();
}

function drawMode(ctx, bar, state, mode, timestamp) {
    const innerBar = insetBar(bar, Math.max(4, bar.width * 0.06), 4);

    if (mode === 'plant') {
        drawPlantingGround(ctx, innerBar);
    }

    if (mode === 'candle') {
        drawCandleBar(ctx, bar, state, timestamp);
        return;
    }
    if (mode === 'ice') {
        drawIceBar(ctx, bar, state, timestamp);
        return;
    }
    if (mode === 'plant') {
        drawPlantBar(ctx, bar, state, timestamp);
        return;
    }
    if (mode === 'bubbles') {
        drawBubblesBar(ctx, bar, state, timestamp);
        return;
    }

    drawCandleBar(ctx, bar, state, timestamp);
}

export const StageVisualization = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    contentHeight: 0,
    bleedTop: 0,
    dpr: 1,
    layoutProvider: null,
    stateProvider: null,
    bars: [],
    mode: 'candle',
    isInitialized: false,
    isRunning: false,
    rafId: null,
    lastFrameMs: 0,

    init: function(canvasElement, width, height, options: any = {}) {
        if (!canvasElement || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            console.error('StageVisualization.init called with invalid canvas or dimensions.');
            return;
        }

        if (StageVisualization.isInitialized && StageVisualization.canvas !== canvasElement) {
            StageVisualization.destroy();
        }

        StageVisualization.canvas = canvasElement;
        StageVisualization.ctx = canvasElement.getContext('2d', { alpha: true });
        if (!StageVisualization.ctx) {
            console.error('StageVisualization could not acquire 2D context.');
            return;
        }

        if (Object.prototype.hasOwnProperty.call(options, 'measureLayout')) {
            StageVisualization.layoutProvider = typeof options.measureLayout === 'function' ? options.measureLayout : null;
        }
        if (Object.prototype.hasOwnProperty.call(options, 'getState')) {
            StageVisualization.stateProvider = typeof options.getState === 'function' ? options.getState : null;
        }
        if (typeof options.mode === 'string') {
            StageVisualization.mode = options.mode;
        }
        if (typeof options.bleedTop === 'number') {
            StageVisualization.bleedTop = Math.max(0, Math.floor(options.bleedTop));
        }

        StageVisualization.resize(width, height);
        StageVisualization.isInitialized = true;
        StageVisualization.renderOnce(performance.now());
    },

    getLayout: function(width = StageVisualization.width, height = StageVisualization.contentHeight || StageVisualization.height) {
        if (typeof StageVisualization.layoutProvider === 'function') {
            const measuredLayout = StageVisualization.layoutProvider();
            if (measuredLayout?.bars?.length === BAR_COUNT) {
                return measuredLayout;
            }
        }
        return createFallbackFillLayout(width, height, BAR_COUNT);
    },

    resize: function(width, height) {
        if (!StageVisualization.canvas || !StageVisualization.ctx) return;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;

        StageVisualization.width = Math.max(1, Math.floor(width));
        StageVisualization.contentHeight = Math.max(1, Math.floor(height));
        const activeBleedTop = StageVisualization.mode === 'candle'
            ? Math.max(0, Math.floor(StageVisualization.bleedTop || 0))
            : 0;
        StageVisualization.height = StageVisualization.contentHeight + activeBleedTop;
        StageVisualization.dpr = Math.min(window.devicePixelRatio || 1, 2);

        StageVisualization.canvas.width = Math.floor(StageVisualization.width * StageVisualization.dpr);
        StageVisualization.canvas.height = Math.floor(StageVisualization.height * StageVisualization.dpr);
        if (activeBleedTop > 0) {
            StageVisualization.canvas.style.width = `${StageVisualization.width}px`;
            StageVisualization.canvas.style.height = `${StageVisualization.height}px`;
            StageVisualization.canvas.style.top = `-${activeBleedTop}px`;
        } else {
            StageVisualization.canvas.style.width = '';
            StageVisualization.canvas.style.height = '';
            StageVisualization.canvas.style.top = '';
        }
        StageVisualization.ctx.setTransform(StageVisualization.dpr, 0, 0, StageVisualization.dpr, 0, 0);

        const layout = StageVisualization.getLayout(StageVisualization.width, StageVisualization.contentHeight);
        StageVisualization.bars = layout.bars.map((bar, index) => createBarModel({
            ...bar,
            yTop: bar.yTop + activeBleedTop,
            yBottom: bar.yBottom + activeBleedTop
        }, index));
    },

    setMode: function(mode) {
        StageVisualization.mode = mode;
    },

    setBleedTop: function(value) {
        const parsed = Number(value);
        StageVisualization.bleedTop = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    },

    start: function() {
        if (!StageVisualization.isInitialized || StageVisualization.isRunning) return;
        StageVisualization.isRunning = true;
        StageVisualization.lastFrameMs = performance.now();
        StageVisualization.rafId = requestAnimationFrame(StageVisualization.tick);
    },

    stop: function() {
        if (!StageVisualization.isRunning) return;
        StageVisualization.isRunning = false;
        if (StageVisualization.rafId) {
            cancelAnimationFrame(StageVisualization.rafId);
            StageVisualization.rafId = null;
        }
        StageVisualization.lastFrameMs = 0;
    },

    tick: function(frameTimeMs) {
        if (!StageVisualization.isRunning) return;
        StageVisualization.lastFrameMs = frameTimeMs;
        StageVisualization.renderOnce(frameTimeMs);
        StageVisualization.rafId = requestAnimationFrame(StageVisualization.tick);
    },

    renderOnce: function(frameTimeMs = performance.now()) {
        if (!StageVisualization.ctx) return;

        const ctx = StageVisualization.ctx;
        const state = typeof StageVisualization.stateProvider === 'function'
            ? (StageVisualization.stateProvider() || createDefaultState())
            : createDefaultState();
        const accentRgb = getModeAccent(StageVisualization.mode);
        const currentBarIndex = Array.isArray(state.bars)
            ? state.bars.findIndex(barState => barState?.status === 'current')
            : -1;
        const previousSmokingIndex = currentBarIndex > 0 ? currentBarIndex - 1 : -1;

        ctx.clearRect(0, 0, StageVisualization.width, StageVisualization.height);

        if (StageVisualization.mode === 'candle') {
            drawCandleWallLine(ctx, StageVisualization.bars);
        }

        StageVisualization.bars.forEach((bar, index) => {
            const barState = state.bars[index] || { index, status: 'future', progress: 0 };
            const innerBar = insetBar(bar, Math.max(4, bar.width * 0.06), 4);
            if (StageVisualization.mode !== 'candle') {
                drawProgressiveBackground(ctx, innerBar, accentRgb, barState.status);
            }
            drawMode(ctx, bar, { ...barState, index, isPreviousToCurrent: index === previousSmokingIndex }, StageVisualization.mode, frameTimeMs);
        });
    },

    destroy: function() {
        StageVisualization.stop();
        StageVisualization.canvas = null;
        StageVisualization.ctx = null;
        StageVisualization.width = 0;
        StageVisualization.height = 0;
        StageVisualization.contentHeight = 0;
        StageVisualization.bleedTop = 0;
        StageVisualization.layoutProvider = null;
        StageVisualization.stateProvider = null;
        StageVisualization.bars = [];
        StageVisualization.isInitialized = false;
    }
};
