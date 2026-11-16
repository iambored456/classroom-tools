<script lang="ts">
  import { renderMath } from './math'

  let { tex }: { tex: string } = $props()
  const markup = $derived.by(() => {
    try { return renderMath(tex) } catch { return undefined }
  })
</script>

{#if markup}
  {@html markup}
{:else}
  <span>{tex}</span>
{/if}
