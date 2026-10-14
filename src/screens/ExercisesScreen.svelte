<script lang="ts">
  import CreditsLink from '../components/CreditsLink.svelte'
  import ExerciseList from '../components/ExerciseList.svelte'
  import FilterChips from '../components/FilterChips.svelte'
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
  <FilterChips options={FILTERS} value={region} label={(r) => REGION_LABELS[r]} allLabel="Tất cả" ariaLabel="Lọc theo vùng" onSelect={(r) => (region = r)} />
  <ExerciseList exercises={shown} empty="Không có bài tập nào khớp. Thử từ khác hoặc chọn “Tất cả”." />
  <CreditsLink />
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
</style>
