<script lang="ts">
  import { openExercise, openMuscle } from '../lib/app-state.svelte'
  import { searchExercises, searchMuscles } from '../lib/content'

  const PER_KIND = 5

  let input: HTMLInputElement
  let query = $state('')
  let focused = $state(false)
  const results = $derived([
    ...searchMuscles(query).slice(0, PER_KIND).map((m) => ({ key: `m:${m.id}`, vi: m.vi, sub: m.en, lang: 'en', open: () => openMuscle(m) })),
    ...searchExercises(query).slice(0, PER_KIND).map((e) => ({ key: `e:${e.id}`, vi: e.vi, sub: 'bài tập', lang: 'vi', open: () => openExercise(e) })),
  ])

  function choose(open: () => void) {
    query = ''
    input.blur()
    open()
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      query = ''
      input.blur()
    } else if (e.key === 'Enter' && !e.isComposing && results[0]) {
      choose(results[0].open)
    }
  }
</script>

<div class="search" role="search">
  <input
    bind:this={input}
    bind:value={query}
    type="search"
    aria-label="Tìm cơ hoặc bài tập"
    placeholder="Tìm cơ hoặc bài tập: ngực, squat…"
    autocomplete="off"
    enterkeyhint="search"
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    {onkeydown}
  />
  {#if focused && query.trim()}
    <ul class="results">
      {#each results as result (result.key)}
        <li>
          <button onmousedown={(e) => e.preventDefault()} onclick={() => choose(result.open)}>
            {result.vi} <i lang={result.lang}>{result.sub}</i>
          </button>
        </li>
      {:else}
        <li class="empty">Không tìm thấy cơ hay bài tập nào khớp “{query.trim()}”</li>
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
    z-index: var(--z-search);
  }
  :global(.wide) .search {
    right: auto;
    width: var(--panel-width);
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
    max-height: 60dvh;
    overflow-y: auto;
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
