<script lang="ts">
  import type { Snippet } from 'svelte'

  let { title, en, children }: { title: string; en: string; children: Snippet } = $props()
</script>

<h2>{title} <i lang="en">{en}</i></h2>
<p class="meta">{@render children()}</p>

<style>
  h2 {
    margin: 0;
    font-size: var(--font-lg);
    line-height: var(--line-tight);
  }
  i {
    display: block;
    font-size: var(--font-sm);
    font-weight: 400;
    color: var(--color-text-muted);
  }
  .meta {
    margin: var(--space-1) 0 0;
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
</style>
