<script lang="ts">
  import type { Exercise } from '../lib/content-types'
  import CreditsLink from './CreditsLink.svelte'
  import ExerciseRow from './ExerciseRow.svelte'

  let { exercises, empty }: { exercises: Exercise[]; empty: string } = $props()
</script>

{#if exercises.length}
  <ul>
    {#each exercises as exercise (exercise.id)}
      <ExerciseRow {exercise} />
    {/each}
  </ul>
{:else}
  <p class="empty">{empty}</p>
{/if}
<CreditsLink />

<style>
  ul {
    margin: 0;
    padding: 0 var(--space-2) 0 var(--space-4);
    list-style: none;
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
  }
  .empty {
    margin: var(--space-6) 0;
    text-align: center;
    color: var(--color-text-muted);
  }
</style>
