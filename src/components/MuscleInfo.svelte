<script lang="ts">
  import type { MuscleTab } from '../lib/app-state.svelte'
  import type { Equipment, Muscle } from '../lib/content-types'
  import FilterChips from './FilterChips.svelte'
  import MuscleDetails from './MuscleDetails.svelte'
  import MuscleExercises from './MuscleExercises.svelte'
  import MuscleTips from './MuscleTips.svelte'

  const TAB_LABELS: Record<MuscleTab, string> = { exercises: 'Bài tập', details: 'Giải phẫu', tips: 'Mẹo PT' }

  let {
    muscle,
    tab = $bindable(),
    equipment = $bindable(),
  }: { muscle: Muscle; tab: MuscleTab; equipment: Equipment | null } = $props()

  const tabs = $derived<MuscleTab[]>(muscle.tips ? ['exercises', 'details', 'tips'] : ['exercises', 'details'])
</script>

<FilterChips options={tabs} value={tab} label={(t) => TAB_LABELS[t]} ariaLabel="Nội dung về cơ" onSelect={(t) => t && (tab = t)} />
{#if tab === 'exercises'}
  <MuscleExercises {muscle} bind:equipment />
{:else if tab === 'details'}
  <MuscleDetails {muscle} />
{:else}
  <MuscleTips {muscle} />
{/if}
