<script lang="ts">
  import { onMount } from 'svelte'
  import { hexToLaunchpadRgb } from '@classroom-tools/launchpad-midi'
  import {
    addTarget,
    chooseNextTarget,
    countTargets,
    createEmptyTargets,
    targetLimit,
    type HandMode,
    type TargetOwners,
    type TwisterMode,
    type TwisterPlayer,
  } from './lib/game.ts'
  import {
    connect,
    disposeMidi,
    getOutputLabel,
    hardwareReady,
    isMidiSupported,
    midiState,
    paintFrame,
    selectOutput,
    setPadEventCallback,
    type LaunchpadRgb,
  } from './lib/midi.svelte.ts'

  type Phase = 'idle' | 'countdown' | 'waiting' | 'holding' | 'max-hold' | 'won' | 'lost'

  const cells = Array.from({ length: 64 }, (_, index) => index)
  const off: LaunchpadRgb = [0, 0, 0]
  const modeKey = 'launchpad-finger-twister-mode'
  const handsKey = 'launchpad-finger-twister-hands'
  const playerOneColourKey = 'launchpad-finger-twister-player-one-colour'
  const playerTwoColourKey = 'launchpad-finger-twister-player-two-colour'

  let owners = $state<TargetOwners>(createEmptyTargets())
  let held = $state<boolean[]>(Array(64).fill(false))
  let mode = $state<TwisterMode>('local')
  let handMode = $state<HandMode>('one')
  let phase = $state<Phase>('idle')
  let countdown = $state(3)
  let nextPlayer = $state<TwisterPlayer>(1)
  let pendingIndex = $state<number | null>(null)
  let failedIndex = $state<number | null>(null)
  let loser = $state<TwisterPlayer | null>(null)
  let pendingBright = $state(true)
  let playerOneColour = $state<string>('#c7ff4f')
  let playerTwoColour = $state<string>('#a77bff')
  let colourWarning = $state('')
  let countdownTimeout: ReturnType<typeof setTimeout> | null = null
  let nextTargetTimeout: ReturnType<typeof setTimeout> | null = null
  let pulseInterval: ReturnType<typeof setInterval> | null = null
  let previewTimeout: ReturnType<typeof setTimeout> | null = null
  let challengeRequest = 0
  const pointerPads = new Map<number, number>()

  const limit = $derived(targetLimit(handMode))
  const assignedCounts = $derived(countTargets(owners))
  const heldCounts = $derived(countHeldPads(owners, held))
  const totalHeld = $derived(heldCounts.playerOne + heldCounts.playerTwo)
  const connected = $derived(hardwareReady())
  const winner = $derived<TwisterPlayer | null>(mode === 'local' && loser !== null ? (loser === 1 ? 2 : 1) : null)
  const active = $derived(phase === 'waiting' || phase === 'holding' || phase === 'max-hold')
  const phaseLabel = $derived(
    phase === 'idle' ? 'READY'
      : phase === 'countdown' ? `STARTING IN ${countdown}`
        : phase === 'waiting' ? `${playerLabel(owners[pendingIndex ?? 0] || 1).toUpperCase()}: PRESS THE NEW LIGHT`
          : phase === 'holding' ? 'KEEP HOLDING — NEXT LIGHT INCOMING'
            : phase === 'max-hold' ? 'ALL PADS SET — DO NOT MOVE'
              : phase === 'won' ? 'CHALLENGE CLEARED'
                : winner === null ? 'GRIP BROKEN' : `${playerLabel(winner).toUpperCase()} WINS`,
  )

  $effect(() => {
    const one = hexToLaunchpadRgb(playerOneColour)
    const two = hexToLaunchpadRgb(playerTwoColour)
    const frame = owners.map((owner, index): LaunchpadRgb => {
      if (failedIndex === index && phase === 'lost') return pendingBright ? [127, 0, 0] : off
      if (owner === 0) return off
      const colour = owner === 1 ? one : two
      if (index === pendingIndex && !pendingBright) return scaleColour(colour, 0.18)
      return colour
    })
    paintFrame(frame)
  })

  onMount(() => {
    restorePreferences()
    setPadEventCallback((event) => {
      if (event.pressed) pressPad(event.index)
      else releasePad(event.index)
    })

    return () => {
      cancelChallengeTimers()
      cancelPreview()
      setPadEventCallback(null)
      disposeMidi()
    }
  })

  function restorePreferences(): void {
    try {
      const savedMode = localStorage.getItem(modeKey)
      const savedHands = localStorage.getItem(handsKey)
      const savedPlayerOne = localStorage.getItem(playerOneColourKey)
      const savedPlayerTwo = localStorage.getItem(playerTwoColourKey)
      if (savedMode === 'local' || savedMode === 'solo') mode = savedMode
      if (savedHands === 'one' || savedHands === 'two') handMode = savedHands
      if (savedPlayerOne && usableColour(savedPlayerOne)) playerOneColour = savedPlayerOne
      if (savedPlayerTwo && usableColour(savedPlayerTwo) && !sameColour(playerOneColour, savedPlayerTwo)) playerTwoColour = savedPlayerTwo
    } catch {
      // Preferences are optional.
    }
  }

  function startChallenge(): void {
    cancelChallengeTimers()
    cancelPreview()
    owners = createEmptyTargets()
    held = Array(64).fill(false)
    pendingIndex = null
    failedIndex = null
    loser = null
    nextPlayer = 1
    phase = 'countdown'
    countdown = 3
    const request = ++challengeRequest

    const step = () => {
      if (request !== challengeRequest || phase !== 'countdown') return
      if (countdown > 1) {
        countdown -= 1
        countdownTimeout = setTimeout(step, 650)
      } else {
        phase = 'holding'
        nextTargetTimeout = setTimeout(addNextTarget, 350)
      }
    }
    countdownTimeout = setTimeout(step, 650)
  }

  function addNextTarget(): void {
    nextTargetTimeout = null
    if (phase !== 'holding') return
    const target = chooseNextTarget(owners, mode, nextPlayer, limit)
    if (!target) {
      if (mode === 'solo') {
        phase = 'won'
        stopPulse()
      } else {
        phase = 'max-hold'
      }
      return
    }
    owners = addTarget(owners, target)
    pendingIndex = target.index
    nextPlayer = target.nextPlayer
    phase = 'waiting'
    startPulse()
  }

  function pressPad(index: number): void {
    if (!active || index < 0 || index >= 64) return
    if (held[index] || index !== pendingIndex) return
    const nextHeld = [...held]
    nextHeld[index] = true
    held = nextHeld
    pendingIndex = null
    phase = 'holding'
    stopPulse()
    nextTargetTimeout = setTimeout(addNextTarget, 850)
  }

  function releasePad(index: number): void {
    if (!active || index < 0 || index >= 64 || !held[index]) return
    const releasedBy = owners[index]
    if (releasedBy === 0) return
    const nextHeld = [...held]
    nextHeld[index] = false
    held = nextHeld
    loser = releasedBy
    failedIndex = index
    pendingIndex = null
    phase = 'lost'
    cancelActiveTimers()
    startFailurePulse()
  }

  function handlePointerDown(index: number, event: PointerEvent): void {
    if (!active || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    const pad = event.currentTarget as HTMLButtonElement
    pad.setPointerCapture(event.pointerId)
    pointerPads.set(event.pointerId, index)
    pressPad(index)
  }

  function handlePointerRelease(event: PointerEvent): void {
    const index = pointerPads.get(event.pointerId)
    if (index === undefined) return
    pointerPads.delete(event.pointerId)
    releasePad(index)
  }

  function startPulse(): void {
    stopPulse()
    pendingBright = true
    pulseInterval = setInterval(() => { pendingBright = !pendingBright }, 430)
  }

  function startFailurePulse(): void {
    stopPulse()
    pendingBright = true
    let flashes = 0
    pulseInterval = setInterval(() => {
      pendingBright = !pendingBright
      flashes += 1
      if (flashes >= 6) {
        stopPulse()
        pendingBright = true
      }
    }, 240)
  }

  function stopPulse(): void {
    if (pulseInterval) clearInterval(pulseInterval)
    pulseInterval = null
    pendingBright = true
  }

  function cancelActiveTimers(): void {
    if (nextTargetTimeout) clearTimeout(nextTargetTimeout)
    nextTargetTimeout = null
    stopPulse()
  }

  function cancelChallengeTimers(): void {
    challengeRequest += 1
    if (countdownTimeout) clearTimeout(countdownTimeout)
    countdownTimeout = null
    cancelActiveTimers()
    pointerPads.clear()
  }

  function setMode(next: TwisterMode): void {
    if (active || phase === 'countdown') return
    mode = next
    savePreference(modeKey, next)
    resetChallenge()
  }

  function setHandMode(next: HandMode): void {
    if (active || phase === 'countdown') return
    handMode = next
    savePreference(handsKey, next)
    resetChallenge()
  }

  function resetChallenge(): void {
    cancelChallengeTimers()
    phase = 'idle'
    owners = createEmptyTargets()
    held = Array(64).fill(false)
    pendingIndex = null
    failedIndex = null
    loser = null
    nextPlayer = 1
  }

  function updateColour(player: TwisterPlayer, event: Event): void {
    const input = event.target as HTMLInputElement
    const next = input.value.toLowerCase()
    const other = player === 1 ? playerTwoColour : playerOneColour
    if (!usableColour(next)) {
      colourWarning = 'Choose a brighter colour so it remains visible on the Launchpad.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }
    if (sameColour(next, other)) {
      colourWarning = 'Players need two different Launchpad colours.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }
    colourWarning = ''
    if (player === 1) {
      playerOneColour = next
      savePreference(playerOneColourKey, next)
    } else {
      playerTwoColour = next
      savePreference(playerTwoColourKey, next)
    }
  }

  function previewColours(): void {
    if (!connected || active || phase === 'countdown') return
    cancelPreview()
    const one = hexToLaunchpadRgb(playerOneColour)
    const two = hexToLaunchpadRgb(playerTwoColour)
    paintFrame(cells.map((index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? one : two))
    previewTimeout = setTimeout(() => {
      const currentOne = hexToLaunchpadRgb(playerOneColour)
      const currentTwo = hexToLaunchpadRgb(playerTwoColour)
      paintFrame(owners.map((owner) => owner === 1 ? currentOne : owner === 2 ? currentTwo : off))
      previewTimeout = null
    }, 900)
  }

  function cancelPreview(): void {
    if (previewTimeout) clearTimeout(previewTimeout)
    previewTimeout = null
  }

  function handleOutputChange(event: Event): void {
    selectOutput((event.target as HTMLSelectElement).value)
  }

  function countHeldPads(targets: TargetOwners, pressed: boolean[]): { playerOne: number; playerTwo: number } {
    let playerOne = 0
    let playerTwo = 0
    targets.forEach((owner, index) => {
      if (!pressed[index]) return
      if (owner === 1) playerOne += 1
      if (owner === 2) playerTwo += 1
    })
    return { playerOne, playerTwo }
  }

  function playerLabel(player: TwisterPlayer): string {
    if (mode === 'solo') return 'You'
    return `Player ${player}`
  }

  function targetState(index: number): string {
    if (index === failedIndex && phase === 'lost') return 'released — challenge lost'
    if (index === pendingIndex) return `${playerLabel(owners[index] as TwisterPlayer)} new target`
    if (held[index]) return `${playerLabel(owners[index] as TwisterPlayer)} held target`
    return 'unlit'
  }

  function scaleColour(colour: LaunchpadRgb, factor: number): LaunchpadRgb {
    return [
      Math.round(colour[0] * factor),
      Math.round(colour[1] * factor),
      Math.round(colour[2] * factor),
    ]
  }

  function usableColour(colour: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(colour) && hexToLaunchpadRgb(colour).reduce((sum, channel) => sum + channel, 0) >= 24
  }

  function sameColour(first: string, second: string): boolean {
    const a = hexToLaunchpadRgb(first)
    const b = hexToLaunchpadRgb(second)
    return a.every((channel, index) => channel === b[index])
  }

  function savePreference(key: string, value: string): void {
    try { localStorage.setItem(key, value) } catch { /* Preferences are optional. */ }
  }
</script>

<svelte:head><meta name="description" content="A multi-touch holding challenge for one or two players on an 8 by 8 Launchpad." /></svelte:head>

<main class="shell" style={`--player-one:${playerOneColour};--player-two:${playerTwoColour};`}>
  <header><a href="../" aria-label="Back to Classroom Tools">← <span>Classroom Tools</span></a><span>LAUNCHPAD ARCADE</span><b class:danger={phase === 'lost'}>{phase === 'lost' ? 'RELEASED' : active ? 'HOLD' : 'READY'}</b></header>
  <section class="layout">
    <aside>
      <p class="eyebrow">DON'T LET GO.</p><h1>FINGER<br /><em>TWISTER</em></h1>
      <p class="lede">Press each new colour and keep every assigned pad held. The first released target ends the challenge.</p>
      <div class="segmented" aria-label="Game mode"><button class:active={mode === 'local'} aria-pressed={mode === 'local'} disabled={active || phase === 'countdown'} onclick={() => setMode('local')}>2 PLAYERS</button><button class:active={mode === 'solo'} aria-pressed={mode === 'solo'} disabled={active || phase === 'countdown'} onclick={() => setMode('solo')}>SOLO</button></div>
      <div class="segmented hands" aria-label="Hand limit"><button class:active={handMode === 'one'} aria-pressed={handMode === 'one'} disabled={active || phase === 'countdown'} onclick={() => setHandMode('one')}>1 HAND · {mode === 'solo' ? '5 MAX' : '5 EACH'}</button><button class:active={handMode === 'two'} aria-pressed={handMode === 'two'} disabled={active || phase === 'countdown'} onclick={() => setHandMode('two')}>2 HANDS · {mode === 'solo' ? '10 MAX' : '10 EACH'}</button></div>
      <div class="holds">
        <section><label aria-label="Choose Player 1 colour"><input type="color" value={playerOneColour} oninput={(event) => updateColour(1, event)} /><i class="one"></i></label><div><small>{playerLabel(1).toUpperCase()}</small><strong>{pendingIndex !== null && owners[pendingIndex] === 1 ? 'NEW TARGET' : heldCounts.playerOne > 0 ? 'KEEP HOLDING' : 'STANDBY'}</strong></div><b>{heldCounts.playerOne} / {limit}</b></section>
        {#if mode === 'local'}<section><label aria-label="Choose Player 2 colour"><input type="color" value={playerTwoColour} oninput={(event) => updateColour(2, event)} /><i class="two"></i></label><div><small>PLAYER 2</small><strong>{pendingIndex !== null && owners[pendingIndex] === 2 ? 'NEW TARGET' : heldCounts.playerTwo > 0 ? 'KEEP HOLDING' : 'STANDBY'}</strong></div><b>{heldCounts.playerTwo} / {limit}</b></section>{/if}
      </div>
      {#if colourWarning}<p class="warning" aria-live="polite">{colourWarning}</p>{/if}
      <button class="start" onclick={startChallenge}>{active || phase === 'countdown' ? 'RESTART CHALLENGE' : phase === 'lost' || phase === 'won' ? 'PLAY AGAIN' : 'START HOLD CHALLENGE'} <span>→</span></button>
      <p class="instructions">New lights wait for you indefinitely. Once pressed, that finger must stay down. Browser play supports multiple simultaneous touches; a mouse can only hold one pad.</p>
      <section class="device-panel" class:connected><div><span>HARDWARE</span><i></i></div>{#if midiState.outputs.length > 0}<select aria-label="Launchpad lighting output" value={midiState.selectedOutput?.id ?? ''} onchange={handleOutputChange}>{#each midiState.outputs as output (output.id)}<option value={output.id}>{getOutputLabel(output)}</option>{/each}</select>{/if}<p class:error={midiState.status === 'error'}>{midiState.statusMessage}</p><div class="device-actions"><button onclick={() => void connect()} disabled={!isMidiSupported() || midiState.status === 'connecting' || midiState.status === 'connected'}>{midiState.status === 'connecting' ? 'CONNECTING…' : midiState.status === 'connected' ? 'MIDI ACCESS ON' : isMidiSupported() ? 'CONNECT LAUNCHPAD' : 'USE CHROME FOR MIDI'}</button>{#if connected}<button onclick={previewColours} disabled={active || phase === 'countdown'}>TEST COLOURS</button>{/if}</div></section>
    </aside>

    <section class="board-card" aria-label="Finger Twister board">
      <div class="board-head"><span>{phaseLabel}</span><span>{totalHeld} HELD · {assignedCounts.playerOne + assignedCounts.playerTwo} LIT</span></div>
      <div class="launchpad-frame"><div class="grid" role="grid" aria-label="8 by 8 Finger Twister board">{#each cells as cell}<button class="pad" class:one={owners[cell] === 1} class:two={owners[cell] === 2} class:pending={pendingIndex === cell} class:held={held[cell]} class:failed={failedIndex === cell && phase === 'lost'} disabled={!active} aria-label={`Pad ${cell + 1}, ${targetState(cell)}`} onpointerdown={(event) => handlePointerDown(cell, event)} onpointerup={handlePointerRelease} onpointercancel={handlePointerRelease}></button>{/each}</div>{#if phase === 'countdown'}<div class="countdown" aria-live="assertive"><span>HANDS READY</span><b>{countdown}</b></div>{/if}</div>
      {#if phase === 'lost' || phase === 'won'}<div class="result" aria-live="assertive"><span>{phase === 'won' ? 'COMPLETE' : 'PAD RELEASED'}</span><strong>{phase === 'won' ? `${limit} pads held` : winner === null ? 'Try again' : `${playerLabel(winner)} wins`}</strong><b>{heldCounts.playerOne}{mode === 'local' ? ` — ${heldCounts.playerTwo}` : ` / ${limit}`}</b></div>{/if}
      <div class="board-foot"><span>{mode === 'solo' ? `${limit} TARGET SOLO LIMIT` : `${limit} TARGETS PER PLAYER`}</span><span>{pendingIndex === null ? 'BOARD MIRROR' : 'PULSING PAD = NEXT'}</span></div>
    </section>
  </section>
</main>
