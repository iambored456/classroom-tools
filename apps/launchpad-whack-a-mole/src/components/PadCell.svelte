<script lang="ts">
  interface Props {
    note: number
    isActive: boolean
    color: string | null
  }
  const { note, isActive, color }: Props = $props()
</script>

<div
  class="pad"
  class:active={isActive}
  style={isActive && color ? `background-color: ${color};` : ''}
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
    transition: background-color 0.3s, box-shadow 0.3s, transform 0.2s;
  }

  .pad.active {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
    transform: scale(1.05);
  }

  @media (max-width: 600px) {
    .pad {
      width: 40px;
      height: 40px;
    }
  }
</style>
