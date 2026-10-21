<script lang="ts">
  export let scope: 'screen' | 'board' = 'screen'

  const screenFireworks = [
    { x: 12, y: 26, color: '#ffd568', delay: 0 },
    { x: 33, y: 14, color: '#76dcff', delay: 0.45 },
    { x: 78, y: 26, color: '#ff8fc8', delay: 0.9 },
    { x: 91, y: 55, color: '#b3a0ff', delay: 1.35 },
    { x: 23, y: 74, color: '#87efb4', delay: 1.8 },
    { x: 70, y: 79, color: '#ffd568', delay: 2.25 },
  ]
  const boardFireworks = [
    { x: 26, y: 22, color: '#76dcff', delay: 0.2 },
    { x: 70, y: 35, color: '#ffd568', delay: 0.8 },
    { x: 48, y: 62, color: '#ff8fc8', delay: 1.4 },
    { x: 76, y: 82, color: '#87efb4', delay: 2 },
  ]
  $: fireworks = scope === 'board' ? boardFireworks : screenFireworks

  const sparks = Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 40) * Math.PI * 2
    const radius = index % 2 === 0 ? 1 : 0.65
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
</script>

  <div class={scope === 'board' ? 'board-fireworks' : 'success-fireworks'} aria-hidden="true">
    {#each fireworks as firework}
      <div
        class="firework"
        style={`left: ${firework.x}%; top: ${firework.y}%; --firework-color: ${firework.color}; --firework-delay: ${firework.delay}s;`}
      >
        {#each sparks as spark}
          <span class="firework-spark" style={`--spark-x: ${spark.x}; --spark-y: ${spark.y};`}></span>
        {/each}
      </div>
    {/each}
    <span class="celebration-star star-one">✦</span>
    <span class="celebration-star star-two">✧</span>
    <span class="celebration-star star-three">✦</span>
  </div>
