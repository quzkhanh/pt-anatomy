<script lang="ts">
  import { openExercise } from '../lib/app-state.svelte'
  import { EQUIPMENT_LABELS, exerciseRegion, REGION_LABELS, refLabel, resolveRef } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import FavoriteButton from './FavoriteButton.svelte'

  let { exercise, onOpen = openExercise }: { exercise: Exercise; onOpen?: (exercise: Exercise) => void } = $props()

  const primary = $derived(exercise.primary.flatMap((ref) => resolveRef(ref) ?? []).map(refLabel).join(', '))
</script>

<li>
  <button class="open" onclick={() => onOpen(exercise)}>
    <span class="name">{exercise.vi}</span>
    <span class="meta"><span class="tag">{REGION_LABELS[exerciseRegion(exercise)]}</span>{EQUIPMENT_LABELS[exercise.equipment]} · {primary}</span>
  </button>
  <FavoriteButton id={exercise.id} name={exercise.vi} />
</li>

<style>
  li {
    display: flex;
    align-items: center;
  }
  li:not(:first-child) {
    border-top: 1px solid var(--color-border);
  }
  .open {
    flex: 1;
    display: grid;
    gap: var(--space-1);
    min-height: var(--tap-min);
    padding: var(--space-2) 0;
    border: 0;
    background: none;
    text-align: left;
  }
  .name {
    font-size: var(--font-md);
    font-weight: 600;
  }
  .tag {
    margin-right: var(--space-2);
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-surface-muted);
    font-size: var(--font-xs);
    color: var(--color-text-muted);
  }
  .meta {
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
</style>
