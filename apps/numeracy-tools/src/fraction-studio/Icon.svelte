<script lang="ts">
  const paths = {
    explore: 'm3 12 9-9 9 9-9 9z M8 12h8 M12 8v8',
    game: 'M6 7h12l3 10q0 3-3 2l-3-3H9l-3 3q-3 1-3-2z M7 11v4 M5 13h4 M16 11h.1 M18 13h.1',
    class: 'M3 4h18v13H3z M12 17v4 M8 21l4-4 4 4',
    grid: 'M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h18 M3 15h18',
    arrow: 'M4 12h16m-6-6 6 6-6 6', pen: 'm4 16 12-12 4 4L8 20l-5 1z M13 7l4 4',
    reveal: 'M2 12q10-14 20 0-10 14-20 0z M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
    expand: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
    erase: 'm3 14 11-11 7 7-11 11H9z M7 10l7 7 M10 21h11'
  }
  let { name, size = 18 }: { name: keyof typeof paths; size?: number } = $props()
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>

