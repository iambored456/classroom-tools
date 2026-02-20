/** js/waterBars.js */
import { State } from './state.js';

const BAR_COUNT = State.SAND_COLORS.length;
const OUTER_PADDING = 2;
const BAR_GAP = 10;
const INNER_INSET = 3;
const MAX_DROPLETS_DEFAULT = 220;
const MAX_SPLASH_PARTICLES = 320;
const GRAVITY = 1150;
const SURFACE_TENSION = 34;
const SURFACE_DAMPING = 6.5;
const SURFACE_SPREAD = 18;
const MAX_SURFACE_DISPLACEMENT_RATIO = 0.18;
const BAR_CORNER_RADIUS = 15;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex, fallback = { r: 74, g: 168, b: 255 }) {
    if (typeof hex !== 'string') return fallback;
    const normalized = hex.trim().replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(ch => `${ch}${ch}`).join('')
        : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
}

function rgba(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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

function createSurfacePoints(width) {
    const pointCount = Math.max(14, Math.round(width / 6));
    return Array.from({ length: pointCount }, () => ({ offset: 0, velocity: 0 }));
}

function getFillRatio(bar, capacity) {
    return clamp(bar.fillUnits / Math.max(1, capacity), 0, 1);
}

function getBaseSurfaceY(bar, capacity) {
    const ratio = getFillRatio(bar, capacity);
    return bar.yBottom - (bar.height * ratio);
}

function getSurfaceYAt(bar, capacity, localX) {
    const points = bar.surfacePoints;
    const ratio = getFillRatio(bar, capacity);
    const base = getBaseSurfaceY(bar, capacity);
    if (points.length === 0 || ratio <= 0) return bar.yBottom;
    const position = clamp(localX / Math.max(1, bar.width), 0, 1) * (points.length - 1);
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(points.length - 1, leftIndex + 1);
    const t = position - leftIndex;
    const leftY = points[leftIndex].offset;
    const rightY = points[rightIndex].offset;
    return base + (leftY + (rightY - leftY) * t);
}

function resetSurface(bar) {
    bar.surfacePoints.forEach(point => {
        point.offset = 0;
        point.velocity = 0;
    });
}

function addRoundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawLiquidDroplet(ctx, drop, baseColor) {
    const speed = Math.sqrt((drop.vx * drop.vx) + (drop.vy * drop.vy));
    const stretch = clamp(speed / 420, 0, 1);
    const wobble = Math.sin((drop.x + drop.y) * 0.07) * 0.05;
    const width = drop.radius * clamp((0.95 - (stretch * 0.22) + wobble), 0.55, 1.05);
    const halfHeight = drop.radius * (1.25 + (stretch * 0.95));
    const angle = Math.atan2(drop.vy, drop.vx) - (Math.PI / 2);

    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(angle);

    const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
    gradient.addColorStop(0, rgba(lighten(baseColor, 45), 0.9));
    gradient.addColorStop(0.55, rgba(lighten(baseColor, 12), 0.95));
    gradient.addColorStop(1, rgba(darken(baseColor, 32), 0.88));

    ctx.beginPath();
    ctx.moveTo(0, -halfHeight * 1.05);
    ctx.bezierCurveTo(width * 0.95, -halfHeight * 0.7, width * 1.2, halfHeight * 0.2, 0, halfHeight);
    ctx.bezierCurveTo(-width * 1.2, halfHeight * 0.2, -width * 0.95, -halfHeight * 0.7, 0, -halfHeight * 1.05);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-width * 0.18, -halfHeight * 0.2, width * 0.22, halfHeight * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(lighten(baseColor, 110), 0.45);
    ctx.fill();

    if (stretch > 0.18) {
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight * 1.02);
        ctx.lineTo(0, -halfHeight * (1.35 + (stretch * 0.35)));
        ctx.strokeStyle = rgba(lighten(baseColor, 70), 0.35);
        ctx.lineWidth = Math.max(0.6, drop.radius * 0.22);
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    ctx.restore();
}

function drawSplashParticle(ctx, splash, baseColor) {
    const speed = Math.sqrt((splash.vx * splash.vx) + (splash.vy * splash.vy));
    const stretch = clamp(speed / 280, 0, 1);
    const angle = Math.atan2(splash.vy, splash.vx);
    const alpha = clamp(splash.life / splash.maxLife, 0, 1);
    const rx = splash.radius * (1 + (stretch * 0.9));
    const ry = splash.radius * (1 - (stretch * 0.35));

    ctx.save();
    ctx.translate(splash.x, splash.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, Math.max(0.6, ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(lighten(baseColor, 55), alpha * 0.9);
    ctx.fill();
    ctx.restore();
}

export const WaterBars = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    bars: [],
    droplets: [],
    splashParticles: [],
    isInitialized: false,
    isRunning: false,
    rafId: null,
    lastFrameMs: 0,
    barCapacity: 120,
    dropletRadius: 3,
    maxDroplets: MAX_DROPLETS_DEFAULT,
    colors: [...State.SAND_COLORS],
    frameClockMs: 0,

    init: function(canvasElement, width, height, options = {}) {
        if (!canvasElement || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            console.error('WaterBars.init called with invalid canvas or dimensions.');
            return;
        }

        if (WaterBars.isInitialized && WaterBars.canvas !== canvasElement) {
            WaterBars.destroy();
        }

        WaterBars.canvas = canvasElement;
        WaterBars.ctx = canvasElement.getContext('2d', { alpha: true });
        if (!WaterBars.ctx) {
            console.error('WaterBars could not acquire 2D context.');
            return;
        }

        const nextColors = Array.isArray(options.colors) && options.colors.length > 0
            ? options.colors.slice(0, BAR_COUNT)
            : [...State.SAND_COLORS];
        WaterBars.colors = nextColors;

        if (options.capacityPerBar !== undefined) {
            WaterBars.setCapacity(options.capacityPerBar);
        }
        if (options.particleRadius !== undefined) {
            WaterBars.setParticleRadius(options.particleRadius);
        }

        WaterBars.resize(width, height);
        WaterBars.isInitialized = true;
        WaterBars.renderOnce();
    },

    resize: function(width, height) {
        if (!WaterBars.canvas || !WaterBars.ctx) return;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;

        const previousUnits = WaterBars.bars.map(bar => bar.fillUnits || 0);
        WaterBars.width = Math.max(1, Math.floor(width));
        WaterBars.height = Math.max(1, Math.floor(height));
        WaterBars.dpr = Math.min(window.devicePixelRatio || 1, 2);

        WaterBars.canvas.width = Math.floor(WaterBars.width * WaterBars.dpr);
        WaterBars.canvas.height = Math.floor(WaterBars.height * WaterBars.dpr);
        WaterBars.canvas.style.width = `${WaterBars.width}px`;
        WaterBars.canvas.style.height = `${WaterBars.height}px`;
        WaterBars.ctx.setTransform(WaterBars.dpr, 0, 0, WaterBars.dpr, 0, 0);

        WaterBars.rebuildBars(previousUnits);
    },

    rebuildBars: function(previousUnits = []) {
        WaterBars.droplets = [];
        WaterBars.splashParticles = [];
        WaterBars.bars = [];

        const contentWidth = Math.max(20, WaterBars.width - (OUTER_PADDING * 2));
        const contentHeight = Math.max(20, WaterBars.height - (OUTER_PADDING * 2));
        const slotWidth = Math.max(8, (contentWidth - (BAR_GAP * (BAR_COUNT - 1))) / BAR_COUNT);
        const leftStart = OUTER_PADDING;
        const yTop = OUTER_PADDING + INNER_INSET;
        const yBottom = WaterBars.height - OUTER_PADDING - INNER_INSET;
        const waterHeight = Math.max(8, contentHeight - (INNER_INSET * 2));

        for (let i = 0; i < BAR_COUNT; i++) {
            const x = leftStart + (i * (slotWidth + BAR_GAP)) + INNER_INSET;
            const width = Math.max(4, slotWidth - (INNER_INSET * 2));
            const fillUnits = clamp(Number(previousUnits[i]) || 0, 0, WaterBars.barCapacity);
            const bar = {
                index: i,
                x,
                width,
                yTop,
                yBottom,
                height: waterHeight,
                cornerRadius: Math.min(BAR_CORNER_RADIUS, width / 2, waterHeight / 2),
                colorHex: WaterBars.colors[i] || State.SAND_COLORS[i] || '#4aa8ff',
                fillUnits,
                surfacePoints: createSurfacePoints(width)
            };
            WaterBars.bars.push(bar);
        }
    },

    reset: function() {
        WaterBars.droplets = [];
        WaterBars.splashParticles = [];
        WaterBars.bars.forEach(bar => {
            bar.fillUnits = 0;
            resetSurface(bar);
        });
        WaterBars.renderOnce();
    },

    setCapacity: function(capacityPerBar) {
        const parsed = Number(capacityPerBar);
        WaterBars.barCapacity = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 120;
        WaterBars.bars.forEach(bar => {
            bar.fillUnits = clamp(bar.fillUnits, 0, WaterBars.barCapacity);
        });
    },

    setParticleRadius: function(radius) {
        const parsed = Number(radius);
        if (!Number.isFinite(parsed)) return;
        WaterBars.dropletRadius = clamp(parsed, 1.6, 12);
    },

    setColors: function(colors) {
        if (!Array.isArray(colors) || colors.length === 0) return;
        WaterBars.colors = colors.slice(0, BAR_COUNT);
        WaterBars.bars.forEach((bar, index) => {
            bar.colorHex = WaterBars.colors[index] || bar.colorHex;
        });
    },

    getTotalCapacity: function() {
        return WaterBars.barCapacity * WaterBars.bars.length;
    },

    getTotalFillUnits: function() {
        if (WaterBars.bars.length === 0) return 0;
        return WaterBars.bars.reduce((sum, bar) => sum + bar.fillUnits, 0);
    },

    getPendingDropletCount: function() {
        return WaterBars.droplets.length;
    },

    getPendingForBar: function(barIndex) {
        return WaterBars.droplets.reduce((sum, drop) => sum + (drop.barIndex === barIndex ? 1 : 0), 0);
    },

    getBarProjectedRemaining: function(barIndex) {
        if (barIndex < 0 || barIndex >= WaterBars.bars.length) return 0;
        const bar = WaterBars.bars[barIndex];
        const pending = WaterBars.getPendingForBar(barIndex);
        return Math.max(0, WaterBars.barCapacity - bar.fillUnits - pending);
    },

    findBestBarIndex: function(preferredIndex = -1) {
        if (WaterBars.bars.length === 0) return -1;

        if (preferredIndex >= 0 && preferredIndex < WaterBars.bars.length) {
            if (WaterBars.getBarProjectedRemaining(preferredIndex) > 0) {
                return preferredIndex;
            }
        }

        let bestIndex = -1;
        let bestRemaining = 0;
        for (let i = 0; i < WaterBars.bars.length; i++) {
            const remaining = WaterBars.getBarProjectedRemaining(i);
            if (remaining > bestRemaining) {
                bestRemaining = remaining;
                bestIndex = i;
            }
        }

        return bestIndex;
    },

    addDroplet: function(barIndex, colorHex) {
        if (!WaterBars.isInitialized || !WaterBars.ctx) return false;
        if (barIndex < 0 || barIndex >= WaterBars.bars.length) return false;
        if (WaterBars.droplets.length >= WaterBars.maxDroplets) return false;

        const bar = WaterBars.bars[barIndex];
        const radius = clamp(WaterBars.dropletRadius, 1.6, Math.max(2.2, (bar.width * 0.48)));
        const minSpawnX = bar.x + radius;
        const maxSpawnX = bar.x + bar.width - radius;
        const spawnX = maxSpawnX > minSpawnX
            ? minSpawnX + (Math.random() * (maxSpawnX - minSpawnX))
            : bar.x + (bar.width * 0.5);
        WaterBars.droplets.push({
            barIndex,
            colorHex: colorHex || bar.colorHex,
            radius,
            x: spawnX,
            y: bar.yTop + radius + 1,
            vx: (Math.random() - 0.5) * 22,
            vy: 24 + (Math.random() * 52)
        });
        return true;
    },

    createSplash: function(bar, x, y, impactSpeed, colorHex) {
        if (WaterBars.splashParticles.length >= MAX_SPLASH_PARTICLES) return;
        const particleCount = Math.min(7, 3 + Math.floor(impactSpeed / 120));
        for (let i = 0; i < particleCount; i++) {
            if (WaterBars.splashParticles.length >= MAX_SPLASH_PARTICLES) break;
            const speed = 70 + (Math.random() * 130) + (impactSpeed * 0.1);
            const angle = (-Math.PI / 2) + ((Math.random() - 0.5) * 1.2);
            WaterBars.splashParticles.push({
                barIndex: bar.index,
                x,
                y: y - 1,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1 + (Math.random() * 1.8),
                life: 0.18 + (Math.random() * 0.28),
                maxLife: 0.46,
                colorHex
            });
        }
    },

    disturbSurface: function(bar, x, force) {
        const points = bar.surfacePoints;
        if (!points || points.length === 0) return;

        const localX = clamp((x - bar.x) / Math.max(1, bar.width), 0, 1);
        const center = Math.round(localX * (points.length - 1));
        const impulse = clamp(force * 0.16, 10, 200);

        for (let i = Math.max(0, center - 2); i <= Math.min(points.length - 1, center + 2); i++) {
            const distance = Math.abs(i - center);
            const falloff = 1 - (distance / 3);
            points[i].velocity += impulse * Math.max(0, falloff);
        }
    },

    updateDroplets: function(dt) {
        if (WaterBars.droplets.length === 0) return;

        for (let i = WaterBars.droplets.length - 1; i >= 0; i--) {
            const drop = WaterBars.droplets[i];
            const bar = WaterBars.bars[drop.barIndex];
            if (!bar) {
                WaterBars.droplets.splice(i, 1);
                continue;
            }

            drop.vy += GRAVITY * dt;
            drop.vx *= Math.max(0, 1 - (dt * 1.8));
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;

            const minX = bar.x + drop.radius;
            const maxX = bar.x + bar.width - drop.radius;
            if (drop.x < minX) {
                drop.x = minX;
                drop.vx *= -0.3;
            } else if (drop.x > maxX) {
                drop.x = maxX;
                drop.vx *= -0.3;
            }

            const surfaceY = getSurfaceYAt(bar, WaterBars.barCapacity, drop.x - bar.x);
            if (drop.y + drop.radius >= surfaceY) {
                bar.fillUnits = clamp(bar.fillUnits + 1, 0, WaterBars.barCapacity);
                WaterBars.disturbSurface(bar, drop.x, drop.vy);
                WaterBars.createSplash(bar, drop.x, surfaceY, drop.vy, drop.colorHex || bar.colorHex);
                WaterBars.droplets.splice(i, 1);
                continue;
            }

            if (drop.y - drop.radius > (bar.yBottom + 26)) {
                WaterBars.droplets.splice(i, 1);
            }
        }
    },

    updateSplashParticles: function(dt) {
        if (WaterBars.splashParticles.length === 0) return;
        for (let i = WaterBars.splashParticles.length - 1; i >= 0; i--) {
            const splash = WaterBars.splashParticles[i];
            splash.vy += (GRAVITY * 0.74) * dt;
            splash.vx *= Math.max(0, 1 - (dt * 0.9));
            splash.x += splash.vx * dt;
            splash.y += splash.vy * dt;
            splash.life -= dt;

            if (splash.life <= 0 || splash.y > WaterBars.height + 16) {
                WaterBars.splashParticles.splice(i, 1);
            }
        }
    },

    updateSurface: function(dt) {
        const safeDt = Math.min(0.05, dt);
        WaterBars.bars.forEach(bar => {
            const points = bar.surfacePoints;
            if (!points || points.length === 0) return;

            const previousOffsets = points.map(point => point.offset);
            const maxDisplacement = bar.height * MAX_SURFACE_DISPLACEMENT_RATIO;
            const fillRatio = getFillRatio(bar, WaterBars.barCapacity);
            const idlePulse = fillRatio > 0.02
                ? Math.sin((WaterBars.frameClockMs * 0.0019) + (bar.index * 0.85)) * bar.height * 0.0006
                : 0;

            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const left = previousOffsets[i > 0 ? i - 1 : i];
                const right = previousOffsets[i < points.length - 1 ? i + 1 : i];
                const laplacian = left + right - (2 * previousOffsets[i]);

                const springForce = -SURFACE_TENSION * previousOffsets[i];
                const spreadForce = SURFACE_SPREAD * laplacian;
                point.velocity += (springForce + spreadForce) * safeDt;
                point.velocity *= Math.max(0, 1 - (SURFACE_DAMPING * safeDt));
                point.offset += point.velocity * safeDt;
                point.offset = clamp(point.offset, -maxDisplacement, maxDisplacement);
            }

            const centerIndex = Math.floor(points.length / 2);
            points[centerIndex].velocity += idlePulse;
        });
    },

    isNearTop: function() {
        if (WaterBars.bars.length === 0) return false;
        return WaterBars.bars.every(bar => bar.fillUnits >= WaterBars.barCapacity);
    },

    ensureSizeFromCanvas: function() {
        if (!WaterBars.canvas) return;
        const nextWidth = Math.max(1, Math.floor(WaterBars.canvas.clientWidth || 0));
        const nextHeight = Math.max(1, Math.floor(WaterBars.canvas.clientHeight || 0));
        if (nextWidth !== WaterBars.width || nextHeight !== WaterBars.height) {
            WaterBars.resize(nextWidth, nextHeight);
        }
    },

    start: function() {
        if (!WaterBars.isInitialized || WaterBars.isRunning) return;
        WaterBars.isRunning = true;
        WaterBars.lastFrameMs = performance.now();
        WaterBars.rafId = requestAnimationFrame(WaterBars.tick);
    },

    stop: function() {
        if (!WaterBars.isRunning) return;
        WaterBars.isRunning = false;
        if (WaterBars.rafId) {
            cancelAnimationFrame(WaterBars.rafId);
            WaterBars.rafId = null;
        }
        WaterBars.lastFrameMs = 0;
    },

    tick: function(frameTimeMs) {
        if (!WaterBars.isRunning) return;
        const dt = clamp((frameTimeMs - WaterBars.lastFrameMs) / 1000, 0.001, 0.05);
        WaterBars.lastFrameMs = frameTimeMs;
        WaterBars.frameClockMs = frameTimeMs;

        WaterBars.ensureSizeFromCanvas();
        WaterBars.updateDroplets(dt);
        WaterBars.updateSplashParticles(dt);
        WaterBars.updateSurface(dt);
        WaterBars.renderOnce();

        WaterBars.rafId = requestAnimationFrame(WaterBars.tick);
    },

    renderOnce: function() {
        if (!WaterBars.ctx) return;
        const ctx = WaterBars.ctx;
        ctx.clearRect(0, 0, WaterBars.width, WaterBars.height);

        const dropletsByBar = Array.from({ length: WaterBars.bars.length }, () => []);
        const splashByBar = Array.from({ length: WaterBars.bars.length }, () => []);
        WaterBars.droplets.forEach(drop => {
            if (drop.barIndex >= 0 && drop.barIndex < dropletsByBar.length) {
                dropletsByBar[drop.barIndex].push(drop);
            }
        });
        WaterBars.splashParticles.forEach(splash => {
            if (splash.barIndex >= 0 && splash.barIndex < splashByBar.length) {
                splashByBar[splash.barIndex].push(splash);
            }
        });

        WaterBars.bars.forEach(bar => {
            ctx.save();
            ctx.beginPath();
            addRoundedRectPath(ctx, bar.x, bar.yTop, bar.width, bar.height, bar.cornerRadius);
            ctx.clip();

            const fillRatio = getFillRatio(bar, WaterBars.barCapacity);

            if (fillRatio > 0) {
                const base = hexToRgb(bar.colorHex);
                const topColor = lighten(base, 38);
                const middleColor = lighten(base, 10);
                const bottomColor = darken(base, 28);
                const baseSurfaceY = getBaseSurfaceY(bar, WaterBars.barCapacity);

                const gradient = ctx.createLinearGradient(0, bar.yTop, 0, bar.yBottom);
                gradient.addColorStop(0, rgba(topColor, 0.78));
                gradient.addColorStop(0.48, rgba(middleColor, 0.84));
                gradient.addColorStop(1, rgba(bottomColor, 0.93));

                ctx.beginPath();
                ctx.moveTo(bar.x, bar.yBottom);
                ctx.lineTo(bar.x, baseSurfaceY + bar.surfacePoints[0].offset);

                for (let i = 1; i < bar.surfacePoints.length; i++) {
                    const px = bar.x + ((i / (bar.surfacePoints.length - 1)) * bar.width);
                    const py = baseSurfaceY + bar.surfacePoints[i].offset;
                    ctx.lineTo(px, py);
                }
                ctx.lineTo(bar.x + bar.width, bar.yBottom);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                for (let i = 0; i < bar.surfacePoints.length; i++) {
                    const px = bar.x + ((i / (bar.surfacePoints.length - 1)) * bar.width);
                    const py = baseSurfaceY + bar.surfacePoints[i].offset;
                    if (i === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
                ctx.lineWidth = 1.7;
                ctx.strokeStyle = rgba(lighten(base, 85), 0.7);
                ctx.stroke();
            }

            splashByBar[bar.index].forEach(splash => {
                const color = hexToRgb(splash.colorHex);
                drawSplashParticle(ctx, splash, color);
            });

            dropletsByBar[bar.index].forEach(drop => {
                const color = hexToRgb(drop.colorHex);
                drawLiquidDroplet(ctx, drop, color);
            });

            ctx.restore();
        });
    },

    destroy: function() {
        WaterBars.stop();
        WaterBars.bars = [];
        WaterBars.droplets = [];
        WaterBars.splashParticles = [];
        WaterBars.canvas = null;
        WaterBars.ctx = null;
        WaterBars.width = 0;
        WaterBars.height = 0;
        WaterBars.isInitialized = false;
    }
};
