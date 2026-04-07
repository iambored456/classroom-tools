import './styles.css'

import * as culori from 'culori';

// DOM Elements
const lightnessSlider = document.getElementById('lightness-slider');
const chromaSlider = document.getElementById('chroma-slider');
const colorCountInput = document.getElementById('color-count');
const hueCanvas = document.getElementById('hue-canvas');
const paletteContainer = document.getElementById('palette-container');
const findMaxLBtn = document.getElementById('find-max-l-btn');
const findMaxCBtn = document.getElementById('find-max-c-btn');
const lockToEdgeCheckbox = document.getElementById('lock-to-edge-checkbox');
const sweetSpotSlider = document.getElementById('sweet-spot-slider');
const threeDContainer = document.getElementById('three-d-container');
const threeDPlaceholder = document.getElementById('three-d-placeholder');
const threeDControls = document.getElementById('three-d-controls');
const show3DBtn = document.getElementById('show-three-d-btn');
const toggleFullGamutCheckbox = document.getElementById('toggle-full-gamut');
const toggleSafeGamutCheckbox = document.getElementById('toggle-safe-gamut');
const copyHexBtn = document.getElementById('copy-hex-btn');
const hueMarkersContainer = document.getElementById('hue-markers-container');
const lightnessValueInput = document.getElementById('lightness-value-input');
const chromaValueInput = document.getElementById('chroma-value-input');
const threeDInstructions = document.getElementById('three-d-instructions');
const sweetSpotValueInput = document.getElementById('sweet-spot-value-input');
const lcGraphCanvas = document.getElementById('lc-graph-canvas');
const findMaxSweetSpotBtn = document.getElementById('find-max-sweet-spot-btn');
const paletteTableBody = document.getElementById('palette-table-body');
const flipPaletteCheckbox = document.getElementById('flip-palette-checkbox');
const spiralModeCheckbox = document.getElementById('spiral-mode-checkbox');
const spiralColorCountInput = document.getElementById('spiral-color-count');
const spiralLMinInput = document.getElementById('spiral-lmin-input');
const spiralLMaxInput = document.getElementById('spiral-lmax-input');
const hueTurnsInput = document.getElementById('hue-turns-input');
const spiralPerHueEdgeCheckbox = document.getElementById('spiral-per-hue-edge-checkbox');
const applyPitchMappingBtn = document.getElementById('apply-pitch-mapping-btn');


// App State
let THREE;
let OrbitControlsCtor;
let threeDModulePromise = null;
let scene, camera, renderer, controls, paletteGroup, gamutMesh, safeGamutMesh;
let is3DInitialized = false;
let sweetSpotPath = [];
let currentPalette = [];
let startHue = 0;

const oklchConverter = culori.converter('oklab');
const pitchLabels = [
    'A0','A#0','B0','C1','C#1','D1','D#1','E1','F1','F#1','G1','G#1',
    'A1','A#1','B1','C2','C#2','D2','D#2','E2','F2','F#2','G2','G#2',
    'A2','A#2','B2','C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3',
    'A3','A#3','B3','C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4',
    'A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5',
    'A5','A#5','B5','C6','C#6','D6','D#6','E6','F6','F#6','G6','G#6',
    'A6','A#6','B6','C7','C#7','D7','D#7','E7','F7','F#7','G7','G#7',
    'A7','A#7','B7','C8'
];

async function ensureThreeDDependencies() {
    if (!threeDModulePromise) {
        threeDModulePromise = Promise.all([
            import('three'),
            import('three/addons/controls/OrbitControls.js')
        ]).then(([threeModule, orbitControlsModule]) => {
            THREE = threeModule;
            OrbitControlsCtor = orbitControlsModule.OrbitControls;
        }).catch((error) => {
            threeDModulePromise = null;
            throw error;
        });
    }

    await threeDModulePromise;
}

async function init3D() {
    await ensureThreeDDependencies();

    const containerWidth = threeDContainer.clientWidth;
    const containerHeight = threeDContainer.clientHeight;
    
    if (containerWidth === 0 || containerHeight === 0) {
        threeDPlaceholder.innerHTML = '<p class="info">Error: Could not determine container size for 3D view.</p>';
        threeDPlaceholder.classList.remove('hidden');
        threeDContainer.classList.add('hidden');
        return false;
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    camera.position.set(0, 0.5, 1.2);
    camera.lookAt(0, 0.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    threeDContainer.appendChild(renderer.domElement);

    controls = new OrbitControlsCtor(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.5, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 2, 3);
    scene.add(ambientLight, directionalLight);

    paletteGroup = new THREE.Group();
    scene.add(paletteGroup);

    if (!gamutMesh) gamutMesh = createGamutShellMesh();
    scene.add(gamutMesh);
    
    if (!safeGamutMesh) safeGamutMesh = createSafeGamutShellMesh();
    scene.add(safeGamutMesh);

    gamutMesh.visible = toggleFullGamutCheckbox.checked;
    safeGamutMesh.visible = toggleSafeGamutCheckbox.checked;

    is3DInitialized = true;
    
    function animate() {
        if (!renderer) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    return true;
}

function oklchToLab3D(l, c, h) {
    const lab = oklchConverter({ mode: 'oklch', l, c, h });
    return new THREE.Vector3(lab.a * 2.0, lab.l, lab.b * 2.0);
}

function createGamutShellMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = [], colors = [], indices = [];
    const l_steps = 40, h_steps = 72;
    for (let i = 0; i <= l_steps; i++) {
        const l = i / l_steps;
        for (let j = 0; j <= h_steps; j++) {
            const h = (j / h_steps) * 360;
            const colorAtCusp = culori.clampChroma({ mode: 'oklch', l, h, c: 0.5 }, 'oklch');
            positions.push(...oklchToLab3D(colorAtCusp.l, colorAtCusp.c, colorAtCusp.h).toArray());
            const rgb = culori.converter('rgb')(colorAtCusp);
            colors.push(rgb.r, rgb.g, rgb.b);
        }
    }
    for (let i = 0; i < l_steps; i++) {
        for (let j = 0; j < h_steps; j++) {
            const a = i * (h_steps + 1) + j, b = a + 1;
            const c = (i + 1) * (h_steps + 1) + (j + 1), d = (i + 1) * (h_steps + 1) + j;
            indices.push(a, b, d, b, c, d);
        }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9
    }));
}

function createSafeGamutShellMesh() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [], indices = [];
    const l_steps = 20, h_steps = 36;
    for (let i = 0; i <= l_steps; i++) {
        const l = i / l_steps;
        let safeChroma = findMaxSafeChromaForL(l);
        for (let j = 0; j <= h_steps; j++) {
            const h = (j / h_steps) * 360;
            vertices.push(...oklchToLab3D(l, safeChroma, h).toArray());
        }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    for (let i = 0; i < l_steps; i++) {
        for (let j = 0; j < h_steps; j++) {
            const a = i * (h_steps + 1) + j, b = i * (h_steps + 1) + (j + 1);
            const c = (i + 1) * (h_steps + 1) + (j + 1), d = (i + 1) * (h_steps + 1) + j;
            indices.push(a, b, d, b, c, d);
        }
    }
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xaaaaee, wireframe: true, roughness: 0.7, side: THREE.DoubleSide }));
}

function update3DVisualization() {
    if (!is3DInitialized) return;
    while (paletteGroup.children.length > 0) paletteGroup.remove(paletteGroup.children[0]);
    const sphereGeometry = new THREE.SphereGeometry(0.03, 32, 16);
    
    currentPalette.forEach(color => {
        const material = new THREE.MeshStandardMaterial({
            color: color.inGamut ? color.hex : 0xffffff,
            roughness: 0.5
        });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.copy(oklchToLab3D(color.oklch.l, color.oklch.c, color.oklch.h));
        paletteGroup.add(sphere);
    });
}

function drawLCGraph(l, c) {
    const ctx = lcGraphCanvas.getContext('2d');
    const width = lcGraphCanvas.width;
    const height = lcGraphCanvas.height;
    const padding = 20;
    const maxC = 0.4; // Corresponds to the chroma slider max

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#4a4a6e'; 
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
        const y = height - padding - (i * (height - padding * 2) / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
        const x = padding + (i * (width - padding * 2) / 4);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    ctx.strokeStyle = '#b0b0d0'; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    if (lockToEdgeCheckbox.checked && sweetSpotPath.length > 0) {
        ctx.strokeStyle = '#00aaff'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sweetSpotPath.length; i++) {
            const point = sweetSpotPath[i];
            const x = padding + (point.l * (width - padding * 2));
            const y = (height - padding) - (point.c / maxC * (height - padding * 2));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    const pointX = padding + (l * (width - padding * 2));
    const pointY = (height - padding) - (c / maxC * (height - padding * 2));
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pointX, pointY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}

function updateApp() {
    const spiralEnabled = spiralModeCheckbox && spiralModeCheckbox.checked;
    let l, c;
    let count = parseInt(colorCountInput.value, 10);
    const clampCount = (value, element) => {
        let result = value;
        if (element) {
            const min = parseInt(element.min, 10);
            const max = parseInt(element.max, 10);
            if (!isNaN(min)) result = Math.max(min, result);
            if (!isNaN(max)) result = Math.min(max, result);
        }
        return result;
    };
    if (spiralEnabled && spiralColorCountInput) {
        const spiralCount = parseInt(spiralColorCountInput.value, 10);
        if (!isNaN(spiralCount)) count = clampCount(spiralCount, spiralColorCountInput);
    }
    count = clampCount(count, colorCountInput);
    count = Math.max(1, isNaN(count) ? 1 : count);

    currentPalette = [];

    if (spiralEnabled) {
        const rawLMin = parseFloat(spiralLMinInput.value);
        const rawLMax = parseFloat(spiralLMaxInput.value);
        const lMin = Math.max(0, Math.min(1, isNaN(rawLMin) ? 0 : rawLMin));
        const lMax = Math.max(0, Math.min(1, isNaN(rawLMax) ? 1 : rawLMax));
        const turns = parseFloat(hueTurnsInput.value);
        const turnsValue = isNaN(turns) ? 1 : turns;
        const perHueEdge = spiralPerHueEdgeCheckbox && spiralPerHueEdgeCheckbox.checked;

        // Spiral mode: per-index L/H and optional per-hue chroma edge.
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1);
            const l_i = lMin + (lMax - lMin) * t;
            const hUnwrapped = startHue + turnsValue * 360 * t;
            const h_i = ((hUnwrapped % 360) + 360) % 360;
            const c_i = perHueEdge ? findMaxChromaForLAndH(l_i, h_i) : getSafeChromaForL(l_i);
            const colorOKLCH = { mode: 'oklch', l: l_i, c: c_i, h: h_i };
            currentPalette.push({
                index: i,
                oklch: colorOKLCH,
                hex: culori.formatHex(colorOKLCH),
                inGamut: culori.displayable(colorOKLCH)
            });
        }

        // Use the midpoint as a representative for the LC graph and gradient.
        const midT = 0.5;
        l = lMin + (lMax - lMin) * midT;
        const midHUnwrapped = startHue + turnsValue * 360 * midT;
        const midH = ((midHUnwrapped % 360) + 360) % 360;
        c = perHueEdge ? findMaxChromaForLAndH(l, midH) : getSafeChromaForL(l);
    } else {
        if (lockToEdgeCheckbox.checked) {
            const index = parseInt(sweetSpotSlider.value, 10);
            const point = sweetSpotPath[index];
            if (point) {
                l = point.l;
                c = point.c;
                lightnessSlider.value = l;
                chromaSlider.value = c;
            } else {
                l = parseFloat(lightnessSlider.value);
                c = parseFloat(chromaSlider.value);
            }
            const normalizedValue = sweetSpotSlider.value / (sweetSpotSlider.max || 1);
            if (document.activeElement !== sweetSpotValueInput) {
                 sweetSpotValueInput.value = normalizedValue.toFixed(3);
            }
        } else {
            l = parseFloat(lightnessSlider.value);
            c = parseFloat(chromaSlider.value);
        }
        
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            const h = (startHue + i * hueStep) % 360;
            currentPalette.push({ index: i, oklch: { mode: 'oklch', l, c, h }, hex: culori.formatHex({ mode: 'oklch', l, c, h }), inGamut: culori.displayable({ mode: 'oklch', l, c, h }) });
        }
    }
    
    if (document.activeElement !== lightnessValueInput) lightnessValueInput.value = (l ?? 0).toFixed(3);
    if (document.activeElement !== chromaValueInput) chromaValueInput.value = (c ?? 0).toFixed(3);
    
    drawLCGraph(l || 0, c || 0);
    renderPaletteSwatches();
    renderPaletteTable();
    drawHueGradient(l || 0, c || 0);
    update3DVisualization();
}

function renderPaletteSwatches() {
    paletteContainer.innerHTML = '';
    const displayPalette = flipPaletteCheckbox && flipPaletteCheckbox.checked ? [...currentPalette].reverse() : currentPalette;
    displayPalette.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color.inGamut ? color.hex : '#555';
        swatch.innerHTML = `<span>${color.hex}</span>`;
        if (!color.inGamut) swatch.classList.add('out-of-gamut');
        paletteContainer.appendChild(swatch);
    });
}

function renderPaletteTable() {
    if (!paletteTableBody) return;
    paletteTableBody.innerHTML = '';
    let sorted = [...currentPalette].sort((a, b) => b.oklch.l - a.oklch.l);
    if (flipPaletteCheckbox && flipPaletteCheckbox.checked) sorted = sorted.reverse();
    sorted.forEach(color => {
        const row = document.createElement('tr');

        const colorCell = document.createElement('td');
        const swatch = document.createElement('div');
        swatch.className = 'table-swatch';
        swatch.style.backgroundColor = color.inGamut ? color.hex : '#555';
        swatch.style.width = '28px';
        swatch.style.height = '28px';
        swatch.style.borderRadius = '6px';
        swatch.style.border = '1px solid rgba(0,0,0,0.15)';
        colorCell.appendChild(swatch);

        const pitchCell = document.createElement('td');
        const pitch = pitchLabels[color.index] ?? `#${color.index + 1}`;
        pitchCell.textContent = pitch;

        const hexCell = document.createElement('td');
        hexCell.textContent = color.hex;

        const oklchCell = document.createElement('td');
        const { l, c, h } = color.oklch;
        oklchCell.textContent = `L ${l.toFixed(3)}, C ${c.toFixed(3)}, H ${h.toFixed(1)}`;

        row.appendChild(colorCell);
        row.appendChild(pitchCell);
        row.appendChild(hexCell);
        row.appendChild(oklchCell);
        paletteTableBody.appendChild(row);
    });
}

function drawHueGradient(l, c) {
    const ctx = hueCanvas.getContext('2d');
    const width = hueCanvas.width;
    for (let x = 0; x < width; x++) {
        const h = (x / width) * 360;
        ctx.fillStyle = culori.displayable({ mode: 'oklch', l, c, h }) ? culori.formatHex({ mode: 'oklch', l, c, h }) : '#808080';
        ctx.fillRect(x, 0, 1, hueCanvas.height);
    }
    hueMarkersContainer.innerHTML = '';
    currentPalette.forEach(color => {
        const marker = document.createElement('div');
        marker.className = 'hue-marker';
        marker.style.left = `${((color.oklch.h - startHue + 360) % 360) / 360 * 100}%`;
        hueMarkersContainer.appendChild(marker);
    });
}

function isChromaSafeForAllHues(l, c) {
    if (l <= 0.01 || l >= 0.99) return false;
    for (let h = 0; h < 360; h += 5) {
        if (!culori.displayable({ mode: 'oklch', l, c, h })) return false;
    }
    return true;
}

function findMaxSafeChromaForL(l) {
    for (let c = 0.4; c >= 0; c -= 0.001) {
        if (isChromaSafeForAllHues(l, c)) return c;
    }
    return 0;
}

// Interpolates the precomputed sweet spot path to fetch a safe chroma for any lightness.
function getSafeChromaForL(l) {
    if (!sweetSpotPath.length) return 0;
    const clampedL = Math.max(0, Math.min(1, l));
    const indexFloat = clampedL * (sweetSpotPath.length - 1);
    const i0 = Math.floor(indexFloat);
    const i1 = Math.min(i0 + 1, sweetSpotPath.length - 1);
    const t = indexFloat - i0;
    const c0 = sweetSpotPath[i0].c;
    const c1 = sweetSpotPath[i1].c;
    return c0 + (c1 - c0) * t;
}

// Binary search for the maximum chroma that is displayable at a specific (L, H).
// Per-hue edge checks cost extra work per color but are still fine for ~100 samples.
function findMaxChromaForLAndH(l, h, maxC = 0.5) {
    let low = 0;
    let high = maxC;
    let result = 0;
    for (let i = 0; i < 14; i++) {
        const mid = (low + high) / 2;
        if (culori.displayable({ mode: 'oklch', l, c: mid, h })) {
            result = mid;
            low = mid;
        } else {
            high = mid;
        }
    }
    return result;
}

function findMaxSafeLightnessForC(c) {
    for (let l = 0.99; l > 0.01; l -= 0.01) {
        if (isChromaSafeForAllHues(l, c)) return l;
    }
    return parseFloat(lightnessSlider.value);
}

function precalculateSweetSpotPath() {
    sweetSpotPath = [];
    for (let i = 0; i <= 200; i++) {
        const l = i / 200;
        sweetSpotPath.push({ l, c: findMaxSafeChromaForL(l) });
    }
}

function init() {
    precalculateSweetSpotPath();
    sweetSpotSlider.max = sweetSpotPath.length - 1;

    const allControls = [
        lightnessSlider,
        chromaSlider,
        colorCountInput,
        sweetSpotSlider,
        spiralModeCheckbox,
        spiralColorCountInput,
        spiralLMinInput,
        spiralLMaxInput,
        hueTurnsInput,
        spiralPerHueEdgeCheckbox,
        flipPaletteCheckbox
    ];
    allControls.filter(Boolean).forEach(control => control.addEventListener('input', updateApp));
    
    hueCanvas.addEventListener('click', (event) => {
        const rect = hueCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        startHue = (x / hueCanvas.clientWidth) * 360;
        updateApp();
    });

    findMaxCBtn.addEventListener('click', () => {
        chromaSlider.value = findMaxSafeChromaForL(parseFloat(lightnessSlider.value));
        updateApp();
    });
    findMaxLBtn.addEventListener('click', () => {
        lightnessSlider.value = findMaxSafeLightnessForC(parseFloat(chromaSlider.value));
        updateApp();
    });

    findMaxSweetSpotBtn.addEventListener('click', () => {
        if (sweetSpotPath.length === 0) return;
        const maxChromaPoint = sweetSpotPath.reduce((max, point) => point.c > max.c ? point : max, sweetSpotPath[0]);
        const maxIndex = sweetSpotPath.indexOf(maxChromaPoint);
        sweetSpotSlider.value = maxIndex;
        updateApp();
    });

    lockToEdgeCheckbox.addEventListener('change', event => {
        const isLocked = event.target.checked;
        const sweetSpotSteppers = document.querySelectorAll('.stepper[data-for="sweet-spot-slider"]');
        
        sweetSpotSlider.disabled = !isLocked;
        sweetSpotValueInput.disabled = !isLocked;
        findMaxSweetSpotBtn.disabled = !isLocked;
        sweetSpotSteppers.forEach(b => b.disabled = !isLocked);

        lightnessSlider.disabled = isLocked;
        chromaSlider.disabled = isLocked;
        lightnessValueInput.disabled = isLocked;
        chromaValueInput.disabled = isLocked;
        
        if (isLocked) {
            const currentL = parseFloat(lightnessSlider.value);
            let closestIndex = 0, minDistance = 1;
            sweetSpotPath.forEach((point, index) => {
                const distance = Math.abs(point.l - currentL);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });
            sweetSpotSlider.value = closestIndex;
        }
        updateApp();
    });

    sweetSpotValueInput.addEventListener('change', (e) => {
        const normalizedValue = parseFloat(e.target.value);
        if (!isNaN(normalizedValue)) {
            const clampedValue = Math.max(0, Math.min(1, normalizedValue));
            const sliderValue = Math.round(clampedValue * sweetSpotSlider.max);
            sweetSpotSlider.value = sliderValue;
            updateApp();
        }
    });

    document.querySelectorAll('.value-input').forEach(input => {
        if (input.id === 'sweet-spot-value-input') return;
        input.addEventListener('change', (e) => {
            const sliderId = e.target.id.replace('-value-input', '-slider');
            document.getElementById(sliderId).value = e.target.value;
            updateApp();
        });
    });

    document.querySelectorAll('.stepper').forEach(button => {
        button.addEventListener('click', (e) => {
            const slider = document.getElementById(e.target.dataset.for);
            const step = parseFloat(e.target.dataset.step);
            if (!slider || isNaN(step)) return;
            const current = parseFloat(slider.value) || 0;
            let next = current + step;
            if (slider.min !== '') next = Math.max(parseFloat(slider.min), next);
            if (slider.max !== '') next = Math.min(parseFloat(slider.max), next);
            if (slider.type === 'number' && Number.isInteger(step)) {
                slider.value = Math.round(next);
            } else {
                slider.value = next.toFixed(4);
            }
            updateApp();
        });
    });

    copyHexBtn.title = 'Copies HEX plus OKLCH data';
    copyHexBtn.addEventListener('click', () => {
        const header = 'index\thex\tL\tC\tH';
        const rows = currentPalette.map((color, idx) =>
            `${idx}\t${color.hex}\t${color.oklch.l.toFixed(3)}\t${color.oklch.c.toFixed(3)}\t${color.oklch.h.toFixed(1)}`
        );
        const payload = [header, ...rows].join('\n');
        navigator.clipboard.writeText(payload).then(() => {
            copyHexBtn.textContent = 'Copied!';
            setTimeout(() => { copyHexBtn.textContent = 'Copy Hex Codes'; }, 1500);
        });
    });
    
    show3DBtn.addEventListener('click', () => {
        if (is3DInitialized) return;
    
        threeDPlaceholder.classList.add('hidden');
        threeDContainer.classList.remove('hidden');
        threeDControls.classList.remove('hidden');
        threeDInstructions.classList.remove('hidden');
    
        requestAnimationFrame(async () => {
            const containerWidth = threeDContainer.clientWidth;
            const height = containerWidth * 0.75;
            threeDContainer.style.height = `${height}px`;

            show3DBtn.disabled = true;
            show3DBtn.textContent = 'Loading 3D...';

            try {
                const initialized = await init3D();
                if (initialized) {
                    updateApp();
                    return;
                }

                threeDControls.classList.add('hidden');
                threeDInstructions.classList.add('hidden');
                threeDContainer.style.height = '';
            } catch (error) {
                console.error('Failed to initialize 3D view.', error);
                threeDPlaceholder.innerHTML = '<p class="info">Error: Unable to load 3D view.</p>';
                threeDPlaceholder.classList.remove('hidden');
                threeDContainer.classList.add('hidden');
                threeDControls.classList.add('hidden');
                threeDInstructions.classList.add('hidden');
                threeDContainer.style.height = '';
            } finally {
                show3DBtn.disabled = false;
                if (!is3DInitialized) {
                    show3DBtn.textContent = 'Show 3D View';
                }
            }
        });
    });

    toggleFullGamutCheckbox.addEventListener('change', (e) => { if (gamutMesh) gamutMesh.visible = e.target.checked; });
    toggleSafeGamutCheckbox.addEventListener('change', (e) => { if (safeGamutMesh) safeGamutMesh.visible = e.target.checked; });

    if (applyPitchMappingBtn) {
        applyPitchMappingBtn.addEventListener('click', () => {
            if (spiralModeCheckbox) spiralModeCheckbox.checked = true;
            if (spiralColorCountInput) spiralColorCountInput.value = 88;
            if (hueTurnsInput) hueTurnsInput.value = 7.25; // 87 steps * 30° = 2610° ≈ 7.25 turns
            if (spiralLMinInput) spiralLMinInput.value = spiralLMinInput.value || '0.350';
            if (spiralLMaxInput) spiralLMaxInput.value = spiralLMaxInput.value || '0.900';
            startHue = 270; // A0 at 270°
            updateApp();
        });
    }
    
    window.addEventListener('resize', () => {
        if (!is3DInitialized || !renderer) return;

        const containerWidth = threeDContainer.clientWidth;
        if (containerWidth === 0) return;
        const height = containerWidth * 0.75;
        threeDContainer.style.height = `${height}px`;
        
        camera.aspect = containerWidth / height;
        camera.updateProjectionMatrix();
        renderer.setSize(containerWidth, height);
    });

    updateApp();
}

window.addEventListener('load', init);
