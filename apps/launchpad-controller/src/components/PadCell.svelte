<script lang="ts">
  interface Props {
    note: number
    isActive: boolean
  }
  const { note, isActive }: Props = $props()
</script>

<div
  class="pad"
  class:active={isActive}
  data-note={note}
  role="gridcell"
  aria-label="Pad {note}"
></div>

<style>
  .pad {
    width: 60px;
    height: 60px;
    background-color: #333333;
    border-radius: 10px;
    transition: background-color 0.15s;
  }

  .pad.active {
    background-color: #1db954;
    box-shadow: 0 0 12px rgba(29, 185, 84, 0.6);
  }

  @media (max-width: 600px) {
    .pad {
      width: 40px;
      height: 40px;
    }
  }
</style>
