<script lang="ts">
  import { onMount } from 'svelte'
  import type { PartRef } from './lib/content'
  import { createViewer, type Viewer } from './lib/viewer/viewer'

  let canvas: HTMLCanvasElement
  let picked = $state<PartRef | null>(null)

  onMount(() => {
    let viewer: Viewer | undefined
    createViewer(canvas, { onPick: (ref) => (picked = ref), onProgress: () => {} }).then((v) => {
      viewer = v
      if (new URLSearchParams(location.search).has('debug')) window.__ptDebug = v
    })
    return () => viewer?.dispose()
  })
</script>

<canvas bind:this={canvas}></canvas>
{#if picked}
  <p class="picked">{picked.muscle.vi} — {picked.muscle.en}</p>
{/if}

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .picked {
    position: fixed;
    left: var(--space-4);
    bottom: var(--space-4);
    margin: 0;
    font-size: var(--font-lg);
  }
</style>
