export const RECONNECT_MS = 300
export const RECONNECT_RADIUS = 48

// Puzzle data is owned by the adapter and is changed only by commit().
export function createDragSession({enabled = () => false, resolveTarget, commit,
  started = () => {}, moved = () => {}, paused = () => {}, cleared = () => {},
  now = () => performance.now(), schedule = setTimeout, unschedule = clearTimeout}) {
  let gesture = null, timer = null, generation = 0
  function stopTimer() { generation++; if (timer !== null) unschedule(timer); timer = null }
  function clear() {
    const previous = gesture
    gesture = null
    stopTimer()
    if (previous) cleared(previous)
    return previous
  }
  function settle() {
    const previous = clear()
    if (previous?.phase === 'awaiting-reconnect' && previous.reason === 'up' && previous.target) {
      commit(previous.source, previous.target)
    }
  }
  return {
    get gesture() { return gesture },
    begin(source, event) {
      if (gesture) return false
      gesture = {source, id: event.pointerId, pointerType: event.pointerType,
        startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
        phase: 'pressed'}
      return true
    },
    resume(event) {
      if (gesture?.phase !== 'awaiting-reconnect' || now() >= gesture.deadline ||
          event.pointerType !== gesture.pointerType || event.isPrimary === false ||
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > RECONNECT_RADIUS) return false
      stopTimer()
      gesture.id = event.pointerId
      gesture.phase = 'dragging'
      gesture.x = event.clientX; gesture.y = event.clientY
      moved(gesture)
      return true
    },
    move(event) {
      if (!gesture || gesture.id !== event.pointerId) return false
      if (gesture.phase === 'awaiting-reconnect') {
        // Unexpected capture loss can occur without lifting the original contact.
        if (gesture.reason !== 'lost' || !(event.buttons & 1) || now() >= gesture.deadline) return false
        stopTimer(); gesture.phase = 'dragging'
      }
      gesture.x = event.clientX; gesture.y = event.clientY
      if (gesture.phase === 'pressed') {
        if (Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) <= 6) return false
        gesture.phase = 'dragging'
        started(gesture)
      }
      moved(gesture)
      return true
    },
    end(event, reason = 'up') {
      if (!gesture || gesture.id !== event.pointerId || gesture.phase === 'awaiting-reconnect') return false
      if (gesture.phase === 'pressed') { clear(); return false }
      if (reason === 'up') { gesture.x = event.clientX; gesture.y = event.clientY }
      gesture.phase = 'awaiting-reconnect'
      gesture.reason = reason
      gesture.target = reason === 'up' ? resolveTarget(gesture.x, gesture.y, gesture.source) : null
      gesture.deadline = now() + RECONNECT_MS
      if (!enabled()) { settle(); return true }
      paused(gesture)
      const waiting = gesture, ticket = ++generation
      timer = schedule(() => {
        if (generation === ticket && gesture === waiting && gesture.phase === 'awaiting-reconnect') settle()
      }, RECONNECT_MS)
      return true
    },
    settle,
    cancel: clear,
  }
}

// Kept at document scope: an immediate drop may replace the entire activity DOM
// before the browser dispatches the click belonging to that drag.
const clickGuards = new WeakMap()
const currentControllers = new WeakMap()
function clickGuard(doc) {
  if (clickGuards.has(doc)) return clickGuards.get(doc)
  const owned = new Map(), clock = () => doc.defaultView.performance.now()
  const prune = () => { for (const [id, record] of owned) if (record.until < clock()) owned.delete(id) }
  const guard = {
    mark(event, held = false) {
      prune()
      owned.set(event.pointerId, {x: event.clientX, y: event.clientY, until: held ? Infinity : clock() + 1200})
    },
    release(event) { if (owned.has(event.pointerId)) guard.mark(event) },
  }
  doc.addEventListener('pointerdown', event => { prune(); owned.delete(event.pointerId) }, true)
  doc.addEventListener('pointerup', guard.release, true)
  doc.addEventListener('pointercancel', guard.release, true)
  doc.addEventListener('click', event => {
    if (event.detail === 0 && (!event.pointerType || event.pointerId < 0)) return // Keyboard / assistive activation.
    prune()
    let match = event.pointerId === undefined ? null : owned.get(event.pointerId)
    if (event.pointerId === undefined) {
      match = [...owned.values()].find(record => Math.hypot(event.clientX - record.x, event.clientY - record.y) < 4)
    }
    if (match) { event.preventDefault(); event.stopImmediatePropagation() }
  }, true)
  clickGuards.set(doc, guard)
  return guard
}

export function mountDigitDrag(container, {sourceSelector, targetSelector, readSource,
  readTarget, commit, renderGhost, enabled = () => false}) {
  const doc = container.ownerDocument, win = doc.defaultView
  const scope = container.closest('.workspace') || container
  const guard = clickGuard(doc), contacts = new Set(), listeners = []
  let ghost = null, highlighted = null, captured = null, destroyed = false
  function listen(target, type, fn, capture = true) {
    target.addEventListener(type, fn, capture)
    listeners.push(() => target.removeEventListener(type, fn, capture))
  }
  function hit(x, y) { return doc.elementFromPoint(x, y) }
  function resolveTarget(x, y, source) {
    const element = hit(x, y)?.closest(targetSelector)
    return element && container.contains(element) ? readTarget(element, source, {clientX: x, clientY: y}) : null
  }
  function capture(event) {
    // Capture on the stable container, not a digit replaced during rendering.
    try { container.setPointerCapture(event.pointerId); captured = event.pointerId } catch {}
  }
  function releaseCapture() {
    const id = captured; captured = null
    try { if (id !== null && container.hasPointerCapture(id)) container.releasePointerCapture(id) } catch {}
  }
  function clearHighlight() { highlighted?.classList.remove('drop-target'); highlighted = null }
  function moveGhost(gesture) {
    scope.classList.remove('drag-reconnect-ready')
    ghost?.classList.remove('drag-paused')
    if (ghost) { ghost.style.left = gesture.x + 'px'; ghost.style.top = gesture.y + 'px' }
    clearHighlight()
    const target = resolveTarget(gesture.x, gesture.y, gesture.source)
    if (target) { highlighted = target.element; highlighted.classList.add('drop-target') }
  }
  const session = createDragSession({enabled, resolveTarget, commit,
    started(gesture) {
      const bounds = gesture.source.element.getBoundingClientRect(), style = win.getComputedStyle(gesture.source.element)
      ghost = doc.createElement('span')
      ghost.className = 'om-drag-ghost'
      ghost.textContent = String(gesture.source.digit)
      ghost.setAttribute('aria-hidden', 'true')
      Object.assign(ghost.style, {width: bounds.width + 'px', height: bounds.height + 'px', fontSize: style.fontSize, fontFamily: style.fontFamily})
      renderGhost?.(gesture.source, ghost)
      doc.body.append(ghost)
      guard.mark({pointerId: gesture.id, clientX: gesture.x, clientY: gesture.y}, true)
    },
    moved: moveGhost,
    paused() { ghost?.classList.add('drag-paused'); scope.classList.add('drag-reconnect-ready') },
    cleared(gesture) {
      guard.release({pointerId: gesture.id, clientX: gesture.x, clientY: gesture.y})
      ghost?.remove(); ghost = null; clearHighlight()
      scope.classList.remove('drag-reconnect-ready')
      releaseCapture()
    },
  })
  function down(event) {
    contacts.add(event.pointerId)
    const underlying = hit(event.clientX, event.clientY) || event.target
    if (session.gesture && session.gesture.phase !== 'awaiting-reconnect' && session.gesture.id !== event.pointerId) {
      guard.mark(event, true)
      if (scope.contains(underlying)) event.preventDefault()
      return
    }
    if (!scope.contains(underlying) || underlying.closest('dialog')) { session.cancel(); return }
    if (session.gesture && session.gesture.phase !== 'awaiting-reconnect') return
    if (contacts.size > 1 || event.isPrimary === false || event.button !== 0) return
    if (session.resume(event)) {
      guard.mark(event, true); capture(event); event.preventDefault(); return
    }
    if (session.gesture) session.settle()
    if (destroyed) { currentControllers.get(doc)?.down(event); return }
    // Settlement can replace the digit nodes. Read the current hit target.
    const element = hit(event.clientX, event.clientY)?.closest(sourceSelector)
    if (!element || !container.contains(element) || element.disabled) return
    const source = readSource(element)
    if (source) session.begin({...source, element}, event)
  }
  function move(event) {
    if (session.move(event)) {
      guard.mark(event, true)
      if (captured !== event.pointerId || !container.hasPointerCapture(event.pointerId)) capture(event)
      event.preventDefault()
    }
  }
  function end(event, reason) {
    contacts.delete(event.pointerId)
    session.end(event, reason)
  }
  listen(doc, 'pointerdown', down)
  listen(doc, 'pointermove', move)
  listen(doc, 'pointerup', event => end(event, 'up'))
  listen(doc, 'pointercancel', event => end(event, 'cancel'))
  listen(container, 'lostpointercapture', event => {
    if (event.target === container && captured === event.pointerId) session.end(event, 'lost')
  })
  listen(doc, 'keydown', () => session.cancel())
  listen(doc, 'input', () => session.cancel())
  listen(doc, 'change', () => session.cancel())
  listen(doc, 'click', () => session.cancel()) // Owned clicks were stopped by the guard.
  listen(container, 'dragstart', event => { if (event.target.closest(sourceSelector)) event.preventDefault() })
  listen(win, 'blur', event => {
    if (event.target === win) { contacts.clear(); session.cancel() }
  })
  listen(win, 'hashchange', () => session.cancel())
  listen(doc, 'visibilitychange', () => { if (doc.hidden) { contacts.clear(); session.cancel() } })
  // showModal() can also be called without a toolbar pointer/click.
  const observer = new win.MutationObserver(records => {
    if (records.some(record => record.target.matches?.('dialog[open]'))) session.cancel()
  })
  observer.observe(doc.body, {subtree: true, attributes: true, attributeFilter: ['open']})
  const controller = {
    down,
    cancel: () => session.cancel(),
    destroy() {
      destroyed = true; session.cancel(); observer.disconnect(); listeners.forEach(remove => remove()); contacts.clear()
      if (currentControllers.get(doc) === controller) currentControllers.delete(doc)
    },
  }
  currentControllers.set(doc, controller)
  return controller
}
