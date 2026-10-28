export type ManagedAnimation = {
  finished: Promise<unknown>
  finish(): void
  cancel(): void
}

export class CardTransition {
  cancelled = false
  private skipped = false
  private animations = new Set<ManagedAnimation>()

  // The factory also lets us skip animation phases that have not started yet.
  async play<T extends ManagedAnimation>(create: () => T): Promise<T | null> {
    if (this.cancelled || this.skipped) return null
    const animation = create()
    this.animations.add(animation)
    try { await animation.finished } catch { /* Cancellation settles the current phase. */ }
    return animation
  }

  finish() {
    this.skipped = true
    for (const animation of this.animations) {
      try { animation.finish() } catch { animation.cancel() }
    }
  }

  cancel() {
    this.cancelled = true
    this.cleanup()
  }

  cleanup() {
    for (const animation of this.animations) animation.cancel()
    this.animations.clear()
  }
}

export function createTransitionQueue<Action>(
  perform: (action: Action, transition: CardTransition) => Promise<void>,
  onBusy: (busy: boolean) => void,
  onError: (error: unknown) => void,
) {
  let pending: Action[] = []
  let active: CardTransition | null = null
  let draining = false
  let idleWaiters: Array<() => void> = []

  async function drain() {
    if (draining) return
    draining = true
    onBusy(true)
    try {
      while (pending.length) {
        const action = pending.shift()!
        const transition = new CardTransition()
        active = transition
        // Process accumulated presses immediately; animate only the latest move.
        if (pending.length) transition.finish()
        try { await perform(action, transition) }
        catch (error) { onError(error) }
        finally { transition.cleanup() }
      }
    } finally {
      active = null
      draining = false
      onBusy(false)
      const waiters = idleWaiters
      idleWaiters = []
      waiters.forEach(resolve => resolve())
    }
  }

  return {
    enqueue(action: Action) {
      active?.finish()
      pending.push(action)
      void drain()
    },
    cancel() {
      pending = []
      active?.cancel()
    },
    whenIdle(): Promise<void> {
      return draining ? new Promise(resolve => idleWaiters.push(resolve)) : Promise.resolve()
    },
  }
}
