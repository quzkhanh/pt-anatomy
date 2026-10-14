<script lang="ts">
  import { onMount, tick, untrack } from 'svelte'
  import DebugOverlay from '../components/DebugOverlay.svelte'
  import GestureHint from '../components/GestureHint.svelte'
  import LoadState from '../components/LoadState.svelte'
  import MuscleList from '../components/MuscleList.svelte'
  import SearchBar from '../components/SearchBar.svelte'
  import SelectionSheet from '../components/SelectionSheet.svelte'
  import SideActions from '../components/SideActions.svelte'
  import { app, openMuscle, selectPicked, type MuscleTab, type Selection } from '../lib/app-state.svelte'
  import { exerciseCount } from '../lib/content'
  import type { Equipment } from '../lib/content-types'
  import { highlightOf, layerFor } from '../lib/highlight-of'
  import { layout } from '../lib/layout.svelte'
  import type { Snap } from '../lib/sheet'
  import { load, save } from '../lib/storage'
  import { hasWebGL } from '../lib/webgl'
  import { restoreSkeleton, skeleton, toggleSkeleton } from '../lib/skeleton-mode.svelte'
  import { createViewer, type PickHit, type Viewer } from '../lib/viewer/viewer'

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
  let muscleTab = $state<MuscleTab>('exercises')
  let equipment = $state<Equipment | null>(null)
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
      await restoreSkeleton(v)
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

  function onPick(hit: PickHit | null) {
    selectPicked(hit)
    if (hit) dismissHint()
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
    // A new muscle starts on its exercises (or its details when it has none) with no filter; coming back
    // from one of its exercises restores where the list was left. `apply` also reruns when the viewer
    // arrives or is lost, which must not wipe the user's choice.
    if (selection.kind === 'muscle' && selection !== shown) {
      muscleTab = selection.restore?.tab ?? (exerciseCount(selection.muscle.id) ? 'exercises' : 'details')
      equipment = selection.restore?.equipment ?? null
    }
    shown = selection
    // The low snap, so the highlighted muscles stay in view; the sheet expands on demand. Coming back to
    // a muscle from one of its exercises opens at half, straight onto the list. A wide screen's side
    // panel covers no muscles, so it opens fully.
    snap = layout.wide ? 'full' : selection.kind === 'muscle' && selection.restore ? 'half' : 'peek'
    if (!selection.navigate) return
    const layer = layerFor(highlight.primary)
    if (layer) setLayer(layer === 'deep')
    // Face the most important primary muscle: a squat's quads are in front even though its glutes are behind.
    v?.focus(highlight.primary.slice(0, 1))
  }

  $effect(() => {
    if (layout.wide) snap = 'full'
  })

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
      <canvas bind:this={canvas} aria-label="Mô hình 3D cơ thể. Chạm vào cơ hoặc xương để xem thông tin." onpointerdown={blurActive}></canvas>
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
    {#if app.selection === null || snap === 'peek' || layout.wide}
      <SideActions
        {superficialHidden}
        skeleton={skeleton.state}
        lift={app.selection && !layout.wide ? sheetTop : 0}
        besidePanel={app.selection !== null && layout.wide}
        onFlip={() => viewer?.flip()}
        onTurn={() => viewer?.turn(-TURN_RADIANS)}
        onToggleLayer={() => setLayer(!superficialHidden)}
        onToggleSkeleton={() => viewer && toggleSkeleton(viewer)}
      />
    {/if}
    {#if showHint && !hintSeen && app.selection === null}
      <GestureHint />
    {/if}
  {/if}

  {#if debug && viewer}
    <DebugOverlay {viewer} />
  {/if}

  <SelectionSheet
    {shown}
    bind:snap
    bind:peekHeight={sheetTop}
    bind:muscleTab
    bind:equipment
    motionActive={!hidden && app.selection !== null && snap !== 'peek'}
  />
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
