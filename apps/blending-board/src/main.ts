/// <reference types="vite/client" />
import './style.css'
import { qrShare } from '@classroom-tools/qr-share'
import lessons from './lessons.json'
import { allBanks, basicBanks, blend, copyBanks, emptySelection, isBanks, isSelection, labels, parseBank, toggleTile, type Banks, type Selection } from './model'

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const sidebar = byId<HTMLElement>('sidebar')
const toggle = byId<HTMLButtonElement>('sidebar-toggle')
const highlightToggle = byId<HTMLInputElement>('highlight-segments')
const word = byId('word')
qrShare(byId<HTMLButtonElement>('share-blending-board'), { app: 'blending-board', title: 'Blending Board' })

if (import.meta.env.DEV && location.port === '5197') {
  const hubUrl = new URL('/', location.href)
  hubUrl.port = '5173'
  byId<HTMLAnchorElement>('home-link').href = hubUrl.href
}
const lessonDialog = byId<HTMLDialogElement>('ufli-dialog')
const tilesDialog = byId<HTMLDialogElement>('tiles-dialog')
const storageKey = 'blendingBoard:v1'
let banks = copyBanks(basicBanks)
let selected = emptySelection()
let history: Selection[] = []
let lessonId: string | null = null
let draft = copyBanks(banks)
const fields = ['edit-initial', 'edit-middle', 'edit-final', 'edit-ending']
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
  highlightToggle.checked = saved?.highlightSegments === true
  if (saved && isBanks(saved.banks)) {
    banks = saved.banks
    if (isSelection(saved.selected, banks)) selected = saved.selected
    if (Array.isArray(saved.history)) history = saved.history.filter((item: unknown) => isSelection(item, banks)).slice(0, 3)
    if (lessons.some(lesson => lesson.id === saved.lessonId && lesson.banks.some(bank => bank.length))) lessonId = saved.lessonId
  }
} catch { /* A blocked or outdated browser store should not prevent using the board. */ }

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ banks, selected, history, lessonId, highlightSegments: highlightToggle.checked })) } catch { /* The current board remains usable without persistence. */ }
}
function setSidebar(open: boolean) {
  sidebar.classList.toggle('open', open)
  sidebar.inert = !open
  toggle.setAttribute('aria-expanded', String(open))
  if (open) byId('sidebar-close').focus()
  else toggle.focus()
}
function choose(selection: Selection) {
  if (blend(selected) && blend(selected) !== blend(selection)) history = [selected, ...history.filter(item => blend(item) !== blend(selected))].slice(0, 3)
  selected = selection
  updateWord()
  save()
}
function updateWord() {
  word.replaceChildren()
  selected.forEach((tile, index) => {
    if (!tile) return
    const span = document.createElement('span')
    span.textContent = tile
    span.className = `bank-${index}`
    word.append(span)
  })
  word.setAttribute('aria-label', blend(selected) || 'No word selected')
  byId('empty-hint').hidden = Boolean(blend(selected))
  byId<HTMLButtonElement>('clear-word').disabled = !blend(selected)
  document.querySelectorAll<HTMLButtonElement>('#banks button').forEach(button => {
    button.setAttribute('aria-pressed', String(selected[Number(button.dataset.bank)] === button.dataset.tile))
  })
  const list = byId('history-list')
  list.replaceChildren()
  history.forEach(item => {
    const button = document.createElement('button')
    button.textContent = blend(item)
    button.setAttribute('aria-label', `Recall ${blend(item)}`)
    button.addEventListener('click', () => choose([...item] as Selection))
    list.append(button)
  })
  byId('history').hidden = history.length === 0
}
function renderBoard() {
  const container = byId('banks')
  container.replaceChildren()
  banks.forEach((bank, index) => {
    const group = document.createElement('section')
    group.className = `bank bank-${index}`
    group.setAttribute('aria-label', `${labels[index]} segments`)
    const heading = document.createElement('h2')
    heading.textContent = labels[index]
    const tiles = document.createElement('div')
    tiles.className = 'tiles'
    bank.forEach(tile => {
      const button = document.createElement('button')
      button.className = 'tile'
      button.dataset.bank = String(index)
      button.dataset.tile = tile
      setTileLabel(button, tile)
      button.setAttribute('aria-label', `${labels[index]}: ${tile}`)
      button.addEventListener('click', () => choose(toggleTile(selected, index, tile)))
      tiles.append(button)
    })
    group.append(heading, tiles)
    container.append(group)
    byId<HTMLTextAreaElement>(fields[index]).value = bank.join(', ')
  })
  const lesson = lessons.find(item => item.id === lessonId)
  byId('lesson-label').textContent = lesson ? `UFLI Lesson ${lesson.id}` : 'Custom board'
  byId('lesson-details').textContent = lesson ? `Lesson ${lesson.id} · ${banks.reduce((count, bank) => count + bank.length, 0)} segments` : 'Choose a lesson to load its segment banks.'
  byId('chain-section').hidden = !lesson
  byId('chain').textContent = lesson?.chain.join(' → ') ?? ''
  document.querySelectorAll<HTMLButtonElement>('#ufli-grid button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lesson === lessonId)))
  updateWord()
}
function loadBanks(next: Banks, id: string | null = null) {
  banks = copyBanks(next)
  selected = emptySelection()
  history = []
  lessonId = id
  renderBoard()
  save()
}
lessons.forEach(lesson => {
  const button = document.createElement('button')
  const available = lesson.banks.some(bank => bank.length > 0)
  button.textContent = lesson.id
  button.dataset.lesson = lesson.id
  button.disabled = !available
  button.setAttribute('aria-label', available ? `Lesson ${lesson.id}` : `Lesson ${lesson.id}: no blending drill`)
  button.title = available ? `Load lesson ${lesson.id}` : 'No blending drill'
  button.addEventListener('click', () => {
    loadBanks(lesson.banks as Banks, lesson.id)
    lessonDialog.close()
    setSidebar(false)
  })
  byId('ufli-grid').append(button)
})

function setTileLabel(button: HTMLButtonElement, tile: string) {
  button.textContent = tile
  button.style.setProperty('--tile-characters', String(Math.max(1, Array.from(tile).length)))
}

function updateHighlight() {
  word.classList.toggle('highlight-segments', highlightToggle.checked)
}

function openTiles() {
  draft = copyBanks(banks)
  const picker = byId('tile-picker')
  picker.replaceChildren()
  allBanks.forEach((catalog, index) => {
    const group = document.createElement('section')
    group.className = `picker-group bank-${index}`
    const heading = document.createElement('h3')
    heading.textContent = labels[index]
    const options = [...new Set([...catalog, ...banks[index]])]
    const tiles = document.createElement('div')
    tiles.className = 'picker-tiles'
    const refresh = () => tiles.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.setAttribute('aria-pressed', String(draft[index].includes(button.textContent!))))
    const actions = document.createElement('div')
    actions.className = 'picker-actions'
    for (const action of ['All', 'None']) {
      const button = document.createElement('button')
      button.textContent = action
      button.setAttribute('aria-label', `${action} ${labels[index]} tiles`)
      button.addEventListener('click', () => { draft[index] = action === 'All' ? [...options] : []; refresh() })
      actions.append(button)
    }
    options.forEach(tile => {
      const button = document.createElement('button')
      setTileLabel(button, tile)
      button.className = 'tile'
      button.setAttribute('aria-label', `${labels[index]} tile ${tile}`)
      button.addEventListener('click', () => {
        draft[index] = draft[index].includes(tile) ? draft[index].filter(value => value !== tile) : [...draft[index], tile]
        refresh()
      })
      tiles.append(button)
    })
    group.append(heading, actions, tiles)
    picker.append(group)
    refresh()
  })
  tilesDialog.showModal()
}
toggle.addEventListener('click', () => setSidebar(!sidebar.classList.contains('open')))
byId('sidebar-close').addEventListener('click', () => setSidebar(false))
highlightToggle.addEventListener('change', () => {
  updateHighlight()
  save()
})
byId('ufli-open').addEventListener('click', () => lessonDialog.showModal())
byId('ufli-close').addEventListener('click', () => lessonDialog.close())
byId('clear-word').addEventListener('click', () => choose(emptySelection()))
byId('choose-tiles').addEventListener('click', openTiles)
byId('customize').addEventListener('click', openTiles)
byId('tiles-close').addEventListener('click', () => tilesDialog.close())
byId('tiles-cancel').addEventListener('click', () => tilesDialog.close())
byId('tiles-apply').addEventListener('click', () => { loadBanks(draft); tilesDialog.close(); setSidebar(false) })
byId('basic-board').addEventListener('click', () => { loadBanks(basicBanks); setSidebar(false) })
byId('segments-form').addEventListener('submit', event => {
  event.preventDefault()
  const next = fields.map(id => parseBank(byId<HTMLTextAreaElement>(id).value))
  if (!isBanks(next)) { showStatus('Use up to 100 tiles per bank and up to 24 characters per tile.'); return }
  loadBanks(next)
  showStatus('Segments applied.')
  setSidebar(false)
})
function showStatus(message: string) {
  byId('status').textContent = message
  byId('status').hidden = false
}
byId('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch { showStatus('Fullscreen is unavailable in this browser.') }
})
document.addEventListener('fullscreenchange', () => { byId('fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen' })
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !lessonDialog.open && !tilesDialog.open && sidebar.classList.contains('open')) setSidebar(false)
})
document.addEventListener('pointerdown', event => {
  if (sidebar.classList.contains('open') && !lessonDialog.open && !tilesDialog.open && event.target instanceof Node && !sidebar.contains(event.target) && !toggle.contains(event.target)) setSidebar(false)
})
for (const dialog of [lessonDialog, tilesDialog]) dialog.addEventListener('click', event => {
  if (event.target !== dialog) return
  const box = dialog.getBoundingClientRect()
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close()
})
updateHighlight()
renderBoard()
