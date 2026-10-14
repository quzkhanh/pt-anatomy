<script lang="ts">
  interface Props {
    superficialHidden: boolean
    /** Height of the open sheet's top, so the buttons sit just above it. */
    lift: number
    /** The wide-screen side panel is open: sit to its left. */
    besidePanel: boolean
    onFlip: () => void
    onTurn: () => void
    onToggleLayer: () => void
  }

  let { superficialHidden, lift, besidePanel, onFlip, onTurn, onToggleLayer }: Props = $props()
</script>

<div class="actions" class:beside={besidePanel} style:--lift="{lift}px">
  <button onclick={onTurn}>Xoay 90°</button>
  <button onclick={onFlip}>Trước / Sau</button>
  <button onclick={onToggleLayer}>{superficialHidden ? 'Hiện lớp nông' : 'Ẩn lớp nông'}</button>
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
