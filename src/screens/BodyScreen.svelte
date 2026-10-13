<script lang="ts">
  import { onMount } from 'svelte'
  import BottomSheet, { type Snap } from '../components/BottomSheet.svelte'
  import MuscleInfo from '../components/MuscleInfo.svelte'
  import SideActions from '../components/SideActions.svelte'
  import type { Selection } from '../lib/content'
  import { load, save } from '../lib/storage'
  import { createViewer, type Viewer } from '../lib/viewer/viewer'

  const HINT_KEY = 'pt-anatomy:hint-seen:v1'
  const debug = new URLSearchParams(location.search).has('debug')

  let canvas: HTMLCanvasElement
  let viewer = $state<Viewer | null>(null)
  let selection = $state<Selection | null>(null)
  let snap = $state<Snap>('peek')
  let superficialHidden = $state(false)
  let hintSeen = $state(load(HINT_KEY, false))

  function show(next: Selection | null) {
    selection = next
    if (!next) return
    snap = 'peek'
    if (!hintSeen) {
      hintSeen = true
      save(HINT_KEY, true)
    }
  }

  function toggleLayer() {
    superficialHidden = !superficialHidden
    viewer?.setSuperficialHidden(superficialHidden)
  }

  const blurActive = () => (document.activeElement as HTMLElement | null)?.blur()

  onMount(() => {
    createViewer(canvas, { onPick: show, onProgress: () => {} }).then((v) => {
      viewer = v
      if (debug) window.__ptDebug = v
    })
    return () => viewer?.dispose()
  })
</script>

<canvas
  bind:this={canvas}
  aria-label="Mô hình 3D cơ thể. Chạm vào cơ để xem thông tin."
  onpointerdown={blurActive}
></canvas>

{#if viewer}
  <SideActions {superficialHidden} onFlip={() => viewer?.flip()} onToggleLayer={toggleLayer} />
  {#if !hintSeen}
    <p class="hint" role="status">Chạm vào cơ để xem tên và bài tập</p>
  {/if}
{/if}

<BottomSheet open={selection !== null} bind:snap label="Thông tin cơ">
  {#if selection}
    <MuscleInfo muscle={selection.muscle} part={selection.part} />
  {/if}
</BottomSheet>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .hint {
    position: fixed;
    left: 50%;
    bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    margin: 0;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--color-text);
    color: var(--color-surface);
    font-size: var(--font-sm);
    white-space: nowrap;
    pointer-events: none;
  }
</style>
