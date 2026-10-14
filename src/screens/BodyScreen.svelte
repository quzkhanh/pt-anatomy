<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import BottomSheet from '../components/BottomSheet.svelte'
  import DebugOverlay from '../components/DebugOverlay.svelte'
  import ExerciseHeader from '../components/ExerciseHeader.svelte'
  import GestureHint from '../components/GestureHint.svelte'
  import ExerciseInfo from '../components/ExerciseInfo.svelte'
  import LoadState from '../components/LoadState.svelte'
  import MuscleHeader from '../components/MuscleHeader.svelte'
  import MuscleInfo from '../components/MuscleInfo.svelte'
  import MuscleList from '../components/MuscleList.svelte'
  import SearchBar from '../components/SearchBar.svelte'
  import SideActions from '../components/SideActions.svelte'
  import { app, openMuscle, type Selection } from '../lib/app-state.svelte'
  import type { PartRef } from '../lib/content'
  import { highlightOf, layerFor } from '../lib/highlight-of'
  import type { Snap } from '../lib/sheet'
  import { load, save } from '../lib/storage'
  import { hasWebGL } from '../lib/webgl'
  import { createViewer, type Viewer } from '../lib/viewer/viewer'

  const HINT_KEY = 'pt-anatomy:hint-seen:v1'
  const TURN_RADIANS = Math.PI / 2
  const debug = new URLSearchParams(location.search).has('debug')

  let { hidden, showHint }: { hidden: boolean; showHint: boolean } = $props()

  let canvas = $state<HTMLCanvasElement>()
  let viewer = $state<Viewer | null>(null)
  let shown = $state<Selection | null>(null)
  let snap = $state<Snap>('peek')
  let sheetTop = $state(0)
  let superficialHidden = $state(false)
  let hintSeen = $state(load(HINT_KEY, false))

  const webgl = hasWebGL()

  let phase = $state<'loading' | 'ready' | 'error'>('loading')
  let progress = $state<number | null>(null)
  let contextLost = $state(false)
  let canvasKey = $state(0)

  async function start() {
    if (contextLost) {
      // A lost context cannot be reused: mount a fresh canvas.
      contextLost = false
      canvasKey++
      await tick()
    }
    phase = 'loading'
    progress = null
    try {
      const v = await createViewer(canvas!, { onPick, onProgress: (p) => (progress = p), onContextLost, onGesture: dismissHint })
      v.setSuperficialHidden(superficialHidden)
      viewer = v
      phase = 'ready'
      if (debug) window.__ptDebug = v
    } catch (error) {
      console.error(error)
      phase = 'error'
    }
  }

  function onContextLost() {
    viewer?.dispose()
    viewer = null
    contextLost = true
    phase = 'error'
  }

  function onPick(ref: PartRef | null) {
    app.selection = ref && { kind: 'muscle', muscle: ref.muscle, part: ref.part, navigate: false }
    if (ref) dismissHint()
  }

  // The hint teaches both gestures, so the first tap on a muscle or the first rotation retires it.
  function dismissHint() {
    if (hintSeen) return
    hintSeen = true
    save(HINT_KEY, true)
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
    {#key canvasKey}
      <canvas bind:this={canvas} aria-label="Mô hình 3D cơ thể. Chạm vào cơ để xem thông tin." onpointerdown={blurActive}></canvas>
    {/key}
    {#if phase !== 'ready'}
      <LoadState
        {phase}
        {progress}
        message={contextLost ? 'Máy tạm dừng hiển thị 3D. Bấm Thử lại để mở lại mô hình.' : undefined}
        onRetry={start}
      />
    {/if}
  {:else}
    <MuscleList onSelect={openMuscle} />
  {/if}

  <SearchBar />

  {#if viewer}
    {#if app.selection === null || snap === 'peek'}
      <SideActions
        {superficialHidden}
        lift={app.selection ? sheetTop : 0}
        onFlip={() => viewer?.flip()}
        onTurn={() => viewer?.turn(-TURN_RADIANS)}
        onToggleLayer={() => setLayer(!superficialHidden)}
      />
    {/if}
    {#if showHint && !hintSeen && app.selection === null}
      <GestureHint />
    {/if}
  {/if}

  {#if debug && viewer}
    <DebugOverlay {viewer} />
  {/if}

  <BottomSheet
    open={app.selection !== null}
    bind:snap
    bind:peekHeight={sheetTop}
    label={shown?.kind === 'exercise' ? 'Thông tin bài tập' : 'Thông tin cơ'}
    contentKey={shown?.kind === 'exercise' ? `e:${shown.exercise.id}` : shown ? `m:${shown.muscle.id}` : ''}
    onClose={() => (app.selection = null)}
  >
    {#snippet header()}
      {#if shown?.kind === 'muscle'}
        <MuscleHeader muscle={shown.muscle} part={shown.part} />
      {:else if shown?.kind === 'exercise'}
        <ExerciseHeader exercise={shown.exercise} onShowMotion={snap === 'peek' ? () => (snap = 'half') : undefined} />
      {/if}
    {/snippet}
    {#if shown?.kind === 'muscle'}
      <MuscleInfo muscle={shown.muscle} />
    {:else if shown?.kind === 'exercise'}
      <ExerciseInfo exercise={shown.exercise} motionActive={!hidden && app.selection !== null && snap !== 'peek'} />
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
</style>
