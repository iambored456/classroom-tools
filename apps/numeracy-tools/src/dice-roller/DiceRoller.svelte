<script module lang="ts">
  import type { Pool, Roll } from './roll'

  // Keep this tab's session when a teacher visits the catalogue and comes back.
  let draft = $state.raw<Pool>({})
  let current = $state.raw<Roll | null>(null)
  let previous = $state.raw<Pool | null>(null)
  let history = $state.raw<readonly Roll[]>([])
  let sound = $state(false), motionOverride = $state<boolean | null>(null)
  let sequence = 0
</script>

<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import Icon from '../fraction-studio/Icon.svelte'
  import { setAppFullscreen } from '../fullscreen'
  import { getMotionState } from '../../../../packages/motion-preference/index'
  import DiceTray from './DiceTray.svelte'
  import DieIcon from './DieIcon.svelte'
  import { descriptions, expression, groupOrder, makeRoll, percentile, pickerOrder,
    poolLimit, poolSize, type Sides } from './roll'
  import { throwDuration } from './tray'
  import './roller.css'

  let count = $derived(poolSize(draft))
  let pending = $state.raw<Roll | null>(null)
  let lastActivation = -Infinity
  let timeout: ReturnType<typeof setTimeout> | undefined
  let announcement = $state('')
  const motion = getMotionState()
  let animate = $derived(motionOverride ?? (!motion.systemReducedMotion && !motion.reducedMotion))
  let projecting = $state(false), wasFullscreen = false
  let root: HTMLElement, trayHeading: HTMLHeadingElement
  let againButton = $state<HTMLButtonElement>()
  let audio: AudioContext | undefined
  let focusOnSettle = false
  const clock = new Intl.DateTimeFormat(undefined, {hour:'numeric', minute:'2-digit', second:'2-digit'})

  function edit(sides: Sides, amount: number) {
    if (pending || (amount > 0 && count >= poolLimit)) return
    draft = { ...draft, [sides]: Math.max(0,(draft[sides] ?? 0)+amount) }
  }

  function enableAudio() {
    if (!sound) return
    try {
      audio ??= new AudioContext()
      if (audio.state === 'suspended') void audio.resume().catch(() => {})
    } catch { /* The visual roll works independently of audio support. */ }
  }

  function clatter() {
    if (!sound || audio?.state !== 'running') return
    const ctx = audio
    for (const [i, pitch] of [410, 305, 485].entries()) {
      const t = ctx.currentTime + i*.044
      const tone = ctx.createOscillator(), gain = ctx.createGain()
      tone.type = 'triangle'
      tone.frequency.setValueAtTime(pitch, t)
      tone.frequency.exponentialRampToValueAtTime(pitch*.42, t+.043)
      gain.gain.setValueAtTime(.075/(i+1), t)
      gain.gain.exponentialRampToValueAtTime(.0001, t+.05)
      tone.connect(gain).connect(ctx.destination)
      tone.onended = () => { tone.disconnect(); gain.disconnect() }
      tone.start(t); tone.stop(t+.055)
    }
  }

  function settle(id: number, interactive = true) {
    if (!pending || pending.id !== id) return
    clearTimeout(timeout)
    const roll = pending
    pending = null
    current = roll
    history = [roll, ...history].slice(0,50)
    announcement = 'Roll ' + id + '. Total ' + roll.total + '.'
    if (!interactive) return
    if (!document.hidden) clatter()
    if (focusOnSettle) {
      focusOnSettle = false
      void tick().then(() => againButton?.focus({preventScroll: true}))
    }
  }

  function roll(pool: Pool | null, event: MouseEvent) {
    if (!pool || !poolSize(pool) || pending || event.detail > 1 || performance.now()-lastActivation < 300) return
    lastActivation = performance.now()
    const record = makeRoll(pool, ++sequence)
    focusOnSettle = event.detail === 0
    enableAudio()
    previous = record.pool
    draft = {}
    pending = record
    if (!animate || document.hidden) settle(record.id)
    else timeout = setTimeout(() => settle(record.id), throwDuration + 180)
    if (trayHeading.getBoundingClientRect().bottom < 0) trayHeading.scrollIntoView({block:'start', behavior:'instant'})
  }

  function toggleMotion() {
    motionOverride = !animate
    if (!motionOverride && pending) settle(pending.id)
  }

  async function project() {
    projecting = !projecting
    try { await setAppFullscreen(root, projecting) } catch { /* Keep the projection layout in the tab. */ }
  }
  function fullscreenChanged() {
    if (wasFullscreen && !document.fullscreenElement) projecting = false
    wasFullscreen = !!document.fullscreenElement
  }
  onDestroy(() => {
    if (pending) settle(pending.id, false)
    clearTimeout(timeout)
    if (wasFullscreen) void setAppFullscreen(root, false).catch(() => {})
    if (audio) void audio.close().catch(() => {})
  })
</script>

<svelte:document onfullscreenchange={fullscreenChanged}
  onvisibilitychange={() => { if (document.hidden && pending) settle(pending.id) }} />

<main class="dice-roller" class:projecting bind:this={root}>
  <div class="roller-title">
    <h1>Dice Roller</h1>
    <button class="project-button" aria-pressed={projecting} onclick={project}>
      <Icon name="expand" />{projecting ? 'Exit projection' : 'Project'}
    </button>
  </div>
  <div class="roller-workspace">
    <section class="tray-panel" aria-labelledby="tray-heading">
      <div class="panel-heading">
        <h2 id="tray-heading" bind:this={trayHeading}>Rolling tray</h2>
        <button class="quiet" disabled={!current || !!pending} onclick={() => { current = null }}>Clear tray</button>
      </div>
      <DiceTray record={pending ?? current} moving={!!pending} {settle} />
      <div class="readout" aria-label="Roll result">
        <div class="total-block"><span>Total</span><strong>{pending || !current ? '—' : current.total}</strong></div>
        <div class="arithmetic">
          {#if pending}<b>Rolling…</b><span>{expression(pending.pool)}</span>
          {:else if current}<b>{current.outcomes.map(die => die.value).join(' + ')}</b><span>{expression(current.pool)}</span>
          {:else}<span>Individual values appear here.</span>{/if}
        </div>
        {#if previous && !count}
          <button class="repeat" bind:this={againButton} disabled={!!pending} onclick={event => roll(previous, event)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg>Roll again
          </button>
        {/if}
      </div>
    </section>
    <section class="pool-panel" aria-labelledby="pool-heading">
      <div class="panel-heading"><h2 id="pool-heading">Dice pool</h2><span class="pool-count" aria-label={count + ' of 30 dice'}>{count} / {poolLimit}</span></div>
      <div class="die-picker">
        {#each pickerOrder as sides}
          <div class="die-tile" class:selected={draft[sides]}>
            <button class="add-die" aria-label={'Add ' + descriptions[sides] + ' die'} disabled={!!pending || count >= poolLimit}
              onclick={() => edit(sides, 1)} oncontextmenu={event => {event.preventDefault(); edit(sides,-1)}}>
              <DieIcon {sides}/><span>d{sides}</span>
              {#if draft[sides]}<b class="badge" aria-label={'Quantity ' + draft[sides]}>×{draft[sides]}</b>{/if}
            </button>
            {#if draft[sides]}
              <button class="subtract" disabled={!!pending} aria-label={'Remove one ' + descriptions[sides] + ' die'} onclick={() => edit(sides,-1)}>−</button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="pool-footer">
        <p class="draft-expression" aria-label="Selected dice">{count ? expression(draft) : 'No dice selected'}</p>
        {#if count === poolLimit}<p class="limit-note">30-die limit reached. Remove a die to add another.</p>{/if}
        <div class="roll-actions">
          <button class="roll" disabled={!count || !!pending} onclick={event => roll(draft, event)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 8.5h.1m3.4 3.5h.1m3.4 3.5h.1" stroke-width="2.8"/></svg>Roll
          </button>
          <button class="reset" disabled={!count || !!pending} onclick={() => draft = {}}>Reset selection</button>
        </div>
      </div>
      <div class="preferences">
        <button aria-label="Roll sound" aria-pressed={sound} onclick={() => { sound = !sound; enableAudio() }}>
          <i class="switch" aria-hidden="true"></i>Sound <span>{sound ? 'on' : 'off'}</span>
        </button>
        <button aria-label="Roll animation" aria-pressed={animate} onclick={toggleMotion}>
          <i class="switch" aria-hidden="true"></i>Motion <span>{animate ? 'on' : 'off'}</span>
        </button>
      </div>
    </section>
    <details class="roll-history">
      <summary><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>Roll history <span>{history.length}</span><i></i></summary>
      {#if !history.length}<p>Your completed rolls will appear here.</p>{/if}
      {#each history as entry (entry.id)}
        <details class="history-entry">
          <summary>
            <time datetime={new Date(entry.timestamp).toISOString()}>{clock.format(entry.timestamp)}</time>
            <b>{expression(entry.pool)}</b><strong>{entry.total}</strong><i></i>
          </summary>
          <div class="history-values">
            {#each groupOrder.filter(s => entry.pool[s]) as sides}
              <div><b>d{sides}</b>
                <span>{#each entry.outcomes.filter(die => die.sides === sides) as die, index}
                  {#if index > 0} + {/if}{die.value}{#if sides === 100}
                    <small>({percentile(die.value).tens}0 / {percentile(die.value).units})</small>{/if}{/each}</span>
              </div>
            {/each}
          </div>
        </details>
      {/each}
    </details>
  </div>
  <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
</main>
