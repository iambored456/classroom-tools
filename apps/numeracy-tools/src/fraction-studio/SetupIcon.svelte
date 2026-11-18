<script lang="ts">
  import type { Kind } from './rounds'
  type Symbol = 'fraction' | 'decimal' | 'percent' | 'money'
  export type Pair = 'all' | 'fraction-decimal' | 'decimal-percent' | 'fraction-percent' | 'decimal-money'
  let { mode, values, pair, rounds }: { mode?: Kind; values?: 'benchmarks' | 'hundredths'; pair?: Pair; rounds?: number } = $props()
  const symbols: Record<Symbol, { value: string; paper: string }> = {
    fraction: { value: '½', paper: '#a6dfc6' }, decimal: { value: '0.5', paper: '#c6bcf1' },
    percent: { value: '50%', paper: '#f5c18e' }, money: { value: '$0.50', paper: '#cae2f4' },
  }
  const pairs: Record<Pair, Symbol[]> = {
    all: ['fraction', 'decimal', 'percent', 'money'], 'fraction-decimal': ['fraction','decimal'],
    'decimal-percent': ['decimal','percent'], 'fraction-percent': ['fraction','percent'], 'decimal-money': ['decimal','money'],
  }
</script>

<svg viewBox="0 0 84 48" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round">
  {#if mode === 'mixed'}
    <g transform="rotate(-8 27 24)">
      <rect x="7" y="7" width="35" height="33" rx="5" fill="#a6dfc6" />
      <path d="M14 15h7v7h-7zm10 0h7v7h-7zm-10 10h7v7h-7z" fill="#1c5647"/>
    </g>
    <g transform="rotate(9 55 25)">
      <rect x="36" y="10" width="37" height="31" rx="5" fill="#c6bcf1"/>
      <text x="54.5" y="32" font-size="21">%</text>
    </g>
  {:else if mode === 'build'}
    {#each Array.from({length:9}, (_, i) => i) as i}
      <rect x={19 + i % 3 * 13} y={6 + Math.floor(i / 3) * 13} width="11" height="11" rx="2"
        fill={i === 2 ? 'none' : '#65bfa3'} stroke={i === 2 ? 'currentColor' : 'none'} stroke-dasharray="2 3" />
    {/each}
    <rect x="59" y="3" width="12" height="12" rx="2" fill="#f1a664" transform="rotate(12 65 9)"/>
  {:else if mode === 'convert'}
    <circle cx="18" cy="24" r="15" fill="#a6dfc6"/><text x="18" y="30" font-size="20">½</text>
    <path d="M35 19h14l-4-4m4 14H35l4 4" stroke="currentColor" stroke-width="2.5"/>
    <rect x="52" y="10" width="30" height="28" rx="6" fill="#c6bcf1"/><text x="67" y="30" font-size="15">0.5</text>
  {:else if mode === 'match'}
    <g transform="rotate(-8 23 24)"><rect x="7" y="6" width="31" height="35" rx="5" fill="#c6bcf1"/><text x="22.5" y="29" font-size="15">0.5</text></g>
    <g transform="rotate(8 61 24)"><rect x="46" y="6" width="31" height="35" rx="5" fill="#f5c18e"/><text x="61.5" y="29" font-size="14">50%</text></g>
    <circle cx="42" cy="35" r="8" fill="#174c41"/><path d="m38 35 3 3 5-6" stroke="white" stroke-width="2"/>
  {:else if mode === 'money'}
    <path d="M17 19 29 6h30l8 24-32 13z" fill="#f5c18e"/>
    <circle cx="30" cy="14" r="2.4" fill="#643c25"/><path d="M29 14Q17 2 13 10q-3 5 6 7" stroke="currentColor" stroke-width="1.7"/>
    <text x="45" y="33" font-size="24" transform="rotate(-12 45 25)">%</text>
  {:else if values === 'benchmarks'}
    {#each [0,1,2] as i}
      <g transform={'translate(' + (15+i*27) + ' 24)'}>
        <circle r="11" fill="#e1eee6"/>
        <path d={['M0 0V-11A11 11 0 0 1 11 0Z','M0 0V-11A11 11 0 0 1 0 11Z','M0 0V-11A11 11 0 1 1 -11 0Z'][i]} fill="#39a58b"/>
      </g>
    {/each}
  {:else if values === 'hundredths'}
    {#each Array.from({length:100}, (_, i) => i) as i}
      <rect x={23 + i % 10 * 3.9} y={5 + Math.floor(i / 10) * 3.9} width="3.15" height="3.15" rx=".4" fill={i < 37 ? '#39a58b' : '#cddcd5'}/>
    {/each}
  {:else if pair}
    {#each pairs[pair] as key, i}
      {@const four = pair === 'all'}
      <g transform={'translate(' + ((i % 2) * 42 + 2) + ' ' + (four ? 3 + Math.floor(i / 2) * 22 : 11) + ')'}>
        <rect width="38" height={four ? 19 : 26} rx="4" fill={symbols[key].paper}/>
        <text x="19" y={four ? 14 : 18} font-size={key === 'money' ? 11 : 14}>{symbols[key].value}</text>
      </g>
    {/each}
  {:else if rounds}
    {#each Array.from({length:rounds}, (_, i) => i) as i}
      <circle cx={42 + ((i % 5) - (Math.min(rounds,5)-1)/2)*14} cy={rounds > 5 ? 17 + Math.floor(i/5)*14 : 24} r="5.6" fill={i < 5 ? '#68bda3' : '#a194d6'} />
    {/each}
  {/if}
</svg>

<style>
  svg { display:block; width:100%; height:100%; }
  text { fill:#19352d; font-family:inherit; font-weight:700; text-anchor:middle; }
</style>
