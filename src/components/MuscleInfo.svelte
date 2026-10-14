<script lang="ts">
  import type { MuscleTab } from '../lib/app-state.svelte'
  import type { Equipment, Muscle } from '../lib/content-types'
  import FilterChips from './FilterChips.svelte'
  import MuscleDetails from './MuscleDetails.svelte'
  import MuscleExercises from './MuscleExercises.svelte'

  const TABS: MuscleTab[] = ['exercises', 'details']
  const TAB_LABELS: Record<MuscleTab, string> = { exercises: 'Bài tập', details: 'Thông tin' }

  let {
    muscle,
    tab = $bindable(),
    equipment = $bindable(),
  }: { muscle: Muscle; tab: MuscleTab; equipment: Equipment | null } = $props()
</script>

<FilterChips options={TABS} value={tab} label={(t) => TAB_LABELS[t]} ariaLabel="Nội dung về cơ" onSelect={(t) => t && (tab = t)} />
{#if tab === 'exercises'}
  <MuscleExercises {muscle} bind:equipment />
{:else}
  <MuscleDetails {muscle} />
{/if}
