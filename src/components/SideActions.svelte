<script lang="ts">
  import type { SkeletonState } from '../lib/skeleton-mode.svelte'

  interface Props {
    superficialHidden: boolean
    skeleton: SkeletonState
    /** Height of the open sheet's top, so the buttons sit just above it. */
    lift: number
    /** The wide-screen side panel is open: sit to its left. */
    besidePanel: boolean
    onFlip: () => void
    onTurn: () => void
    onToggleLayer: () => void
    onToggleSkeleton: () => void
  }

  let { superficialHidden, skeleton, lift, besidePanel, onFlip, onTurn, onToggleLayer, onToggleSkeleton }: Props = $props()

  const SKELETON_LABELS: Record<SkeletonState, string> = {
    off: 'Hiện xương',
    loading: 'Đang tải xương…',
    on: 'Ẩn xương',
    error: 'Tải xương lỗi · Thử lại',
  }
</script>

<div class="actions" class:beside={besidePanel} style:--lift="{lift}px">
  <button onclick={onTurn}>Xoay 90°</button>
  <button onclick={onFlip}>Trước / Sau</button>
  <!-- Skeleton mode hides every muscle but the selected ones, so the layer switch would do nothing there. -->
  {#if skeleton !== 'on'}
    <button onclick={onToggleLayer}>{superficialHidden ? 'Hiện lớp nông' : 'Ẩn lớp nông'}</button>
  {/if}
  <button onclick={onToggleSkeleton} disabled={skeleton === 'loading'} aria-pressed={skeleton === 'on'}>
    {SKELETON_LABELS[skeleton]}
  </button>
</div>

<style>
  .actions {
    position: fixed;
    right: var(--space-3);
    bottom: calc(var(--bottom-ui) + var(--lift) + var(--space-3));
    z-index: var(--z-actions);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .beside {
    right: calc(var(--panel-width) + var(--space-3));
  }
  button {
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
    font-size: var(--font-sm);
  }
</style>
