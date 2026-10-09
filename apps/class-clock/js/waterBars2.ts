import { State } from './state.ts';
import { createFallbackFillLayout } from './fillLayout.ts';
import { clamp, SURFACE_SAMPLES, WATER_STEP, WaterBarSimulation, type WaterTimeline } from './waterBars2Simulation.ts';

type FillLayout = ReturnType<typeof createFallbackFillLayout>;
type Options = {
    measureLayout?: () => FillLayout;
    getState?: () => WaterTimeline;
    particleRadius?: number;
    backgroundColor?: string;
};
const MAX_DROPS = 20;

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// A 2.5D liquid material: smooth distance-field unions make beads, necks, and impacts continuous.
// Surface normals drive specular/Fresnel reflections; optical thickness drives colour absorption.
// There are no external textures, float-texture extensions, or per-frame GPU readbacks.
const FRAGMENT_SHADER = `
precision highp float;
uniform vec3 uResolution;
uniform float uTime;
uniform vec3 uBackground;
uniform vec4 uRects[5];
uniform vec4 uStyle[5];
uniform vec3 uColors[5];
uniform vec4 uDrops[${MAX_DROPS}];
uniform float uDropBars[${MAX_DROPS}];
uniform sampler2D uSurface;

float roundedBox(vec2 p, vec2 size, float r) {
    vec2 q = abs(p) - size + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float wave(float x, float bar, float range) {
    vec4 data = texture2D(uSurface, vec2((clamp(x, 0.0, 1.0) * 63.0 + 0.5) / 64.0, (bar + 0.5) / 5.0));
    return (data.r * (256.0 / 257.0) + data.g / 257.0 - 0.5) * 2.0 * range;
}
vec3 smoothUnion(vec3 a, vec3 b, float k) {
    float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
    return vec3(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.yz, a.yz, h));
}
void main() {
    vec2 p = vec2(gl_FragCoord.x / uResolution.z, uResolution.y - gl_FragCoord.y / uResolution.z);
    float aa = 0.8 / uResolution.z;
    gl_FragColor = vec4(0.0);
    for (int bar = 0; bar < 5; bar++) {
        vec4 rect = uRects[bar];
        vec4 style = uStyle[bar];
        vec2 local = p - rect.xy;
        if (local.x < -1.0 || local.x > rect.z + 1.0 || local.y < -1.0 || local.y > rect.w + 1.0) continue;
        float glassDistance = roundedBox(local - rect.zw * 0.5, rect.zw * 0.5, style.x);
        float glassMask = 1.0 - smoothstep(-aa, aa, glassDistance);
        if (glassMask < 0.001) continue;

        float tx = clamp(local.x / rect.z, 0.0, 1.0);
        float surfaceWave = wave(tx, float(bar), style.z);
        float dx = 1.0 / 63.0;
        float slope = (wave(tx + dx, float(bar), style.z) - wave(tx - dx, float(bar), style.z)) / (2.0 * dx * rect.z);
        float meniscus = min(min(2.8, rect.z * 0.025), rect.w * style.y * 0.25);
        float wallLeft = exp(-tx * 36.0);
        float wallRight = exp(-(1.0 - tx) * 36.0);
        float surfaceY = rect.y + rect.w * (1.0 - style.y) + surfaceWave - meniscus * (wallLeft + wallRight);
        slope += meniscus * 36.0 / rect.z * (wallLeft - wallRight);
        vec3 field = vec3(style.y > 0.00001 ? surfaceY - p.y : 10000.0, slope, -1.0);

        for (int d = 0; d < ${MAX_DROPS}; d++) {
            vec4 drop = uDrops[d];
            if (abs(uDropBars[d] - float(bar)) > 0.1 || drop.z < 0.1) continue;
            vec2 q = (p - drop.xy) / drop.zw;
            float radial = length(q);
            float distance = (radial - 1.0) * min(drop.z, drop.w);
            vec2 gradient = radial > 0.0001 ? q / (drop.zw * radial) * min(drop.z, drop.w) : vec2(0.0);
            field = smoothUnion(field, vec3(distance, gradient), max(1.0, drop.z * 0.8));
        }

        float liquidMask = (1.0 - smoothstep(-aa, aa, field.x)) * glassMask;
        // The empty jar has zero alpha. Only the water and drops receive material lighting.
        if (liquidMask < 0.001) {
            gl_FragColor = vec4(0.0);
            return;
        }

        vec3 tint = uColors[bar];
        float bevel = exp(-max(0.0, -field.x) / max(2.0, rect.z * 0.075));
        float sideBevel = exp(-min(local.x, rect.z - local.x) / max(1.0, rect.z * 0.055));
        vec3 normal = normalize(vec3(
            field.y * bevel + (tx - 0.5) * (0.5 + sideBevel * 1.8),
            field.z * bevel, 0.68));
        float fresnel = 0.02 + 0.98 * pow(1.0 - normal.z, 5.0);
        float opticalDepth = 0.65 + 1.55 * sqrt(max(0.0, 1.0 - pow(tx * 2.0 - 1.0, 2.0)));
        vec3 transmission = exp(-(vec3(1.0) - tint + 0.08) * opticalDepth * 1.6);
        vec3 behind = mix(uBackground, vec3(0.82, 0.85, 0.89), 0.64);
        vec3 color = transmission * behind + tint * (vec3(1.0) - transmission) * 0.32 + tint * 0.22;

        // Broad softbox reflection, a narrow opposite rim, and a bright surface reflection.
        float refraction = normal.x * 0.055 + surfaceWave / max(40.0, rect.w) * 0.3;
        float rightLight = exp(-pow((tx - 0.94) / 0.018, 2.0));
        float softbox = exp(-pow((tx + refraction - 0.2) / 0.095, 2.0));
        float fineReflection = exp(-pow((tx + refraction - 0.27) / 0.013, 2.0));
        float specular = pow(max(0.0, dot(normal, normalize(vec3(-0.48, -0.64, 0.74)))), 32.0);
        color += vec3(0.98, 0.99, 1.0) * (softbox * 0.15 + fineReflection * 0.12 + rightLight * 0.18);
        color += vec3(1.0) * (specular * 0.78 + fresnel * 0.3);
        color += mix(tint, vec3(1.0), 0.78) * exp(-abs(field.x) / 0.85) * 0.52;

        // Refracted light on the lower glass: subtle moving caustics, strongest after an impact.
        float belowSurface = smoothstep(3.0, 18.0, p.y - surfaceY);
        float caustic = pow(abs(sin((local.x + surfaceWave * 2.0) * 0.14 + uTime * 0.42)
            * sin(local.y * 0.09 - uTime * 0.3 + sin(tx * 9.0))), 12.0);
        color += tint * caustic * 0.13 * belowSurface * (0.25 + min(1.0, abs(surfaceWave) * 0.4));

        // A few tiny trapped bubbles catch the light under the moving surface.
        for (int b = 0; b < 3; b++) {
            float seed = float(b) * 0.317 + float(bar) * 0.173;
            float bubbleX = rect.x + rect.z * (0.4 + 0.42 * fract(seed * 3.71));
            float rise = fract(seed + uTime * 0.018);
            float bubbleY = rect.y + rect.w - rise * rect.w * style.y;
            float r = 0.7 + fract(seed * 8.3) * 0.8;
            float ring = exp(-pow((length(p - vec2(bubbleX, bubbleY)) - r) / 0.4, 2.0));
            color += vec3(0.26) * ring * belowSurface;
        }
        color = pow(max(color, 0.0), vec3(0.9));
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), liquidMask * 0.96);
        return;
    }
}
`;

function rgb(hex: string): [number, number, number] {
    const value = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#000000';
    return [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

class WaterBars2Renderer {
    canvas: HTMLCanvasElement | null = null;
    bars: WaterBarSimulation[] = [];
    isInitialized = false;
    isRunning = false;
    renderer: 'webgl' | 'canvas' = 'canvas';
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private buffer: WebGLBuffer | null = null;
    private texture: WebGLTexture | null = null;
    private uniforms: Record<string, WebGLUniformLocation | null> = {};
    private fallbackCanvas: HTMLCanvasElement | null = null;
    private fallbackCtx: CanvasRenderingContext2D | null = null;
    private options: Options = {};
    private width = 0;
    private height = 0;
    private dpr = 1;
    private rafId = 0;
    private lastFrameMs = 0;
    private lastRenderMs = 0;
    private accumulator = 0;
    private elapsed = 0;
    private motionQuery: MediaQueryList | null = null;
    private drain: { start: number; source: number[]; resolve: () => void } | null = null;
    private surfaceData = new Uint8Array(SURFACE_SAMPLES * 5 * 4);
    private rectData = new Float32Array(5 * 4);
    private styleData = new Float32Array(5 * 4);
    private colorData = new Float32Array(State.SAND_COLORS.flatMap(color => rgb(color)));
    private dropData = new Float32Array(MAX_DROPS * 4);
    private dropBars = new Float32Array(MAX_DROPS);

    init(canvas: HTMLCanvasElement, width: number, height: number, options: Options = {}) {
        if (this.canvas !== canvas) {
            this.destroy();
            this.canvas = canvas;
            canvas.addEventListener('webglcontextlost', this.onContextLost);
            canvas.addEventListener('webglcontextrestored', this.onContextRestored);
            this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.motionQuery.addEventListener('change', this.onMotionChange);
            document.addEventListener('visibilitychange', this.onVisibilityChange);
            this.initGpu();
        }
        this.options = options;
        this.resize(width, height);
        this.isInitialized = true;
        this.renderOnce();
    }

    resize(width: number, height: number) {
        if (!this.canvas || width <= 0 || height <= 0) return;
        this.width = Math.max(1, Math.round(width));
        this.height = Math.max(1, Math.round(height));
        // Bound the framebuffer cost on both high-DPI screens and very large projection displays.
        this.dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1200000 / (this.width * this.height))));
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        const layout = this.options.measureLayout?.() || createFallbackFillLayout(this.width, this.height, 5);
        if (this.bars.length === 0) {
            this.bars = layout.bars.map(bounds => new WaterBarSimulation(bounds));
        } else {
            this.bars.forEach((bar, index) => {
                bar.bounds = layout.bars[index];
                bar.clearMotion();
            });
        }
        this.bars.forEach(bar => bar.setDetail(this.options.particleRadius || 5));
        this.resizeFallback();
        this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    private initGpu() {
        if (!this.canvas) return;
        try {
            const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false });
            if (!gl) throw new Error('WebGL unavailable');
            this.gl = gl;
            const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ? 'highp' : 'mediump';
            const shaders: WebGLShader[] = [];
            const program = gl.createProgram();
            if (!program) throw new Error('Cannot create water material');
            this.program = program;
            for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, FRAGMENT_SHADER.replace('precision highp', `precision ${precision}`)]] as const) {
                const shader = gl.createShader(type);
                if (!shader) throw new Error('Cannot create water shader');
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                gl.attachShader(program, shader);
                shaders.push(shader);
            }
            gl.bindAttribLocation(program, 0, 'aPosition');
            gl.linkProgram(program);
            const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
            const log = linked ? '' : gl.getProgramInfoLog(program) + shaders.map(shader => gl.getShaderInfoLog(shader)).join('\n');
            shaders.forEach(shader => gl.deleteShader(shader));
            if (!linked) throw new Error(log);
            gl.useProgram(program);
            this.buffer = gl.createBuffer();
            this.texture = gl.createTexture();
            if (!this.buffer || !this.texture) throw new Error('Cannot allocate water resources');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SURFACE_SAMPLES, 5, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.surfaceData);
            for (const name of ['uResolution', 'uTime', 'uBackground', 'uRects[0]', 'uStyle[0]', 'uColors[0]', 'uDrops[0]', 'uDropBars[0]', 'uSurface']) {
                this.uniforms[name] = gl.getUniformLocation(program, name);
            }
            gl.uniform1i(this.uniforms.uSurface, 0);
            this.renderer = 'webgl';
            this.fallbackCanvas?.remove();
            this.fallbackCanvas = null;
            this.fallbackCtx = null;
        } catch (error) {
            console.info('Water Bars 2 is using its Canvas renderer.', error);
            this.releaseGpu();
            this.enableFallback();
        }
        if (this.canvas) this.canvas.dataset.waterRenderer = this.renderer;
    }

    private enableFallback() {
        this.renderer = 'canvas';
        if (!this.fallbackCanvas && this.canvas?.parentElement) {
            this.fallbackCanvas = document.createElement('canvas');
            this.fallbackCanvas.className = 'water2-fallback-canvas';
            this.canvas.parentElement.append(this.fallbackCanvas);
            this.fallbackCtx = this.fallbackCanvas.getContext('2d');
        }
        this.resizeFallback();
        if (this.canvas) this.canvas.dataset.waterRenderer = 'canvas';
    }

    private resizeFallback() {
        if (!this.fallbackCanvas) return;
        this.fallbackCanvas.width = Math.round(this.width * this.dpr);
        this.fallbackCanvas.height = Math.round(this.height * this.dpr);
        this.fallbackCtx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    private releaseGpu() {
        if (this.gl) {
            this.gl.deleteProgram(this.program);
            this.gl.deleteBuffer(this.buffer);
            this.gl.deleteTexture(this.texture);
        }
        this.program = null;
        this.buffer = null;
        this.texture = null;
        this.gl = null;
    }

    private onContextLost = (event: Event) => {
        event.preventDefault();
        this.gl = null;
        this.enableFallback();
        this.renderOnce();
    };

    private onContextRestored = () => {
        this.initGpu();
        if (this.canvas) this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.renderOnce();
    };

    private onMotionChange = () => {
        this.bars.forEach(bar => bar.clearMotion());
        this.renderOnce();
    };

    private onVisibilityChange = () => {
        if (document.hidden) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        } else if (this.isRunning) {
            this.lastFrameMs = performance.now();
            this.accumulator = 0;
            this.syncProgress();
            this.scheduleFrame();
        }
    };

    syncProgress() {
        if (this.drain) return;
        const state = this.options.getState?.();
        this.bars.forEach((bar, index) => {
            const target = state?.bars[index];
            bar.setProgress(target?.progress || 0, target?.status || 'future');
        });
    }

    setBackgroundColor(color: string) {
        this.options.backgroundColor = color;
        this.renderOnce();
    }

    start() {
        if (!this.isInitialized || this.isRunning) return;
        this.isRunning = true;
        this.lastFrameMs = performance.now();
        this.accumulator = 0;
        this.scheduleFrame();
    }

    private scheduleFrame() {
        if (this.isRunning && !document.hidden && !this.rafId) this.rafId = requestAnimationFrame(this.tick);
    }

    stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
        this.cancelDrain();
    }

    private cancelDrain() {
        const drain = this.drain;
        this.drain = null;
        drain?.resolve();
    }

    async drainReset() {
        this.cancelDrain();
        if (this.motionQuery?.matches || !this.bars.some(bar => bar.ratio > 0.01)) {
            this.bars.forEach(bar => { bar.ratio = 0; bar.clearMotion(); });
            return;
        }
        const promise = new Promise<void>(resolve => {
            this.drain = { start: performance.now(), source: this.bars.map(bar => bar.ratio), resolve };
        });
        this.bars.forEach(bar => { bar.status = 'future'; bar.clearMotion(); });
        this.start();
        return promise;
    }

    private tick = (timestamp: number) => {
        this.rafId = 0;
        if (!this.isRunning || document.hidden) return;
        const dt = Math.min(0.1, Math.max(0, (timestamp - this.lastFrameMs) / 1000));
        this.lastFrameMs = timestamp;
        this.elapsed += dt;
        this.syncProgress();
        if (this.drain) {
            const drain = this.drain;
            this.bars.forEach((bar, index) => {
                const progress = clamp((timestamp - drain.start - (4 - index) * 100) / 950, 0, 1);
                bar.ratio = drain.source[index] * Math.pow(1 - progress, 2);
            });
            if (timestamp - drain.start >= 1350) {
                this.bars.forEach(bar => bar.clearMotion());
                this.cancelDrain();
            }
        }
        if (!this.motionQuery?.matches) {
            this.accumulator += dt;
            while (this.accumulator >= WATER_STEP) {
                this.bars.forEach(bar => bar.step(WATER_STEP, !this.drain));
                this.accumulator -= WATER_STEP;
            }
        }
        if (!this.motionQuery?.matches || timestamp - this.lastRenderMs > 250) {
            this.renderOnce();
            this.lastRenderMs = timestamp;
        }
        this.scheduleFrame();
    };

    renderOnce() {
        if (!this.canvas || this.bars.length !== 5) return;
        if (this.renderer === 'canvas') { this.renderFallback(); return; }
        const gl = this.gl;
        if (!gl || !this.program) return;
        this.dropData.fill(0);
        this.dropBars.fill(-1);
        let dropCount = 0;
        this.bars.forEach((bar, index) => {
            const bounds = bar.bounds;
            const range = Math.max(1, bounds.height * 0.16);
            this.rectData.set([bounds.x, bounds.yTop, bounds.width, bounds.height], index * 4);
            this.styleData.set([bounds.cornerRadius, bar.ratio, range, 0], index * 4);
            for (let point = 0; point < SURFACE_SAMPLES; point++) {
                const value = Math.round(clamp(bar.offsets[point] / range * 0.5 + 0.5, 0, 1) * 65535);
                const offset = (index * SURFACE_SAMPLES + point) * 4;
                this.surfaceData[offset] = value >> 8;
                this.surfaceData[offset + 1] = value & 255;
                this.surfaceData[offset + 3] = 255;
            }
            for (const shape of bar.shapes(!this.motionQuery?.matches)) {
                if (dropCount >= MAX_DROPS) break;
                this.dropData.set([shape.x, shape.y, shape.rx, shape.ry], dropCount * 4);
                this.dropBars[dropCount++] = index;
            }
        });
        gl.useProgram(this.program);
        gl.uniform3f(this.uniforms.uResolution, this.width, this.height, this.dpr);
        gl.uniform1f(this.uniforms.uTime, this.motionQuery?.matches ? 0 : this.elapsed);
        gl.uniform3fv(this.uniforms.uBackground, rgb(this.options.backgroundColor || '#000000'));
        gl.uniform4fv(this.uniforms['uRects[0]'], this.rectData);
        gl.uniform4fv(this.uniforms['uStyle[0]'], this.styleData);
        gl.uniform3fv(this.uniforms['uColors[0]'], this.colorData);
        gl.uniform4fv(this.uniforms['uDrops[0]'], this.dropData);
        gl.uniform1fv(this.uniforms['uDropBars[0]'], this.dropBars);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SURFACE_SAMPLES, 5, gl.RGBA, gl.UNSIGNED_BYTE, this.surfaceData);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private renderFallback() {
        const ctx = this.fallbackCtx;
        if (!ctx) return;
        ctx.clearRect(0, 0, this.width, this.height);
        this.bars.forEach((bar, index) => {
            const b = bar.bounds;
            const color = State.SAND_COLORS[index];
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(b.x, b.yTop, b.width, b.height, b.cornerRadius);
            ctx.clip();
            if (bar.ratio > 0) {
                const surface = Array.from({ length: SURFACE_SAMPLES }, (_, i) => {
                    const x = b.x + i / (SURFACE_SAMPLES - 1) * b.width;
                    return { x, y: bar.surfaceAt(x) };
                });
                const path = new Path2D();
                path.moveTo(surface[0].x, surface[0].y);
                for (let i = 1; i < surface.length; i++) {
                    const previous = surface[i - 1];
                    const point = surface[i];
                    path.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
                }
                path.lineTo(b.x + b.width, surface[surface.length - 1].y);
                const line = new Path2D(path);
                path.lineTo(b.x + b.width, b.yBottom);
                path.lineTo(b.x, b.yBottom);
                path.closePath();
                const gradient = ctx.createLinearGradient(b.x, 0, b.x + b.width, 0);
                gradient.addColorStop(0, `${color}70`);
                gradient.addColorStop(0.2, `${color}ec`);
                gradient.addColorStop(0.3, `${color}a8`);
                gradient.addColorStop(0.86, `${color}aa`);
                gradient.addColorStop(1, `${color}55`);
                ctx.fillStyle = gradient;
                ctx.fill(path);
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 1.2;
                ctx.stroke(line);
                ctx.save();
                ctx.clip(path);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(b.x + b.width * 0.18, b.yTop, Math.max(1, b.width * 0.025), b.height);
                ctx.restore();
            }
            for (const shape of bar.shapes(!this.motionQuery?.matches)) {
                const gradient = ctx.createRadialGradient(shape.x - shape.rx * 0.3, shape.y - shape.ry * 0.4, 0, shape.x, shape.y, Math.max(shape.rx, shape.ry));
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.32, `${color}dd`);
                gradient.addColorStop(1, `${color}70`);
                ctx.beginPath();
                ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            ctx.restore();
        });
    }

    destroy() {
        this.stop();
        this.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
        this.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
        this.motionQuery?.removeEventListener('change', this.onMotionChange);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.releaseGpu();
        this.fallbackCanvas?.remove();
        this.fallbackCanvas = null;
        this.fallbackCtx = null;
        this.canvas = null;
        this.bars = [];
        this.isInitialized = false;
    }
}

export const WaterBars2 = new WaterBars2Renderer();
