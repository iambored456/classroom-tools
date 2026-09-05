<script lang="ts">
  interface Props {
    note: number
    row: number
    column: number
    isActive: boolean
    isExplosion: boolean
    isCountdown: boolean
    color: string | null
    targetProgress: number
    interactive: boolean
    onPress: (note: number) => void
  }

  const {
    note,
    row,
    column,
    isActive,
    isExplosion,
    isCountdown,
    color,
    targetProgress,
    interactive,
    onPress,
  }: Props = $props()
</script>

<button
  class="pad"
  class:active={isActive}
  class:explosion={isExplosion}
  class:countdown={isCountdown}
  class:urgent={isActive && targetProgress < 0.35}
  style:--pad-color={color ?? '#f6c453'}
  style:--target-progress={targetProgress}
  data-note={note}
  aria-label="Row {row + 1}, column {column + 1}{isActive ? ', target' : ''}"
  tabindex={interactive ? 0 : -1}
  disabled={!interactive}
  onclick={() => onPress(note)}
>
  <span class="pad-light"></span>
  {#if isActive}<span class="target-ring" aria-hidden="true"></span>{/if}
</button>
