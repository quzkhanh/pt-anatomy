<script lang="ts">
  import { untrack, type Snippet } from 'svelte'
  import { createSheetDrag, type Snap } from '../lib/sheet'

  interface Props {
    open: boolean
    snap?: Snap
    label: string
    /** Height of the always-visible top (grip + header), for placing things above the sheet. */
    peekHeight?: number
    /** Changing it scrolls the content back to the top (new muscle or exercise). */
    contentKey: string
    header: Snippet
    children: Snippet
    onClose: () => void
  }

  let { open, snap = $bindable('peek'), label, peekHeight = $bindable(0), contentKey, header, children, onClose }: Props = $props()

  const HALF_FRACTION = 0.55
  const HIDDEN_EXTRA_PX = 24

  let sheetHeight = $state(0)
  let viewportHeight = $state(0)
  let topHeight = $state(0)
  let dragOffset = $state<number | null>(null)
  let content = $state<HTMLDivElement>()

  const offsets = $derived<Record<Snap, number>>({
    full: 0,
    half: Math.max(0, sheetHeight - viewportHeight * HALF_FRACTION),
    peek: Math.max(0, sheetHeight - topHeight),
  })
  const offset = $derived(open ? (dragOffset ?? offsets[snap]) : sheetHeight + HIDDEN_EXTRA_PX)

  $effect(() => {
    peekHeight = topHeight
  })

  $effect(() => {
    void contentKey
    untrack(() => content?.scrollTo(0, 0))
  })

  $effect(() => {
    if (snap === 'peek') content?.scrollTo(0, 0)
  })

  const drag = createSheetDrag(
    () => ({ snap, offsets }),
    (o) => (dragOffset = o),
    (next) => (snap = next),
  )

  // Content scrolls natively at half and full height; at peek, dragging anywhere moves the sheet.
  function begin(e: PointerEvent, fromContent: boolean) {
    if (fromContent && snap !== 'peek') return
    if ((e.target as Element).closest('[data-no-sheet-drag]')) return
    drag.begin(e)
  }

  // Capturing only once the drag starts keeps taps on buttons and links inside working.
  const move = (e: PointerEvent) => drag.move(e) && (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

  const toggle = () => (snap = snap === 'peek' ? 'half' : 'peek')
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<section
  class="sheet"
  class:dragging={dragOffset !== null}
  aria-label={label}
  aria-hidden={open ? 'false' : 'true'}
  inert={!open}
  bind:clientHeight={sheetHeight}
  style:transform={sheetHeight ? `translateY(${offset}px)` : 'translateY(100%)'}
>
  <!-- Dragging is a pointer shortcut; keyboard and screen reader users have the grip button. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="top"
    bind:clientHeight={topHeight}
    onpointerdown={(e) => begin(e, false)}
    onpointermove={move}
    onpointerup={drag.end}
    onpointercancel={drag.cancel}
    onlostpointercapture={drag.cancel}
  >
    <button class="grip" aria-label={snap === 'peek' ? 'Mở rộng' : 'Thu gọn'} aria-expanded={snap !== 'peek'} onclick={toggle}>
      <span class="handle"></span>
    </button>
    <div class="header">
      <div class="title">{@render header()}</div>
      <button class="close" aria-label="Đóng" onclick={onClose}>✕</button>
    </div>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="content"
    class:scroll={snap !== 'peek'}
    bind:this={content}
    style:padding-bottom={snap === 'half' ? `calc(var(--space-6) + ${offsets.half}px)` : null}
    onpointerdown={(e) => begin(e, true)}
    onpointermove={move}
    onpointerup={drag.end}
    onpointercancel={drag.cancel}
    onlostpointercapture={drag.cancel}
  >
    {@render children()}
  </div>
</section>

<style>
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: var(--bottom-ui);
    height: calc(92dvh - var(--bottom-ui));
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
  .top {
    flex: none;
    touch-action: none;
  }
  .grip {
    display: grid;
    place-items: center;
    width: 100%;
    min-height: var(--tap-min);
    border: 0;
    background: none;
    cursor: grab;
  }
  .handle {
    width: 2.25rem;
    height: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--color-handle);
  }
  .header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: 0 var(--space-2) var(--space-3) var(--space-4);
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .close {
    flex: none;
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-surface-muted);
    color: var(--color-text-muted);
    font-size: var(--font-md);
  }
  .content {
    flex: 1;
    overflow: hidden;
    padding: 0 var(--space-4) var(--space-6);
    touch-action: none;
  }
  .scroll {
    overflow-y: auto;
    touch-action: pan-y;
    overscroll-behavior: contain;
  }
</style>
