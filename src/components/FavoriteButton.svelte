<script lang="ts">
  import { favorites } from '../lib/favorites.svelte'

  let { id, name }: { id: string; name: string } = $props()

  const saved = $derived(favorites.has(id))
</script>

<button
  class:saved
  aria-pressed={saved}
  aria-label={saved ? `Bỏ lưu ${name}` : `Lưu ${name} vào Yêu thích`}
  onclick={() => favorites.toggle(id)}
>
  {saved ? '★' : '☆'}
</button>

<style>
  button {
    flex: none;
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 0;
    background: none;
    font-size: var(--font-lg);
    color: var(--color-text-muted);
  }
  .saved {
    color: var(--color-accent);
  }
</style>
