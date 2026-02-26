<script lang="ts">
  import PadCell from './PadCell.svelte'

  interface Props {
    noteMapping: number[]
    activeNote: number | null
    activePadColor: string | null
  }
  const { noteMapping, activeNote, activePadColor }: Props = $props()
</script>

<div class="grid" role="grid" aria-label="Launchpad 8×8 grid">
  {#each noteMapping as note (note)}
    <PadCell
      {note}
      isActive={note === activeNote}
      color={note === activeNote ? activePadColor : null}
    />
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(8, 60px);
    grid-template-rows: repeat(8, 60px);
    gap: 10px;
    justify-content: center;
    margin: 20px 0;
  }

  @media (max-width: 600px) {
    .grid {
      grid-template-columns: repeat(8, 40px);
      grid-template-rows: repeat(8, 40px);
      gap: 8px;
    }
  }
</style>
