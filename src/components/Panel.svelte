<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    hidden?: boolean
    onClose?: () => void
    children: Snippet
  }

  let { title, hidden = false, onClose, children }: Props = $props()
</script>

<!-- Hidden with visibility (not unmounted) so search text, filter and scroll survive tab switches. -->
<section class="panel" class:overlay={onClose} aria-label={title} style:visibility={hidden ? 'hidden' : null} inert={hidden}>
  <header>
    <h1>{title}</h1>
    {#if onClose}<button onclick={onClose}>Đóng</button>{/if}
  </header>
  {@render children()}
</section>

<style>
  .panel {
    position: fixed;
    inset: 0 0 var(--bottom-ui);
    z-index: var(--z-panel);
    overflow-y: auto;
    padding: env(safe-area-inset-top) var(--space-4) var(--space-6);
    background: var(--color-bg);
  }
  .overlay {
    bottom: 0;
    z-index: var(--z-overlay);
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--tap-min);
    padding-top: var(--space-2);
  }
  h1 {
    margin: 0;
    font-size: var(--font-lg);
  }
  button {
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border: 0;
    background: none;
    color: var(--color-accent);
  }
</style>
