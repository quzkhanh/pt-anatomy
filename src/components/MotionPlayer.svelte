<script lang="ts">
  import { onMount } from 'svelte'
  import { refLabel, resolveRef } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import { phaseLabel } from '../lib/motion/breath'
  import { MOTIONS } from '../lib/motion/library'
  import { unshownRefs } from '../lib/motion/mannequin'
  import { createMotionPlayer, VIEWS, type MotionPlayer, type View } from '../lib/motion/player'

  const VIEW_LABELS: Record<View, string> = { front: 'Trước', angle: 'Chéo', side: 'Bên', back: 'Sau' }
  const SPEEDS = [1, 0.5]

  interface Props {
    exercise: Exercise
    /** False while the sheet is collapsed or the body tab is hidden: the loop must not run behind them. */
    active?: boolean
    /** Freeze at a cycle position and view (screenshots, review). */
    still?: { t: number; view: View }
  }

  let { exercise, active = true, still }: Props = $props()

  let canvas = $state<HTMLCanvasElement>()
  let player = $state.raw<MotionPlayer | null>(null)
  let failed = $state(false)
  let playing = $state(true)
  let speed = $state(SPEEDS[0])
  let phase = $state('')
  let intersecting = $state(false)
  let docVisible = $state(document.visibilityState === 'visible')
  const build = $derived(MOTIONS[exercise.id])
  const deep = $derived(
    [...exercise.primary, ...exercise.secondary]
      .filter((r) => unshownRefs([r]).length)
      .flatMap((r) => resolveRef(r) ?? [])
      .map(refLabel),
  )

  $effect(() => {
    if (!player || !build) return
    player.setMotion(build(), { primary: exercise.primary, secondary: exercise.secondary })
    if (still) {
      player.setPlaying(false)
      player.setView(still.view)
      player.seek(still.t)
    }
  })

  $effect(() => {
    player?.setVisible(active && intersecting && docVisible)
  })

  onMount(() => {
    if (!build) return
    let created: MotionPlayer
    try {
      created = player = createMotionPlayer(canvas!, (p) => (phase = p))
      if (new URLSearchParams(location.search).has('debug')) window.__ptMotion = player
    } catch (error) {
      console.error(error)
      failed = true
      return
    }
    const io = new IntersectionObserver(([entry]) => (intersecting = entry.isIntersecting))
    io.observe(canvas!)
    const onVisibility = () => (docVisible = document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      created.dispose()
      if (window.__ptMotion === created) delete window.__ptMotion
      player = null
    }
  })

  function togglePlay() {
    playing = !playing
    player?.setPlaying(playing)
  }

  function cycleSpeed() {
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    player?.setSpeed(speed)
  }
</script>

{#if build && !failed}
  <figure class="player">
    <div class="controls">
      <button aria-label={playing ? 'Tạm dừng' : 'Phát'} onclick={togglePlay}>{playing ? '❚❚' : '▶'}</button>
      <button aria-label="Tốc độ {speed}×" onclick={cycleSpeed}>{speed}×</button>
      <span class="views" role="group" aria-label="Góc nhìn">
        {#each Object.keys(VIEWS) as View[] as view (view)}
          <button onclick={() => player?.setView(view)}>{VIEW_LABELS[view]}</button>
        {/each}
      </span>
    </div>
    <canvas bind:this={canvas} data-no-sheet-drag aria-label="Ma-nơ-canh 3D làm động tác {exercise.vi}. Kéo để xoay."></canvas>
    {#if phase}<figcaption class="phase">{phaseLabel(phase)}</figcaption>{/if}
  </figure>
  {#if deep.length}
    <p class="deep">Cơ sâu, không vẽ trên ma-nơ-canh (xem trên mô hình): {deep.join(', ')}</p>
  {/if}
{:else if failed}
  <p class="deep">Máy này không hiển thị được hình động tác 3D.</p>
{/if}

<style>
  .player {
    position: relative;
    margin: var(--space-3) 0 0;
    border-radius: var(--radius-card);
    overflow: hidden;
    background: var(--color-bg);
  }
  canvas {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    touch-action: pan-y;
  }
  /* Just below the controls row: one row of tap-height buttons plus its padding. */
  .phase {
    position: absolute;
    top: calc(var(--tap-min) + 3 * var(--space-2));
    left: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
    font-size: var(--font-sm);
    font-weight: 600;
  }
  /* Above the canvas and on one row: below it they hid behind the tab bar at half height, and over it
     they covered the mannequin. Compact padding keeps the row within a 360 px phone. */
  .controls {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2);
  }
  .views {
    display: flex;
    gap: var(--space-1);
    margin-left: auto;
  }
  button {
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    padding: 0 var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font-size: var(--font-sm);
  }
  .deep {
    margin: var(--space-2) 0 0;
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
</style>
