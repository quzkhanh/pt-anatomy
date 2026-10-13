<script lang="ts">
  import type { Source } from '../lib/content-types'

  let { sources }: { sources: Source[] } = $props()
</script>

<details>
  <summary>Nguồn ({sources.length})</summary>
  <ul>
    {#each sources as source (source.url)}
      <li><a href={source.url} target="_blank" rel="noopener">{source.title}</a></li>
    {/each}
  </ul>
</details>

<style>
  details {
    margin-top: var(--space-4);
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  summary {
    min-height: var(--tap-min);
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  ul {
    margin: 0;
    padding-left: var(--space-4);
  }
  li {
    margin-bottom: var(--space-2);
    overflow-wrap: anywhere;
  }
</style>
