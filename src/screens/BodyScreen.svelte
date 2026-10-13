<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import BottomSheet, { type Snap } from '../components/BottomSheet.svelte'
  import DebugOverlay from '../components/DebugOverlay.svelte'
  import ExerciseInfo from '../components/ExerciseInfo.svelte'
  import LoadState from '../components/LoadState.svelte'
  import MuscleInfo from '../components/MuscleInfo.svelte'
  import MuscleList from '../components/MuscleList.svelte'
  import SearchBar from '../components/SearchBar.svelte'
  import SideActions from '../components/SideActions.svelte'
  import { app, openMuscle, type Selection } from '../lib/app-state.svelte'
  import type { PartRef } from '../lib/content'
  import { highlightOf, layerFor } from '../lib/highlight-of'
  import { load, save } from '../lib/storage'
  import { createViewer, type Viewer } from '../lib/viewer/viewer'

  const HINT_KEY = 'pt-anatomy:hint-seen:v1'
  const debug = new URLSearchParams(location.search).has('debug')

  let { hidden, showHint }: { hidden: boolean; showHint: boolean } = $props()

  let canvas = $state<HTMLCanvasElement>()
  let viewer = $state<Viewer | null>(null)
  let shown = $state<Selection | null>(null)
  let snap = $state<Snap>('peek')
  let superficialHidden = $state(false)
  let hintSeen = $state(load(HINT_KEY, false))

  const webgl = (() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      return gl !== null
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
      const v = await createViewer(canvas!, { onPick, onProgress: (p) => (progress = p) })
      v.setSuperficialHidden(superficialHidden)
      viewer = v
      phase = 'ready'
      if (debug) window.__ptDebug = v
    } catch (error) {
      console.error(error)
      phase = 'error'
    }
  }

  function onPick(ref: PartRef | null) {
    app.selection = ref && { kind: 'muscle', muscle: ref.muscle, part: ref.part, navigate: false }
    if (ref && !hintSeen) {
      hintSeen = true
      save(HINT_KEY, true)
    }
  }

  function setLayer(hidden: boolean) {
    superficialHidden = hidden
    viewer?.setSuperficialHidden(hidden)
  }

  // Highlight before switching layers: the viewer drops a highlight whose primary muscles become hidden.
  function apply(selection: Selection | null, v: Viewer | null) {
    const highlight = highlightOf(selection)
    v?.highlight(highlight)
    if (!selection) return
    shown = selection
    // Always the low snap, so the highlighted muscles stay in view; the sheet expands on demand.
    snap = 'peek'
    if (!selection.navigate) return
    const layer = layerFor(highlight.primary)
    if (layer) setLayer(layer === 'deep')
    // Face the most important primary muscle: a squat's quads are in front even though its glutes are behind.
    v?.focus(highlight.primary.slice(0, 1))
  }

  $effect(() => {
    const selection = app.selection
    const v = viewer
    untrack(() => apply(selection, v))
  })

  const blurActive = () => (document.activeElement as HTMLElement | null)?.blur()

  onMount(() => {
    if (webgl) start()
    return () => viewer?.dispose()
  })
</script>

<div class="screen" style:visibility={hidden ? 'hidden' : null} inert={hidden}>
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
    <MuscleList onSelect={openMuscle} />
  {/if}

  <SearchBar />

  {#if viewer}
    {#if app.selection === null || snap === 'peek'}
      <SideActions {superficialHidden} onFlip={() => viewer?.flip()} onToggleLayer={() => setLayer(!superficialHidden)} />
    {/if}
    {#if showHint && !hintSeen && app.selection === null}
      <p class="hint" role="status">Chạm vào cơ để xem tên và bài tập</p>
    {/if}
  {/if}

  {#if debug && viewer}
    <DebugOverlay {viewer} />
  {/if}

  <BottomSheet
    open={app.selection !== null}
    bind:snap
    label={shown?.kind === 'exercise' ? 'Thông tin bài tập' : 'Thông tin cơ'}
  >
    {#if shown?.kind === 'muscle'}
      <MuscleInfo muscle={shown.muscle} part={shown.part} />
    {:else if shown?.kind === 'exercise'}
      <ExerciseInfo exercise={shown.exercise} />
    {/if}
  </BottomSheet>
</div>

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
    bottom: calc(var(--bottom-ui) + var(--space-6));
    transform: translateX(-50%);
    margin: 0;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--color-text);
    color: var(--color-surface);
    font-size: var(--font-sm);
    max-width: calc(100% - 2 * var(--space-4));
    white-space: normal;
    text-align: center;
    pointer-events: none;
  }
</style>
