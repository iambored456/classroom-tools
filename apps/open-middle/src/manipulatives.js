const source = (name) => `OM #${name}.docx`;

export const manipulativeQuestions = [
  { id: '13-ladybugs', title: 'Decomposing 10 with Ladybugs', topic: 'Addition', summary: 'Add spots to five pairs of ladybugs.', prompt: 'Add spots to each bug to make the total number of spots equal to 10.', sourceFiles: [source('13 - Decomposing Numbers_ 10 w_ Ladybugs')] },
  { id: '20', title: 'Domino Square 1', topic: 'Addition', summary: 'Arrange four dominoes so every side has the same total.', prompt: 'Use four of these dominoes to form a square with the same number of dots on each side.', sourceFiles: [source('20 - Domino Square 1')] },
  { id: '21', title: 'Domino Square 2', topic: 'Addition', summary: 'Explore a different set of five dominoes.', prompt: 'Use four of these dominoes to form a square with the same number of dots on each side.', sourceFiles: [source('21 - Domino Square 2')] },
  { id: '20-21-boards', title: 'Domino Cutouts & Boards', topic: 'Addition', summary: 'Reusable practice boards for both domino challenges.', prompt: 'Choose a set. Use four dominoes to make all four side totals equal.', sourceFiles: [source('20, 21 - Domino Cutouts & Boards')] },
  { id: '495', title: 'Parallel & Perpendicular Lines', topic: 'Geometry', summary: 'Place digits, plot points, and change how the points connect.', prompt: 'Use the digits 0 to 9 at most once to create four coordinates, in two pairs. Connect the pairs to make parallel lines, perpendicular lines, or both depending on how they are connected.', sourceFiles: [source('495 - Coordinates Creating Parallel or Perpendicular Lines')] },
].map((question) => ({ ...question, kind: 'manipulative', layout: 'manipulative' }));

// Tile 4 in the source image for #20 has nine pips above two pips.
export const DOMINO_SETS = Object.freeze({
  '20': Object.freeze([[5, 5], [8, 4], [6, 3], [9, 2], [1, 7]]),
  '21': Object.freeze([[4, 0], [4, 1], [4, 3], [5, 3], [7, 1]]),
});
const SIDE_NAMES = ['Top', 'Right', 'Bottom', 'Left'];
export const COORDINATE_PAIRINGS = Object.freeze([
  { label: 'AB / CD', pairs: [[0, 1], [2, 3]] },
  { label: 'AC / BD', pairs: [[0, 2], [1, 3]] },
  { label: 'AD / BC', pairs: [[0, 3], [1, 2]] },
]);

/** Each tile covers two consecutive perimeter cells, clockwise from top-left. */
export function dominoSideTotals(set, placements, flips = []) {
  const tiles = typeof set === 'string' ? DOMINO_SETS[set] : set;
  const perimeter = Array(8).fill(null);
  placements.forEach((tile, side) => {
    if (!Number.isInteger(tile) || !tiles[tile] || side > 3) return;
    const values = flips[tile] ? [...tiles[tile]].reverse() : tiles[tile];
    perimeter[2 * side] = values[0];
    perimeter[2 * side + 1] = values[1];
  });
  return SIDE_NAMES.map((_, side) => {
    const cells = [perimeter[2 * side], perimeter[2 * side + 1], perimeter[(2 * side + 2) % 8]];
    return cells.some((value) => value === null) ? null : cells.reduce((sum, value) => sum + value, 0);
  });
}

export function evaluateDominoes(set, placements, flips = []) {
  if (placements.length !== 4 || placements.some((tile) => !Number.isInteger(tile))) return { status: 'incomplete', message: 'Place four dominoes on the board, then check the side totals.' };
  if (new Set(placements).size !== 4 || placements.some((tile) => !DOMINO_SETS[set]?.[tile])) return { status: 'invalid', message: 'Use four different dominoes from this set.' };
  const totals = dominoSideTotals(set, placements, flips);
  const equal = totals.every((total) => total === totals[0]);
  return { status: equal ? 'success' : 'retry', totals, message: equal ? `All four sides have ${totals[0]} dots. You made an equal-sided domino square!` : `The side totals are ${totals.join(', ')}. Try moving or flipping a domino to make them equal.` };
}

const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
const subtract = (p, q) => [p[0] - q[0], p[1] - q[1]];

/** Integer cross/dot products handle vertical lines without slope division. */
export function classifyLines(a, b, c, d) {
  const u = subtract(b, a), v = subtract(d, c);
  if (u.every((value) => value === 0) || v.every((value) => value === 0)) return 'degenerate';
  if (cross(u, v) === 0) return cross(subtract(c, a), u) === 0 ? 'coincident' : 'parallel';
  if (u[0] * v[0] + u[1] * v[1] === 0) return 'perpendicular';
  return 'neither';
}

export function evaluateCoordinates(values, mode = 'parallel', pairing = 0) {
  if (values.length !== 8 || values.some((value) => value === null || value === '')) return { status: 'incomplete', message: 'Fill all eight coordinate spaces, then check your lines.' };
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) return { status: 'invalid', message: 'Use one digit from 0 to 9 in each space.' };
  if (new Set(values).size !== 8) return { status: 'invalid', message: 'Use each digit at most once across all four coordinates.' };
  const points = Array.from({ length: 4 }, (_, index) => values.slice(index * 2, index * 2 + 2));
  const relations = COORDINATE_PAIRINGS.map(({ pairs: [[a, b], [c, d]] }) => classifyLines(points[a], points[b], points[c], points[d]));
  if (mode === 'both') {
    const parallel = relations.indexOf('parallel'), perpendicular = relations.indexOf('perpendicular');
    const success = parallel >= 0 && perpendicular >= 0;
    return { status: success ? 'success' : 'retry', points, relations, message: success ? `The same points work for both! ${COORDINATE_PAIRINGS[parallel].label} gives parallel lines; ${COORDINATE_PAIRINGS[perpendicular].label} gives perpendicular lines. Switch the pairing to see each.` : `With these points, ${relations.includes('parallel') ? 'a parallel pairing works' : 'no pairing is parallel'} and ${relations.includes('perpendicular') ? 'a perpendicular pairing works' : 'no pairing is perpendicular'}. Keep exploring with the same eight spaces.` };
  }
  const relation = relations[pairing] ?? relations[0];
  const success = relation === mode;
  const description = relation === 'neither' ? 'neither parallel nor perpendicular' : relation === 'coincident' ? 'coincident (the same line)' : relation === 'degenerate' ? 'not two valid lines' : relation;
  return { status: success ? 'success' : 'retry', points, relations, message: success ? `Your selected pairs make ${mode} lines!` : `Your selected pairs are ${description}. Try a different arrangement or pairing.` };
}

function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'disabled') node.disabled = value;
    else node.setAttribute(key, String(value));
  }
  node.append(...children);
  return node;
}
const button = (text, attributes = {}, children = []) => element('button', { type: 'button', text, ...attributes }, children);
const paragraph = (text, className = 'mp-help') => element('p', { text, class: className });
function readSaved(id) {
  try { return JSON.parse(localStorage.getItem(`open-middle:manipulatives:v1:${id}`) || 'null'); } catch { return null; }
}
function persist(id, state) {
  try { localStorage.setItem(`open-middle:manipulatives:v1:${id}`, JSON.stringify(state)); } catch { /* Practice still works when storage is unavailable. */ }
}
function feedbackNode(feedback) {
  return element('p', { class: `mp-feedback mp-${feedback?.status || 'idle'}`, role: 'status', 'aria-live': 'polite', text: feedback?.message || 'Your work is saved on this device as you explore.' });
}
function rerenderPreservingFocus(container, render) {
  const active = container.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
  render();
  if (active) Array.from(container.querySelectorAll('[data-focus]')).find((node) => node.dataset.focus === active)?.focus({ preventScroll: true });
}

function mountLadybugs(container, question, signal) {
  const saved = readSaved(question.id);
  let spots = Array.from({ length: 10 }, (_, bug) => Array.from({ length: 10 }, (_, spot) => saved?.spots?.[bug]?.[spot] === true));
  let feedback = null;
  function render() {
    const rows = element('div', { class: 'mp-bug-rows' });
    for (let row = 0; row < 5; row++) {
      const counts = [0, 1].map((bug) => spots[2 * row + bug].filter(Boolean).length);
      const children = [element('span', { class: 'mp-row-label', text: `Pair ${row + 1}` })];
      for (let bug = 0; bug < 2; bug++) {
        if (bug) children.push(element('span', { class: 'mp-math-symbol', text: '+' }));
        const index = 2 * row + bug;
        const controls = spots[index].map((isOn, dot) => button('', {
          class: `mp-spot ${isOn ? 'mp-on' : ''}`, 'data-bug': index, 'data-dot': dot,
          'data-focus': `bug-${index}-${dot}`, 'aria-label': `${isOn ? 'Remove' : 'Add'} spot ${dot + 1}, pair ${row + 1}, ${bug ? 'right' : 'left'} ladybug`, 'aria-pressed': isOn,
          style: `--spot-x:${dot % 2 ? 66 : 34}%;--spot-y:${23 + Math.floor(dot / 2) * 14}%`,
        }));
        children.push(element('div', { class: 'mp-bug-group' }, [element('div', { class: 'mp-ladybug', role: 'group', 'aria-label': `Pair ${row + 1}, ${bug ? 'right' : 'left'} ladybug: ${counts[bug]} spots` }, controls), element('span', { class: 'mp-bug-count', text: String(counts[bug]) })]));
      }
      children.push(element('span', { class: 'mp-math-symbol', text: '= 10' }), element('span', { class: 'mp-row-total', text: `${counts[0]} + ${counts[1]} = ${counts[0] + counts[1]}` }));
      rows.append(element('div', { class: 'mp-bug-row' }, children));
    }
    container.replaceChildren(element('section', { class: 'mp-workspace' }, [paragraph(question.prompt, 'mp-prompt'), paragraph('Tap the dotted spots to add or remove them. You may use the same number of spots in different pairs.'), rows, element('div', { class: 'mp-actions' }, [button('Check pairs', { 'data-action': 'check' }), button('Reset spots', { 'data-action': 'reset', class: 'mp-secondary' })]), feedbackNode(feedback)]));
  }
  container.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-bug')) {
      const bug = Number(target.dataset.bug), dot = Number(target.dataset.dot);
      spots[bug][dot] = !spots[bug][dot];
      feedback = null;
    } else if (target.dataset.action === 'reset') {
      spots = Array.from({ length: 10 }, () => Array(10).fill(false)); feedback = null;
    } else if (target.dataset.action === 'check') {
      const complete = Array.from({ length: 5 }, (_, row) => spots[2 * row].filter(Boolean).length + spots[2 * row + 1].filter(Boolean).length === 10).filter(Boolean).length;
      feedback = { status: complete === 5 ? 'success' : 'retry', message: complete === 5 ? 'All five pairs make 10! Can you find another way?' : `${complete} of 5 pairs make 10. Keep adding or removing spots in the other pairs.` };
    } else return;
    persist(question.id, { spots });
    rerenderPreservingFocus(container, render);
  }, { signal });
  render();
}

const PIP_POSITIONS = [[], [[1, 1]], [[0, 0], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 0], [2, 0], [0, 2], [2, 2]], [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 1], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]];
function dominoFaces(values) {
  return values.map((value) => element('span', { class: 'mp-domino-face', 'aria-hidden': 'true' }, PIP_POSITIONS[value].map(([x, y]) => element('i', { class: 'mp-pip', style: `--pip-x:${22 + 28 * x}%;--pip-y:${22 + 28 * y}%` }))));
}

function mountDominoes(container, question, signal) {
  const saved = readSaved(question.id);
  let set = question.id === '21' ? '21' : question.id === '20-21-boards' && saved?.set === '21' ? '21' : '20';
  let placements = Array.from({ length: 4 }, (_, side) => Number.isInteger(saved?.placements?.[side]) && saved.placements[side] >= 0 && saved.placements[side] < 5 ? saved.placements[side] : null);
  if (new Set(placements.filter((tile) => tile !== null)).size !== placements.filter((tile) => tile !== null).length) placements = Array(4).fill(null);
  let flips = Array.from({ length: 5 }, (_, tile) => saved?.flips?.[tile] === true), selected = null, feedback = null;
  const save = () => persist(question.id, { set, placements, flips });
  function render() {
    const intro = [paragraph(question.prompt, 'mp-prompt')];
    if (question.id === '20-21-boards') intro.push(element('div', { class: 'mp-mode-options', role: 'group', 'aria-label': 'Domino set' }, ['20', '21'].map((id) => button(`Square ${id === '20' ? 1 : 2}`, { 'data-set': id, 'aria-pressed': set === id }))));
    intro.push(paragraph('Select a domino, then select a board space. You can also drag dominoes. Flip swaps the two ends; Return puts a selected domino back in the tray.'));
    const tray = element('div', { class: 'mp-domino-tray', role: 'group', 'aria-label': 'Five dominoes' }, DOMINO_SETS[set].map((pair, tile) => element('div', { class: 'mp-tray-item' }, [
      button('', { class: `mp-domino mp-tray-domino ${selected === tile ? 'mp-selected' : ''} ${placements.includes(tile) ? 'mp-placed' : ''}`, 'data-tile': tile, 'data-focus': `tile-${tile}`, draggable: true, 'aria-label': `Domino ${tile + 1}: ${pair.join(' and ')} dots${placements.includes(tile) ? ', on board' : ''}`, 'aria-pressed': selected === tile }, dominoFaces(flips[tile] ? [...pair].reverse() : pair)),
      element('span', { text: `${tile + 1} · ${placements.includes(tile) ? 'On board' : 'In tray'}`, class: 'mp-tile-caption' }),
    ])));
    const totals = dominoSideTotals(set, placements, flips);
    const board = element('div', { class: 'mp-domino-board', role: 'group', 'aria-label': 'Domino square board' });
    placements.forEach((tile, side) => {
      const pair = tile === null ? null : DOMINO_SETS[set][tile];
      board.append(button('', { class: `mp-board-slot mp-slot-${side} ${pair ? 'mp-domino' : 'mp-empty'} ${selected === tile && tile !== null ? 'mp-selected' : ''}`, 'data-side': side, 'data-focus': `side-${side}`, ...(pair ? { 'data-tile': tile, draggable: true } : {}), 'aria-label': `${SIDE_NAMES[side]} board space${pair ? `, domino ${tile + 1}, ${(flips[tile] ? [...pair].reverse() : pair).join(' then ')} dots clockwise` : ', empty'}` }, pair ? dominoFaces(flips[tile] ? [...pair].reverse() : pair) : [element('span', { text: `${SIDE_NAMES[side]} space` })]));
    });
    board.append(element('div', { class: 'mp-board-center', 'aria-hidden': true, text: 'Equal sides' }));
    const totalList = element('div', { class: 'mp-totals', 'aria-label': 'Side totals' }, totals.map((total, side) => element('div', {}, [element('span', { text: SIDE_NAMES[side] }), element('strong', { text: total === null ? '—' : String(total) })])));
    container.replaceChildren(element('section', { class: 'mp-workspace' }, [...intro, tray, paragraph(selected === null ? 'Choose a domino to place, flip, or return.' : `Domino ${selected + 1} selected.`, 'mp-selection'), element('div', { class: 'mp-actions mp-tile-actions' }, [button('Flip selected', { 'data-action': 'flip', disabled: selected === null }), button('Return selected', { 'data-action': 'return', disabled: selected === null || !placements.includes(selected), class: 'mp-secondary' })]), board, totalList, paragraph('Each side counts its three cells, including both corners. A corner counts toward two sides.'), element('div', { class: 'mp-actions' }, [button('Check square', { 'data-action': 'check' }), button('Reset board', { 'data-action': 'reset', class: 'mp-secondary' })]), feedbackNode(feedback)]));
  }
  function place(tile, side) {
    placements = placements.map((current) => current === tile ? null : current);
    placements[side] = tile;
    selected = null;
    feedback = null;
    save();
    render();
  }
  container.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.set) {
      if (set === target.dataset.set) return;
      set = target.dataset.set; placements = Array(4).fill(null); flips = Array(5).fill(false); selected = null; feedback = null;
    } else if (target.hasAttribute('data-side')) {
      const side = Number(target.dataset.side);
      if (selected !== null) { place(selected, side); return; }
      selected = placements[side];
      feedback = null;
    } else if (target.hasAttribute('data-tile')) { selected = selected === Number(target.dataset.tile) ? null : Number(target.dataset.tile); feedback = null; }
    else if (target.dataset.action === 'flip' && selected !== null) { flips[selected] = !flips[selected]; feedback = null; }
    else if (target.dataset.action === 'return' && selected !== null) { placements = placements.map((tile) => tile === selected ? null : tile); feedback = null; }
    else if (target.dataset.action === 'reset') { placements = Array(4).fill(null); flips = Array(5).fill(false); selected = null; feedback = null; }
    else if (target.dataset.action === 'check') feedback = evaluateDominoes(set, placements, flips);
    else return;
    save(); rerenderPreservingFocus(container, render);
  }, { signal });
  container.addEventListener('keydown', (event) => {
    const target = event.target.closest('[data-tile]');
    if (!target || !['f', 'F', 'Delete', 'Backspace'].includes(event.key)) return;
    event.preventDefault();
    const tile = Number(target.dataset.tile);
    if (event.key.toLowerCase() === 'f') flips[tile] = !flips[tile];
    else placements = placements.map((current) => current === tile ? null : current);
    selected = tile; feedback = null; save(); rerenderPreservingFocus(container, render);
  }, { signal });
  container.addEventListener('dragstart', (event) => {
    const target = event.target.closest('[data-tile]');
    if (!target) return;
    event.dataTransfer.setData('text/plain', `domino:${target.dataset.tile}`);
    event.dataTransfer.effectAllowed = 'move';
  }, { signal });
  container.addEventListener('dragover', (event) => { if (event.target.closest('[data-side]')) event.preventDefault(); }, { signal });
  container.addEventListener('drop', (event) => {
    const target = event.target.closest('[data-side]');
    if (!target) return;
    event.preventDefault();
    const match = /^domino:([0-4])$/.exec(event.dataTransfer.getData('text/plain'));
    if (match) place(Number(match[1]), Number(target.dataset.side));
  }, { signal });
  render();
}

function svgElement(tag, attributes = {}, text = '') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  node.textContent = text;
  return node;
}

function coordinateGraph(values, pairing) {
  const graph = svgElement('svg', { viewBox: '0 0 420 420', class: 'mp-coordinate-graph', role: 'img', 'aria-label': 'Coordinate graph from zero to ten on each axis. Enter coordinates to plot points and lines.' });
  const px = (x) => 42 + x * 34, py = (y) => 378 - y * 34;
  const defs = svgElement('defs'), clip = svgElement('clipPath', { id: 'mp-coordinate-clip' });
  clip.append(svgElement('rect', { x: 42, y: 38, width: 340, height: 340 })); defs.append(clip); graph.append(defs);
  for (let i = 0; i <= 10; i++) {
    graph.append(svgElement('line', { x1: px(i), x2: px(i), y1: py(0), y2: py(10), class: i === 0 ? 'mp-axis' : 'mp-grid-line' }), svgElement('line', { x1: px(0), x2: px(10), y1: py(i), y2: py(i), class: i === 0 ? 'mp-axis' : 'mp-grid-line' }), svgElement('text', { x: px(i), y: 397, 'text-anchor': 'middle' }, String(i)), svgElement('text', { x: 29, y: py(i) + 4, 'text-anchor': 'end' }, String(i)));
  }
  graph.append(svgElement('text', { x: 402, y: 383 }, 'x'), svgElement('text', { x: 38, y: 20 }, 'y'));
  const points = Array.from({ length: 4 }, (_, index) => values.slice(2 * index, 2 * index + 2));
  COORDINATE_PAIRINGS[pairing].pairs.forEach(([a, b], lineIndex) => {
    if ([...points[a], ...points[b]].some((value) => value === null)) return;
    const [dx, dy] = subtract(points[b], points[a]);
    graph.append(svgElement('line', { x1: px(points[a][0] - dx * 20), y1: py(points[a][1] - dy * 20), x2: px(points[a][0] + dx * 20), y2: py(points[a][1] + dy * 20), class: `mp-plotted-line mp-line-${lineIndex}`, 'clip-path': 'url(#mp-coordinate-clip)' }));
  });
  points.forEach((point, index) => {
    if (point.some((value) => value === null)) return;
    graph.append(svgElement('circle', { cx: px(point[0]), cy: py(point[1]), r: 5.5, class: 'mp-point' }), svgElement('text', { x: px(point[0]) + 9, y: py(point[1]) - 9, class: 'mp-point-label' }, 'ABCD'[index]));
  });
  return graph;
}

function mountCoordinates(container, question, signal) {
  const saved = readSaved(question.id);
  let values = Array.from({ length: 8 }, (_, index) => Number.isInteger(saved?.values?.[index]) && saved.values[index] >= 0 && saved.values[index] <= 9 ? saved.values[index] : null);
  let mode = ['parallel', 'perpendicular', 'both'].includes(saved?.mode) ? saved.mode : 'parallel';
  let pairing = [0, 1, 2].includes(saved?.pairing) ? saved.pairing : 0, selectedDigit = null, feedback = null;
  const save = () => persist(question.id, { values, mode, pairing });
  function render() {
    const bank = element('div', { class: 'mp-digit-bank', role: 'group', 'aria-label': 'Digits zero to nine' }, Array.from({ length: 10 }, (_, digit) => button(String(digit), { class: `mp-digit ${selectedDigit === digit ? 'mp-selected' : ''}`, 'data-digit': digit, 'data-focus': `digit-${digit}`, disabled: values.includes(digit), draggable: !values.includes(digit), 'aria-label': `Digit ${digit}${values.includes(digit) ? ', used' : ''}`, 'aria-pressed': selectedDigit === digit })));
    const coordinates = element('div', { class: 'mp-coordinate-inputs' }, Array.from({ length: 4 }, (_, point) => element('div', { class: 'mp-coordinate-pair' }, [element('strong', { text: `${'ABCD'[point]} = (` }), ...[0, 1].flatMap((axis) => {
      const slot = point * 2 + axis;
      const input = element('input', { class: 'mp-coordinate-slot', 'data-slot': slot, 'data-focus': `slot-${slot}`, type: 'text', inputmode: 'numeric', maxlength: '1', autocomplete: 'off', pattern: '[0-9]', value: values[slot] === null ? '' : values[slot], 'aria-label': `Point ${'ABCD'[point]} ${axis ? 'y' : 'x'} coordinate`, placeholder: '·' });
      return axis === 0 ? [input, element('span', { text: ',' })] : [input];
    }), element('strong', { text: ')' })])));
    const modes = element('div', { class: 'mp-mode-options', role: 'group', 'aria-label': 'Challenge goal' }, [['parallel', 'Parallel'], ['perpendicular', 'Perpendicular'], ['both', 'Both with the same points']].map(([id, label]) => button(label, { 'data-mode': id, 'aria-pressed': mode === id })));
    const pairingButtons = element('div', { class: 'mp-mode-options', role: 'group', 'aria-label': 'Pairing of points' }, COORDINATE_PAIRINGS.map(({ label }, index) => button(label, { 'data-pairing': index, 'aria-pressed': pairing === index })));
    const directions = COORDINATE_PAIRINGS[pairing].pairs.map(([a, b]) => {
      const numbers = [values[2 * a], values[2 * a + 1], values[2 * b], values[2 * b + 1]];
      return paragraph(numbers.some((value) => value === null) ? `${'ABCD'[a]}${'ABCD'[b]}: enter both points` : `${'ABCD'[a]}${'ABCD'[b]}: across ${numbers[2] - numbers[0]}, up ${numbers[3] - numbers[1]}`, 'mp-direction');
    });
    container.replaceChildren(element('section', { class: 'mp-workspace' }, [paragraph(question.prompt, 'mp-prompt'), modes, paragraph('Type a digit into a coordinate space, or select a digit and then a space. Use Backspace or Delete to clear a space. Each digit may be used once.'), bank, coordinates, paragraph(selectedDigit === null ? 'Choose how to connect your four points.' : `Digit ${selectedDigit} selected. Choose a coordinate space.`, 'mp-selection'), pairingButtons, element('div', { class: 'mp-graph-layout' }, [coordinateGraph(values, pairing), element('div', { class: 'mp-graph-notes' }, [paragraph(mode === 'both' ? 'Keep all four points fixed. Find one pairing that is parallel and another that is perpendicular.' : `Make the two lines ${mode}.`), ...directions, paragraph('Lines extend through the paired points. Different colours show the two lines; point letters identify their endpoints.')])]), element('div', { class: 'mp-actions' }, [button('Check lines', { 'data-action': 'check' }), button('Reset coordinates', { 'data-action': 'reset', class: 'mp-secondary' })]), feedbackNode(feedback)]));
  }
  function putDigit(slot, digit) {
    if (digit !== null && values.some((value, index) => index !== slot && value === digit)) {
      feedback = { status: 'incomplete', message: `Digit ${digit} is already used. Clear its current space before moving it.` };
    } else { values[slot] = digit; feedback = null; selectedDigit = null; save(); }
    rerenderPreservingFocus(container, render);
  }
  container.addEventListener('input', (event) => {
    if (!event.target.hasAttribute('data-slot')) return;
    const typed = event.target.value;
    if (typed === '' || /^[0-9]$/.test(typed)) putDigit(Number(event.target.dataset.slot), typed === '' ? null : Number(typed));
    else { feedback = { status: 'incomplete', message: 'Enter one digit from 0 to 9.' }; rerenderPreservingFocus(container, render); }
  }, { signal });
  container.addEventListener('click', (event) => {
    const target = event.target.closest('button, [data-slot]');
    if (!target) return;
    if (target.hasAttribute('data-slot')) { if (selectedDigit !== null) putDigit(Number(target.dataset.slot), selectedDigit); return; }
    if (target.hasAttribute('data-digit')) { selectedDigit = selectedDigit === Number(target.dataset.digit) ? null : Number(target.dataset.digit); feedback = null; }
    else if (target.dataset.mode) { mode = target.dataset.mode; feedback = null; }
    else if (target.hasAttribute('data-pairing')) { pairing = Number(target.dataset.pairing); feedback = null; }
    else if (target.dataset.action === 'check') feedback = evaluateCoordinates(values, mode, pairing);
    else if (target.dataset.action === 'reset') { values = Array(8).fill(null); selectedDigit = null; feedback = null; }
    else return;
    save(); rerenderPreservingFocus(container, render);
  }, { signal });
  container.addEventListener('focusin', (event) => { if (event.target.hasAttribute('data-slot')) event.target.select(); }, { signal });
  container.addEventListener('dragstart', (event) => {
    const target = event.target.closest('[data-digit]');
    if (target) { event.dataTransfer.setData('text/plain', `digit:${target.dataset.digit}`); event.dataTransfer.effectAllowed = 'copy'; }
  }, { signal });
  container.addEventListener('dragover', (event) => { if (event.target.hasAttribute('data-slot')) event.preventDefault(); }, { signal });
  container.addEventListener('drop', (event) => {
    if (!event.target.hasAttribute('data-slot')) return;
    event.preventDefault();
    const match = /^digit:([0-9])$/.exec(event.dataTransfer.getData('text/plain'));
    if (match) putDigit(Number(event.target.dataset.slot), Number(match[1]));
  }, { signal });
  render();
}

export function mountManipulative(container, question) {
  const definition = typeof question === 'string' ? manipulativeQuestions.find(({ id }) => id === question) : question;
  if (!definition) throw new Error('Unknown manipulative question.');
  const controller = new AbortController();
  if (definition.id === '13-ladybugs') mountLadybugs(container, definition, controller.signal);
  else if (definition.id === '495') mountCoordinates(container, definition, controller.signal);
  else if (['20', '21', '20-21-boards'].includes(definition.id)) mountDominoes(container, definition, controller.signal);
  else throw new Error(`Unknown manipulative question: ${definition.id}`);
  return () => controller.abort();
}
