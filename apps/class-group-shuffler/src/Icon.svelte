<script lang="ts">
  import { exitDoorPath } from '../../../packages/navigation-icons/index'

  let { name, size = 20 }: {
    name: 'arrow' | 'door' | 'home' | 'close' | 'edit' | 'groups' | 'plus' | 'settings' | 'shuffle'
    size?: number
  } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'arrow'}
    <path d="M4 12h15m-6-6 6 6-6 6" />
  {:else if name === 'door'}
    <path d={exitDoorPath} />
  {:else if name === 'home'}
    <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />
  {:else if name === 'close'}
    <path d="m6 6 12 12M18 6 6 18" />
  {:else if name === 'edit'}
    <path d="m14 6 4 4M5 19l4-1 10-10a2.8 2.8 0 0 0-4-4L5 14l-1 5Z" />
  {:else if name === 'groups'}
    <circle cx="9" cy="8" r="3" /><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v2" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'settings'}
    <path d="m9.5 3-.6 2.2-1.7 1-2.2-.6-2.5 4.3L4.1 11v2l-1.6 1.1L5 18.4l2.2-.6 1.7 1 .6 2.2h5l.6-2.2 1.7-1 2.2.6 2.5-4.3-1.6-1.1v-2l1.6-1.1L19 5.6l-2.2.6-1.7-1-.6-2.2Z" />
    <circle cx="12" cy="12" r="3" />
  {:else if name === 'shuffle'}
    <path d="M3 6h3c4 0 8 12 12 12h3m-4-4 4 4-4 4M3 18h3c4 0 8-12 12-12h3m-4-4 4 4-4 4" />
  {/if}
</svg>
