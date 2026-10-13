<script lang="ts">
  import { searchMuscles } from '../lib/content'
  import type { Muscle } from '../lib/content-types'

  let { onSelect }: { onSelect: (muscle: Muscle) => void } = $props()

  let input: HTMLInputElement
  let query = $state('')
  let focused = $state(false)
  const results = $derived(searchMuscles(query))

  function choose(muscle: Muscle) {
    query = ''
    input.blur()
    onSelect(muscle)
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      query = ''
      input.blur()
    } else if (e.key === 'Enter' && results[0]) {
      choose(results[0])
    }
  }
</script>

<div class="search" role="search">
  <input
    bind:this={input}
    bind:value={query}
    type="search"
    aria-label="Tìm cơ"
    placeholder="Tìm cơ, ví dụ: ngực, delta…"
    autocomplete="off"
    enterkeyhint="search"
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    {onkeydown}
  />
  {#if focused && query.trim()}
    <ul class="results">
      {#each results as muscle (muscle.id)}
        <li>
          <button onmousedown={(e) => e.preventDefault()} onclick={() => choose(muscle)}>
            {muscle.vi} <i lang="en">{muscle.en}</i>
          </button>
        </li>
      {:else}
        <li class="empty">Không tìm thấy cơ nào khớp “{query.trim()}”</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: fixed;
    top: calc(var(--space-3) + env(safe-area-inset-top));
    left: var(--space-3);
    right: var(--space-3);
  }
  input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--tap-min);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
    font: inherit;
    font-size: var(--font-md);
  }
  .results {
    margin: var(--space-2) 0 0;
    padding: var(--space-1) 0;
    list-style: none;
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
  }
  .results button {
    width: 100%;
    min-height: var(--tap-min);
    padding: 0 var(--space-4);
    border: 0;
    background: none;
    text-align: left;
    font-size: var(--font-md);
  }
  .results i {
    color: var(--color-text-muted);
  }
  .empty {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-sm);
  }
</style>
