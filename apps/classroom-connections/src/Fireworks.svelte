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

<style>
.success-fireworks,
.board-fireworks {
  --burst-size: clamp(5rem, 15vw, 10rem);
  position: fixed;
  inset: 0;
  z-index: 8;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}

.board-fireworks {
  --burst-size: clamp(3rem, 10vw, 7rem);
  position: absolute;
  inset: 0;
  z-index: 9;
}

.firework {
  position: absolute;
  color: var(--firework-color);
}

.firework::before {
  content: '';
  position: absolute;
  width: 3px;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(transparent, currentColor);
  animation: firework-launch 3.6s ease-out infinite;
  animation-delay: var(--firework-delay);
  opacity: 0;
}

.firework-spark {
  position: absolute;
  width: clamp(4px, 0.65vw, 7px);
  height: clamp(4px, 0.65vw, 7px);
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 9px currentColor, 0 0 18px currentColor;
  animation: firework-burst 3.6s cubic-bezier(0.15, 0.6, 0.4, 1) infinite;
  animation-delay: var(--firework-delay);
  opacity: 0;
}

.celebration-star {
  position: absolute;
  color: #ffe59c;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  text-shadow: 0 0 12px #ffd568aa, 0 0 30px #ffd56866;
  animation: star-twinkle 2.4s ease-in-out infinite alternate;
}

.star-one { left: 8%; top: 22%; }
.star-two { right: 8%; top: 72%; animation-delay: 0.6s; }
.star-three { left: 53%; top: 13%; animation-delay: 1.2s; }

@keyframes firework-launch {
  0% { opacity: 0; transform: translateY(10rem) scaleY(1); }
  8% { opacity: 1; }
  16% { opacity: 0; transform: translateY(0) scaleY(0.1); }
  100% { opacity: 0; transform: translateY(0); }
}

@keyframes firework-burst {
  0%, 14% { opacity: 0; transform: translate(0, 0) scale(0.2); }
  18% { opacity: 1; }
  48% { opacity: 1; }
  72%, 100% {
    opacity: 0;
    transform: translate(calc(var(--spark-x) * var(--burst-size)), calc(var(--spark-y) * var(--burst-size) + 1.8rem)) scale(0.25);
  }
}

@keyframes star-twinkle {
  from { opacity: 0.4; transform: scale(0.75) rotate(-12deg); }
  to { opacity: 1; transform: scale(1.1) rotate(12deg); }
}

@media (prefers-reduced-motion: reduce) {
  .success-fireworks .firework::before,
  .board-fireworks .firework::before { display: none; }
  .success-fireworks .firework-spark,
  .board-fireworks .firework-spark {
    animation: none;
    opacity: 0.85;
    transform: translate(calc(var(--spark-x) * var(--burst-size)), calc(var(--spark-y) * var(--burst-size)));
  }
  .success-fireworks .celebration-star,
  .board-fireworks .celebration-star { animation: none; }
}
</style>
