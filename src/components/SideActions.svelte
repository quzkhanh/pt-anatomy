<script lang="ts">
  interface Props {
    superficialHidden: boolean
    /** Height of the open sheet's top, so the buttons sit just above it. */
    lift: number
    onFlip: () => void
    onTurn: () => void
    onToggleLayer: () => void
  }

  let { superficialHidden, lift, onFlip, onTurn, onToggleLayer }: Props = $props()
</script>

<div class="actions" style:--lift="{lift}px">
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
