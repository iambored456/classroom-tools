<script lang="ts">
  import type { ExplosionPad } from '../lib/game.svelte.ts'
  import PadCell from './PadCell.svelte'

  interface Props {
    noteMapping: number[]
    activeNote: number | null
    activePadColor: string | null
    explosionPads: ExplosionPad[]
    countdownNotes: number[]
    targetProgress: number
    interactive: boolean
    onPadPress: (note: number) => void
  }

  const {
    noteMapping,
    activeNote,
    activePadColor,
    explosionPads,
    countdownNotes,
    targetProgress,
    interactive,
    onPadPress,
  }: Props = $props()
</script>

<div class="launchpad-frame">
  <div class="launchpad-brand"><span></span><span></span><span></span> LAUNCHPAD</div>
  <div class="grid" role="grid" aria-label="Playable 8 by 8 Launchpad grid">
    {#each noteMapping as note, index (note)}
      {@const explosionPad = explosionPads.find((pad) => pad.note === note)}
      <PadCell
        {note}
        row={Math.floor(index / 8)}
        column={index % 8}
        isActive={note === activeNote}
        isExplosion={explosionPad !== undefined}
        isCountdown={countdownNotes.includes(note)}
        color={note === activeNote ? activePadColor : (explosionPad?.color ?? null)}
        {targetProgress}
        {interactive}
        onPress={onPadPress}
      />
    {/each}
  </div>
  <div class="launchpad-footer" aria-hidden="true">
    <span>SESSION</span><span>NOTE</span><span>CUSTOM</span>
  </div>
</div>
