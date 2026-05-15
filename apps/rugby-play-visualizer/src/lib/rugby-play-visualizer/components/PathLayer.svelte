<script lang="ts">
  import {
    getActivePassAtTime,
    getPassPolyline,
  } from '../playEngine'
  import type { PassEvent, PlayVariation, Point } from '../types'

  export let variation: PlayVariation
  export let currentTime: number
  export let showPaths: boolean
  export let showPassLabels: boolean
  export let showBranchLabels: boolean
  export let selectedPassId: string | null = null

  $: activePass = getActivePassAtTime(variation, currentTime)

  function pointsToPath(points: Point[]): string {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
  }

  function getPassPath(pass: PassEvent): string {
    return pointsToPath(getPassPolyline(variation, pass))
  }

  function getPassLabelPoint(pass: PassEvent): Point {
    const points = getPassPolyline(variation, pass)
    const middleIndex = Math.floor((points.length - 1) / 2)
    const start = points[middleIndex] ?? points[0] ?? { x: 0, y: 0 }
    const end = points[middleIndex + 1] ?? start
    const offset = pass.labelOffset ?? { dx: 0, dy: 0 }

    return {
      x: (start.x + end.x) / 2 + offset.dx,
      y: (start.y + end.y) / 2 - 2 + offset.dy,
    }
  }

  function shouldShowBranchLabel(labelTime: number | undefined, t: number): boolean {
    return labelTime === undefined || t >= labelTime - 0.15
  }
</script>

<g class="path-layer">
  {#if showPaths}
    <g class="run-paths">
      {#each variation.playerPaths as path (path.playerId)}
        <path class="run-path" d={pointsToPath(path.waypoints)} />
      {/each}
    </g>
  {/if}

  <g class="pass-paths">
    {#each variation.passes as pass (pass.id)}
      <path
        class={`pass-path ${activePass?.id === pass.id ? 'is-active' : ''} ${selectedPassId === pass.id ? 'is-selected' : ''}`}
        d={getPassPath(pass)}
        marker-end="url(#pass-arrow)"
      />

      {#if showPassLabels}
        <text
          class="pass-label"
          x={getPassLabelPoint(pass).x}
          y={getPassLabelPoint(pass).y}
          text-anchor="middle"
        >
          {pass.label}
        </text>
      {/if}
    {/each}
  </g>

  {#if showBranchLabels && variation.branchLabels}
    <g class="branch-labels">
      {#each variation.branchLabels as label (label.id)}
        {#if shouldShowBranchLabel(label.t, currentTime)}
          <g transform={`translate(${label.at.x} ${label.at.y})`}>
            <rect class="branch-label-bg" x="-8.5" y="-3.15" width="17" height="5.3" rx="2.4" />
            <text class="branch-label" y="0.75" text-anchor="middle">{label.text}</text>
          </g>
        {/if}
      {/each}
    </g>
  {/if}
</g>
