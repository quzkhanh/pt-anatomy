<script lang="ts">
  import { onMount } from 'svelte'
  import { createViewer, type Part } from './lib/viewer/viewer'

  let canvas: HTMLCanvasElement
  let selected = $state<Part | null>(null)
  let status = $state('Đang tải model…')

  onMount(() => {
    const started = performance.now()
    let timer: ReturnType<typeof setInterval>
    createViewer(canvas, (part) => (selected = part))
      .then((viewer) => {
        const loadMs = Math.round(performance.now() - started)
        timer = setInterval(() => (status = `tải ${loadMs} ms · ${viewer.fps()} fps · ${viewer.triangles()} tam giác`), 1000)
      })
      .catch((e) => (status = `Lỗi: ${e.message}`))
    return () => clearInterval(timer)
  })
</script>

<canvas bind:this={canvas}></canvas>
<div class="hud">
  <p class="status">{status}</p>
  {#if selected}
    <p class="name">{selected.name}{selected.side ? ` (${selected.side === 'r' ? 'phải' : 'trái'})` : ''}</p>
  {/if}
</div>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .hud {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    color: #fff;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
    pointer-events: none;
  }
  .status {
    margin: 0;
    font-size: 12px;
    opacity: 0.7;
  }
  .name {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 600;
  }
</style>
