/** js/physics.js */
import Matter from 'matter-js';
import { State } from './state.js';
import { Settings } from './settings.js'; // Import settings for particle size

const SAND_OUTER_PADDING = 2;
const SAND_INNER_INSET = 3;
const SAND_SEGMENT_GAP = 10;
const SAND_CORNER_RADIUS = 15;

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

export const Physics = {
    engine: null,
    render: null,
    world: null,
    runner: null,
    isInitialized: false,
    isRunning: false,
    currentMode: 'sand',
    currentSegments: State.SAND_COLORS.length,
    renderMaskHandler: null,

    init: function(canvasElement, containerWidth, containerHeight, options = {}) {
        const mode = options.mode || Physics.currentMode || 'sand';
        const segments = Math.max(1, options.segments || (mode === 'sand' ? State.SAND_COLORS.length : 1));

        if (Physics.isInitialized) {
            const sizeChanged = Physics.render && (Physics.render.options.width !== containerWidth || Physics.render.options.height !== containerHeight);
            const modeChanged = Physics.currentMode !== mode || Physics.currentSegments !== segments;

            if (sizeChanged && Physics.render) {
                console.log(`Resizing physics renderer to ${containerWidth}x${containerHeight}`);
                Physics.render.bounds.max.x = containerWidth;
                Physics.render.bounds.max.y = containerHeight;
                Physics.render.options.width = containerWidth;
                Physics.render.options.height = containerHeight;
                Physics.render.canvas.width = containerWidth;
                Physics.render.canvas.height = containerHeight;
            }

            if (sizeChanged || modeChanged) {
                Physics.currentMode = mode;
                Physics.currentSegments = segments;
                Physics.updateWallPositions(containerWidth, containerHeight);
            }

            Physics.configureRenderMask();
            Physics.start(); // Ensure running
            return;
        }

        console.log(`Initializing Physics Engine (${mode}): ${containerWidth}x${containerHeight}`);
        if (!canvasElement || isNaN(containerWidth) || isNaN(containerHeight) || containerWidth <= 0 || containerHeight <= 0) {
            console.error("Cannot initialize Physics: Invalid canvas or dimensions.");
            return;
        }

        // Increased solver iterations for better stacking stability.
        const engineOptions = {
            enableSleeping: true,
            positionIterations: 8,
            velocityIterations: 6
        };
        Physics.engine = Matter.Engine.create(engineOptions);

        Physics.world = Physics.engine.world;
        Physics.engine.world.gravity.y = 0.7; // Keep gravity relatively low

        Physics.render = Matter.Render.create({
            element: canvasElement.parentNode,
            canvas: canvasElement,
            engine: Physics.engine,
            options: {
                width: containerWidth,
                height: containerHeight,
                wireframes: false,
                background: 'transparent',
                showSleeping: false,
                pixelRatio: window.devicePixelRatio || 1
            }
        });

        Physics.currentMode = mode;
        Physics.currentSegments = segments;
        Physics.createWalls(containerWidth, containerHeight, mode, segments);
        Physics.configureRenderMask();

        Physics.runner = Matter.Runner.create();
        Matter.Runner.run(Physics.runner, Physics.engine);
        Matter.Render.run(Physics.render);

        Physics.isInitialized = true;
        Physics.isRunning = true;
        console.log("Physics engine initialized and running.");
    },

    createWalls: function(width, height, mode = Physics.currentMode, segments = Physics.currentSegments) {
        if (!Physics.world) return;

        const staticBodies = Matter.Composite.allBodies(Physics.world).filter(body => body.isStatic);
        if (staticBodies.length > 0) {
            Matter.World.remove(Physics.world, staticBodies);
        }

        const wallThickness = 15;
        const wallOptions = {
            isStatic: true,
            friction: 0.6,
            restitution: 0.1,
            render: { visible: false }
        };

        const walls = [];
        // Floor
        walls.push(Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness * 2, wallThickness, wallOptions));
        // Left and right container walls
        walls.push(Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions));
        walls.push(Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions));

        if (mode === 'sand') {
            const dividerCount = Math.max(1, segments);
            const segmentWidth = width / dividerCount;
            for (let i = 1; i < dividerCount; i++) {
                const dividerX = i * segmentWidth;
                walls.push(Matter.Bodies.rectangle(dividerX, height / 2, wallThickness, height + wallThickness * 2, wallOptions));
            }
        }

        Matter.World.add(Physics.world, walls);
    },

    updateWallPositions: function(newWidth, newHeight) {
        Physics.createWalls(newWidth, newHeight, Physics.currentMode, Physics.currentSegments);
    },

    addParticle: function(segmentIndex, color) {
        if (!Physics.isInitialized || !Physics.engine || !Physics.world || !Physics.render?.options?.width) return false;
        if (Physics.currentMode !== 'sand') return false;

        const numSegments = Math.max(1, Physics.currentSegments || State.SAND_COLORS.length);
        if (segmentIndex < 0 || segmentIndex >= numSegments) return false;

        const segmentWidth = Physics.render.options.width / numSegments;
        // For polygons, 'radius' means distance from center to vertex.
        const radius = Settings.preferences?.sandParticleSize || 5;
        const wallThickness = 15;
        const buffer = radius * 0.5;

        const segmentStartX = segmentIndex * segmentWidth;
        const minX = segmentStartX + (wallThickness / 2) + radius + buffer;
        const maxX = segmentStartX + segmentWidth - (wallThickness / 2) - radius - buffer;

        if (minX >= maxX) {
            return false;
        }

        const x = minX + (Math.random() * (maxX - minX));
        const y = radius + 4;

        const particle = Matter.Bodies.polygon(x, y, 6, radius, {
            restitution: 0.15,
            friction: 0.7,
            frictionAir: 0.01,
            density: 0.01,
            render: { fillStyle: color },
            sleepThreshold: 60
        });

        Matter.Body.setVelocity(particle, { x: (Math.random() - 0.5) * 0.1, y: Math.random() * 0.1 });
        Matter.Body.setAngularVelocity(particle, (Math.random() - 0.5) * 0.01);
        Matter.World.add(Physics.world, particle);
        return true;
    },

    addWaterParticle: function(color = '#4aa8ff') {
        if (!Physics.isInitialized || !Physics.engine || !Physics.world || !Physics.render?.options?.width) return false;
        if (Physics.currentMode !== 'water') return false;

        const width = Physics.render.options.width;
        const radius = Math.max(2, (Settings.preferences?.sandParticleSize || 5) * 0.8);
        const wallThickness = 15;
        const buffer = radius * 0.25;

        const minX = (wallThickness / 2) + radius + buffer;
        const maxX = width - (wallThickness / 2) - radius - buffer;
        if (minX >= maxX) return false;

        const x = minX + (Math.random() * (maxX - minX));
        const y = -radius * 2;

        const droplet = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.03,
            friction: 0.01,
            frictionStatic: 0.02,
            frictionAir: 0.01,
            density: 0.0008,
            render: { fillStyle: color },
            sleepThreshold: 120
        });

        Matter.Body.setVelocity(droplet, { x: (Math.random() - 0.5) * 0.08, y: Math.random() * 0.06 });
        Matter.World.add(Physics.world, droplet);
        return true;
    },

    getSegmentTopYs: function() {
        if (!Physics.world || !Physics.render?.options?.width) return null;

        const numSegments = Math.max(1, Physics.currentSegments || State.SAND_COLORS.length);
        const segmentWidth = Physics.render.options.width / numSegments;
        const segmentTopYs = Array(numSegments).fill(Infinity);
        const dynamicBodies = Matter.Composite.allBodies(Physics.world).filter(body => !body.isStatic);

        dynamicBodies.forEach(body => {
            const x = body.position?.x;
            if (typeof x !== 'number' || Number.isNaN(x)) return;

            const segmentIndex = Math.max(0, Math.min(numSegments - 1, Math.floor(x / segmentWidth)));
            const topY = body.bounds?.min?.y;
            if (typeof topY === 'number' && !Number.isNaN(topY) && topY < segmentTopYs[segmentIndex]) {
                segmentTopYs[segmentIndex] = topY;
            }
        });

        return segmentTopYs;
    },

    getTopY: function() {
        if (!Physics.world) return null;
        const dynamicBodies = Matter.Composite.allBodies(Physics.world).filter(body => !body.isStatic);
        if (dynamicBodies.length === 0) return Infinity;

        let topY = Infinity;
        dynamicBodies.forEach(body => {
            const bodyTop = body.bounds?.min?.y;
            if (typeof bodyTop === 'number' && !Number.isNaN(bodyTop) && bodyTop < topY) {
                topY = bodyTop;
            }
        });
        return topY;
    },

    clearDynamicBodies: function() {
        if (!Physics.world) return;
        const allBodies = Matter.Composite.allBodies(Physics.world);
        const bodiesToRemove = allBodies.filter(body => !body.isStatic);
        if (bodiesToRemove.length > 0) {
            Matter.World.remove(Physics.world, bodiesToRemove);
        }
    },

    configureRenderMask: function() {
        if (!Physics.render) return;

        if (Physics.renderMaskHandler) {
            Matter.Events.off(Physics.render, 'afterRender', Physics.renderMaskHandler);
            Physics.renderMaskHandler = null;
        }

        if (Physics.currentMode !== 'sand') return;

        Physics.renderMaskHandler = () => {
            Physics.applyRoundedSegmentMask();
        };
        Matter.Events.on(Physics.render, 'afterRender', Physics.renderMaskHandler);
    },

    applyRoundedSegmentMask: function() {
        if (!Physics.render?.context || !Physics.render?.options) return;

        const ctx = Physics.render.context;
        const width = Physics.render.options.width;
        const height = Physics.render.options.height;
        const segments = Math.max(1, Physics.currentSegments || State.SAND_COLORS.length);

        const contentWidth = Math.max(1, width - (SAND_OUTER_PADDING * 2));
        const slotWidth = (contentWidth - (SAND_SEGMENT_GAP * (segments - 1))) / segments;
        const segmentHeight = Math.max(1, height - (SAND_OUTER_PADDING * 2) - (SAND_INNER_INSET * 2));
        const y = SAND_OUTER_PADDING + SAND_INNER_INSET;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();

        for (let i = 0; i < segments; i++) {
            const x = SAND_OUTER_PADDING + (i * (slotWidth + SAND_SEGMENT_GAP)) + SAND_INNER_INSET;
            const w = Math.max(1, slotWidth - (SAND_INNER_INSET * 2));
            const r = Math.min(SAND_CORNER_RADIUS, w / 2, segmentHeight / 2);
            addRoundedRectPath(ctx, x, y, w, segmentHeight, r);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    },

    stop: function() {
         if (!Physics.isRunning) return;
         if (Physics.runner) Matter.Runner.stop(Physics.runner);
         if (Physics.render) Matter.Render.stop(Physics.render);
         Physics.isRunning = false;
    },

    start: function() {
         if (Physics.isRunning || !Physics.isInitialized) return;
         if (Physics.render) Matter.Render.run(Physics.render);
         if (Physics.runner && Physics.engine) {
             Matter.Runner.run(Physics.runner, Physics.engine);
             Physics.isRunning = true;
         } else {
             console.error("Cannot start physics, not initialized.");
         }
    },

    destroy: function() {
         console.log("Destroying physics engine...");
         Physics.stop();
         if (Physics.render && Physics.renderMaskHandler) {
             Matter.Events.off(Physics.render, 'afterRender', Physics.renderMaskHandler);
             Physics.renderMaskHandler = null;
         }
         if (Physics.world) Matter.World.clear(Physics.world, false);
         if (Physics.engine) Matter.Engine.clear(Physics.engine);
         Physics.engine = null;
         Physics.world = null;
         Physics.render = null;
         Physics.runner = null;
         Physics.isInitialized = false;
         Physics.isRunning = false;
         Physics.currentMode = 'sand';
         Physics.currentSegments = State.SAND_COLORS.length;
         console.log("Physics engine destroyed.");
    }
};
