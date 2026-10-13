<script lang="ts">
  import { onMount } from 'svelte'
  import BottomSheet, { type Snap } from '../components/BottomSheet.svelte'
  import DebugOverlay from '../components/DebugOverlay.svelte'
  import LoadState from '../components/LoadState.svelte'
  import MuscleInfo from '../components/MuscleInfo.svelte'
  import MuscleList from '../components/MuscleList.svelte'
  import SearchBar from '../components/SearchBar.svelte'
  import SideActions from '../components/SideActions.svelte'
  import { isSuperficial, type Selection } from '../lib/content'
  import type { Muscle } from '../lib/content-types'
  import { load, save } from '../lib/storage'
  import { createViewer, type Viewer } from '../lib/viewer/viewer'

  const HINT_KEY = 'pt-anatomy:hint-seen:v1'
  const debug = new URLSearchParams(location.search).has('debug')

  let canvas = $state<HTMLCanvasElement>()
  let viewer = $state<Viewer | null>(null)
  let selection = $state<Selection | null>(null)
  let snap = $state<Snap>('peek')
  let superficialHidden = $state(false)
  let hintSeen = $state(load(HINT_KEY, false))

  const webgl = (() => {
    try {
      return document.createElement('canvas').getContext('webgl2') !== null
    } catch {
      return false
    }
  })()

  let phase = $state<'loading' | 'ready' | 'error'>('loading')
  let progress = $state<number | null>(null)

  async function start() {
    phase = 'loading'
    progress = null
    try {
      const v = await createViewer(canvas!, { onPick: show, onProgress: (p) => (progress = p) })
      viewer = v
      phase = 'ready'
      if (debug) window.__ptDebug = v
    } catch (error) {
      console.error(error)
      phase = 'error'
    }
  }

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

  function selectMuscle(muscle: Muscle) {
    const deep = muscle.parts.every((part) => !isSuperficial({ muscle, part }))
    if (deep && !superficialHidden) toggleLayer()
    viewer?.select(muscle.id)
    viewer?.focus(muscle.id)
    show({ muscle, part: null })
  }

  const blurActive = () => (document.activeElement as HTMLElement | null)?.blur()

  onMount(() => {
    if (webgl) start()
    return () => viewer?.dispose()
  })
</script>

{#if webgl}
  <canvas
    bind:this={canvas}
    aria-label="Mô hình 3D cơ thể. Chạm vào cơ để xem thông tin."
    onpointerdown={blurActive}
  ></canvas>
  {#if phase !== 'ready'}
    <LoadState {phase} {progress} onRetry={start} />
  {/if}
{:else}
  <MuscleList onSelect={(muscle) => show({ muscle, part: null })} />
{/if}

<SearchBar onSelect={selectMuscle} />

{#if viewer}
  <SideActions {superficialHidden} onFlip={() => viewer?.flip()} onToggleLayer={toggleLayer} />
  {#if !hintSeen}
    <p class="hint" role="status">Chạm vào cơ để xem tên và bài tập</p>
  {/if}
{/if}

{#if debug && viewer}
  <DebugOverlay {viewer} />
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
