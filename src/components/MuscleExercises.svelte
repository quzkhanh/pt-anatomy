<script lang="ts">
  import { openExercise } from '../lib/app-state.svelte'
  import { EQUIPMENT_LABELS, equipmentIn, exercisesFor } from '../lib/content'
  import type { Equipment, Exercise, Muscle } from '../lib/content-types'
  import ExerciseList from './ExerciseList.svelte'
  import FilterChips from './FilterChips.svelte'

  let { muscle, equipment = $bindable() }: { muscle: Muscle; equipment: Equipment | null } = $props()

  const related = $derived(exercisesFor(muscle.id))
  const options = $derived(equipmentIn([...related.primary, ...related.secondary]))
  const only = (list: Exercise[]) => (equipment ? list.filter((e) => e.equipment === equipment) : list)
  const groups = $derived([
    { title: 'Bài tập chính cho cơ này', list: only(related.primary) },
    { title: 'Cơ này hỗ trợ trong', list: only(related.secondary) },
  ])

  const open = (exercise: Exercise) => openExercise(exercise, { muscle, tab: 'exercises', equipment })
</script>

{#if options.length > 1}
  <FilterChips
    {options}
    value={equipment}
    label={(e) => EQUIPMENT_LABELS[e]}
    allLabel="Tất cả"
    ariaLabel="Lọc theo dụng cụ"
    onSelect={(e) => (equipment = e)}
  />
{/if}
{#each groups as group (group.title)}
  {#if group.list.length}
    <h3>{group.title}</h3>
    <ExerciseList exercises={group.list} onOpen={open} />
  {/if}
{/each}
{#if !options.length}
  <p class="empty">Chưa có bài tập có nguồn cho cơ này.</p>
{/if}

<style>
  h3 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: var(--font-sm);
  }
  .empty {
    margin: var(--space-3) 0 0;
    color: var(--color-text-muted);
  }
</style>
