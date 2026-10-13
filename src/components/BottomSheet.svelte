<script lang="ts" module>
  export type Snap = 'peek' | 'half' | 'full'
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    snap?: Snap
    label: string
    children: Snippet
  }

  let { open, snap = $bindable('peek'), label, children }: Props = $props()

  const HALF_FRACTION = 0.5
  const HIDDEN_EXTRA_PX = 24
  const FLICK_PX_PER_MS = 0.5
  const TAP_SLOP_PX = 6
  const ORDER: Snap[] = ['peek', 'half', 'full']

  let sheetHeight = $state(0)
  let viewportHeight = $state(0)
  let dragOffset = $state<number | null>(null)
  let drag = { startY: 0, startOffset: 0, lastY: 0, lastT: 0, velocity: 0, moved: false }

  const peekPx = $derived(
    viewportHeight &&
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-peek')) *
        parseFloat(getComputedStyle(document.documentElement).fontSize),
  )
  const offsets = $derived<Record<Snap, number>>({
    full: 0,
    half: Math.max(0, sheetHeight - viewportHeight * HALF_FRACTION),
    peek: Math.max(0, sheetHeight - peekPx),
  })
  const offset = $derived(open ? (dragOffset ?? offsets[snap]) : sheetHeight + HIDDEN_EXTRA_PX)

  const cycle = () => (snap = ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length])

  function onpointerdown(e: PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag = { startY: e.clientY, startOffset: offsets[snap], lastY: e.clientY, lastT: e.timeStamp, velocity: 0, moved: false }
    dragOffset = drag.startOffset
  }

  function onpointermove(e: PointerEvent) {
    if (dragOffset === null) return
    const dy = e.clientY - drag.startY
    if (Math.abs(dy) > TAP_SLOP_PX) drag.moved = true
    drag.velocity = (e.clientY - drag.lastY) / Math.max(1, e.timeStamp - drag.lastT)
    drag.lastY = e.clientY
    drag.lastT = e.timeStamp
    dragOffset = Math.min(offsets.peek, Math.max(0, drag.startOffset + dy))
  }

  const onpointercancel = () => (dragOffset = null)

  function onpointerup() {
    if (dragOffset === null) return
    const current = dragOffset
    dragOffset = null
    if (!drag.moved) return cycle()
    if (Math.abs(drag.velocity) > FLICK_PX_PER_MS) {
      const next = ORDER.indexOf(snap) + (drag.velocity < 0 ? 1 : -1)
      snap = ORDER[Math.min(ORDER.length - 1, Math.max(0, next))]
      return
    }
    snap = ORDER.reduce((best, s) => (Math.abs(offsets[s] - current) < Math.abs(offsets[best] - current) ? s : best))
  }
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<section
  class="sheet"
  class:dragging={dragOffset !== null}
  aria-label={label}
  aria-hidden={open ? 'false' : 'true'}
  inert={!open}
  bind:clientHeight={sheetHeight}
  style:transform="translateY({offset}px)"
>
  <button
    class="grip"
    aria-label="Kéo hoặc chạm để mở rộng, thu gọn"
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    {onpointercancel}
    onclick={(e) => e.detail === 0 && cycle()}
  >
    <span class="handle"></span>
  </button>
  <div class="content" class:scroll={snap === 'full'}>
    {@render children()}
  </div>
</section>

<style>
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 88dvh;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    box-shadow: var(--shadow-sheet);
    z-index: var(--z-sheet);
    transition: transform var(--duration-ui) var(--ease-ui);
    will-change: transform;
  }
  .dragging {
    transition: none;
  }
  .grip {
    flex: none;
    min-height: var(--tap-min);
    display: grid;
    place-items: center;
    background: none;
    border: 0;
    touch-action: none;
    cursor: grab;
  }
  .handle {
    width: 2.25rem;
    height: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--color-handle);
  }
  .content {
    flex: 1;
    overflow: hidden;
    padding: 0 var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
  }
  .scroll {
    overflow-y: auto;
  }
</style>
