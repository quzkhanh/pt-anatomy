<script lang="ts">
  interface Props {
    superficialHidden: boolean
    onFlip: () => void
    onToggleLayer: () => void
  }

  let { superficialHidden, onFlip, onToggleLayer }: Props = $props()
</script>

<div class="actions">
  <button onclick={onFlip}>Trước / Sau</button>
  <button onclick={onToggleLayer}>{superficialHidden ? 'Hiện lớp nông' : 'Ẩn lớp nông'}</button>
</div>

<style>
  .actions {
    position: fixed;
    right: var(--space-3);
    bottom: calc(var(--sheet-peek) + var(--space-3) + env(safe-area-inset-bottom));
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
