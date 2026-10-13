<script lang="ts">
  import ExerciseList from '../components/ExerciseList.svelte'
  import Panel from '../components/Panel.svelte'
  import { exerciseRegion, exercises, REGION_LABELS, searchExercises } from '../lib/content'
  import type { Region } from '../lib/content-types'

  const FILTERS: Region[] = ['chest', 'back', 'shoulders', 'arms', 'core', 'glutes', 'legs']

  let { hidden }: { hidden: boolean } = $props()

  let query = $state('')
  let region = $state<Region | null>(null)
  const matches = $derived(query.trim() ? searchExercises(query) : exercises)
  const shown = $derived(region ? matches.filter((e) => exerciseRegion(e) === region) : matches)
</script>

<Panel title="Bài tập" {hidden}>
  <input
    bind:value={query}
    type="search"
    aria-label="Tìm bài tập"
    placeholder="Tìm bài tập, ví dụ: squat, đẩy ngực…"
    autocomplete="off"
    enterkeyhint="search"
  />
  <div class="filters" role="group" aria-label="Lọc theo vùng">
    <button aria-pressed={region === null} onclick={() => (region = null)}>Tất cả</button>
    {#each FILTERS as r (r)}
      <button aria-pressed={region === r} onclick={() => (region = r)}>{REGION_LABELS[r]}</button>
    {/each}
  </div>
  <ExerciseList exercises={shown} empty="Không có bài tập nào khớp. Thử từ khác hoặc chọn “Tất cả”." />
</Panel>

<style>
  input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--tap-min);
    margin-top: var(--space-2);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font: inherit;
    font-size: var(--font-md);
  }
  .filters {
    display: flex;
    gap: var(--space-2);
    margin: var(--space-3) calc(-1 * var(--space-4)) var(--space-2);
    padding: 0 var(--space-4);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .filters button {
    flex: none;
    min-height: var(--tap-min);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font-size: var(--font-sm);
  }
  .filters [aria-pressed='true'] {
    border-color: var(--color-text);
    background: var(--color-text);
    color: var(--color-surface);
  }
</style>
