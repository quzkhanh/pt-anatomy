<script lang="ts">
  import { openExercise } from '../lib/app-state.svelte'
  import { EQUIPMENT_LABELS, refLabel, resolveRef } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import FavoriteButton from './FavoriteButton.svelte'

  let { exercise }: { exercise: Exercise } = $props()

  const primary = $derived(exercise.primary.flatMap((ref) => resolveRef(ref) ?? []).map(refLabel).join(', '))
</script>

<li>
  <button class="open" onclick={() => openExercise(exercise)}>
    <span class="name">{exercise.vi}</span>
    <span class="meta">{EQUIPMENT_LABELS[exercise.equipment]} · {primary}</span>
  </button>
  <FavoriteButton id={exercise.id} name={exercise.vi} />
</li>

<style>
  li {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
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
  }
  .meta {
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
</style>
