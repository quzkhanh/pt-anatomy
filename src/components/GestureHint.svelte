<p class="hint" role="status">Chạm vào cơ để xem · Kéo để xoay · Chụm 2 ngón để phóng to</p>

<style>
  .hint {
    position: fixed;
    left: 50%;
    top: calc(var(--tap-min) + var(--space-6) + env(safe-area-inset-top));
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
