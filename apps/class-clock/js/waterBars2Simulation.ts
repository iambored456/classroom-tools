import { createFallbackFillLayout } from './fillLayout.ts';

export type WaterBarBounds = ReturnType<typeof createFallbackFillLayout>['bars'][number];
export type WaterTimeline = { bars: Array<{ progress: number; status: string }> };
export type WaterDrop = {
    x: number; y: number; vx: number; vy: number;
    radius: number; age: number; splash: boolean;
};
export type WaterShape = { x: number; y: number; rx: number; ry: number };

export const SURFACE_SAMPLES = 64;
export const WATER_STEP = 1 / 120;
const GRAVITY = 1100;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** A height-field water surface, with ballistic drops. Clock progress is independent of drop count. */
export class WaterBarSimulation {
    bounds: WaterBarBounds;
    ratio = 0;
    status = 'future';
    offsets = new Float64Array(SURFACE_SAMPLES);
    velocities = new Float64Array(SURFACE_SAMPLES);
    private nextVelocities = new Float64Array(SURFACE_SAMPLES);
    drops: WaterDrop[] = [];
    elapsed = 0;
    formation = 0;
    private sourceX: number | null = null;
    radius = 5;
    impacts = 0;

    constructor(bounds: WaterBarBounds, private random: () => number = Math.random) {
        this.bounds = bounds;
    }

    setProgress(progress: number, status: string) {
        // Sampling the real clock every frame avoids accumulating timing error during sleep or resizing.
        this.ratio = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
        this.status = status;
        if (status !== 'current') {
            this.formation = 0;
            this.sourceX = null;
        }
    }

    setDetail(radius: number) {
        this.radius = clamp(radius, 2, Math.max(2, Math.min(10, this.bounds.width * 0.13, this.bounds.height * 0.07)));
    }

    clearMotion() {
        this.drops.length = 0;
        this.formation = 0;
        this.sourceX = null;
        this.offsets.fill(0);
        this.velocities.fill(0);
    }

    surfaceAt(x: number) {
        const { bounds, ratio, offsets } = this;
        const local = clamp((x - bounds.x) / bounds.width, 0, 1);
        const point = local * (SURFACE_SAMPLES - 1);
        const left = Math.floor(point);
        const offset = offsets[left] + (offsets[Math.min(left + 1, SURFACE_SAMPLES - 1)] - offsets[left]) * (point - left);
        const meniscus = ratio > 0 ? Math.min(2.8, bounds.width * 0.025, bounds.height * ratio * 0.25) : 0;
        return bounds.yBottom - bounds.height * ratio + offset
            - meniscus * (Math.exp(-local * 36) + Math.exp(-(1 - local) * 36));
    }

    impulse(x: number, velocity: number, radius: number) {
        const center = clamp((x - this.bounds.x) / this.bounds.width, 0, 1) * (SURFACE_SAMPLES - 1);
        const spread = Math.max(1.5, radius / this.bounds.width * SURFACE_SAMPLES * 0.7);
        const strength = clamp(velocity * radius * 0.045, 8, 95);
        for (let i = 0; i < SURFACE_SAMPLES; i++) {
            const distance = (i - center) / spread;
            this.velocities[i] += strength * Math.exp(-distance * distance * 0.5);
        }
    }

    private impact(drop: WaterDrop, surface: number) {
        this.impacts++;
        this.impulse(drop.x, drop.vy, drop.radius);
        // Tiny secondary drops return to the same surface; they never change the clock's fill level.
        if (!drop.splash && this.ratio > 0.005 && this.ratio < 0.96 && drop.vy > 100) {
            const speed = Math.min(150, drop.vy * 0.28);
            for (let i = 0; i < 4 && this.drops.length < 18; i++) {
                const direction = i % 2 === 0 ? -1 : 1;
                this.drops.push({
                    x: drop.x + direction * drop.radius * 0.55, y: surface - 1,
                    vx: direction * speed * (0.35 + this.random() * 0.35),
                    vy: -speed * (0.65 + this.random() * 0.3),
                    radius: drop.radius * (0.15 + this.random() * 0.12), age: 0, splash: true
                });
            }
        }
    }

    private chooseSourceX() {
        // Keep the growing bead clear of the rounded top corners. Its position stays fixed until detachment.
        const inset = Math.min(this.bounds.width / 2, Math.max(this.radius * 1.2, this.bounds.cornerRadius + 1));
        return this.bounds.x + inset + clamp(this.random(), 0, 1) * (this.bounds.width - inset * 2);
    }

    step(dt = WATER_STEP, emitting = true) {
        this.elapsed += dt;
        const { bounds, radius } = this;
        if (emitting && this.status === 'current' && this.sourceX === null) this.sourceX = this.chooseSourceX();
        const hasHeadroom = this.sourceX !== null && this.surfaceAt(this.sourceX) - bounds.yTop > radius * 4.2;
        if (emitting && this.status === 'current' && hasHeadroom) {
            const cycle = 1.45 + radius * 0.055;
            this.formation += dt / cycle;
            if (this.formation >= 1) {
                this.formation -= 1;
                this.drops.push({
                    x: this.sourceX!,
                    y: bounds.yTop + radius * 2.65,
                    vx: 0, vy: 12, radius, age: 0, splash: false
                });
                this.sourceX = this.chooseSourceX();
            }
        } else {
            this.formation = 0;
            if (!emitting || this.status !== 'current') this.sourceX = null;
        }

        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.age += dt;
            drop.vy += GRAVITY * dt;
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;
            const minX = bounds.x + drop.radius;
            const maxX = bounds.x + bounds.width - drop.radius;
            if (drop.x < minX || drop.x > maxX) {
                drop.x = clamp(drop.x, minX, maxX);
                drop.vx *= -0.25;
            }
            const surface = this.surfaceAt(drop.x);
            // Let a drop enter the surface so the renderer's smooth union shows merging before removal.
            if (drop.vy > 0 && drop.y >= surface + drop.radius * 0.2) {
                this.drops.splice(i, 1);
                this.impact(drop, surface);
            } else if (drop.age > 3) {
                this.drops.splice(i, 1);
            }
        }

        // The wave speed scales with sample spacing. c * dt / dx stays below 1 at 120 Hz.
        const waveCoefficient = Math.pow((SURFACE_SAMPLES - 1) * 1.05, 2);
        const damping = Math.exp(-4.4 * dt);
        const limit = Math.min(bounds.height * 0.12, bounds.height * this.ratio * 0.65, bounds.width * 0.2);
        for (let i = 0; i < SURFACE_SAMPLES; i++) {
            const left = this.offsets[Math.max(0, i - 1)];
            const right = this.offsets[Math.min(SURFACE_SAMPLES - 1, i + 1)];
            const acceleration = waveCoefficient * (left + right - 2 * this.offsets[i]) - this.offsets[i] * 22;
            this.nextVelocities[i] = (this.velocities[i] + acceleration * dt) * damping;
        }
        for (let i = 0; i < SURFACE_SAMPLES; i++) {
            this.velocities[i] = this.nextVelocities[i];
            this.offsets[i] = clamp(this.offsets[i] + this.velocities[i] * dt, -limit, limit);
        }
    }

    shapes(includeFormation = true): WaterShape[] {
        const result = this.drops.map(drop => {
            // Small falling drops round out after detachment, with a decaying capillary oscillation.
            const oscillation = Math.sin(drop.age * 28) * Math.exp(-drop.age * 4) * 0.2;
            const aspect = drop.splash ? 1.08 : 1.04 + oscillation;
            return { x: drop.x, y: drop.y, rx: drop.radius / Math.sqrt(aspect), ry: drop.radius * aspect };
        });
        if (includeFormation && this.formation > 0) {
            const r = this.radius * Math.pow(this.formation, 0.45);
            const stretch = Math.pow(clamp((this.formation - 0.67) / 0.33, 0, 1), 2);
            const x = this.sourceX ?? this.bounds.x + this.bounds.width / 2;
            const y = this.bounds.yTop + r * (1.05 + stretch * 1.6);
            result.unshift(
                { x, y, rx: r * (1 - stretch * 0.1), ry: r * (1 + stretch * 0.14) },
                { x, y: this.bounds.yTop + (y - this.bounds.yTop) * 0.4,
                    rx: Math.max(0.65, r * (0.37 - stretch * 0.26)), ry: Math.max(1, (y - this.bounds.yTop) * 0.55) }
            );
        }
        return result;
    }
}
