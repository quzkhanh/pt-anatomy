<script lang="ts">
  import { openExercise } from '../lib/app-state.svelte'
  import { exercisesFor, REGION_LABELS } from '../lib/content'
  import type { Exercise, Muscle, MusclePart } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'
  import SourceList from './SourceList.svelte'

  let { muscle, part }: { muscle: Muscle; part: MusclePart | null } = $props()

  const partLabel = $derived(muscle.parts.length > 1 ? part?.vi : undefined)
  const related = $derived(exercisesFor(muscle.id))
</script>

{#snippet links(title: string, list: Exercise[])}
  {#if list.length}
    <h3>{title}</h3>
    <ul>
      {#each list as exercise (exercise.id)}
        <li><button onclick={() => openExercise(exercise)}>{exercise.vi}</button></li>
      {/each}
    </ul>
  {/if}
{/snippet}

<h2 class="name">{muscle.vi} — <i lang="en">{muscle.en}</i></h2>
<p class="meta">
  {REGION_LABELS[muscle.region]}{#if partLabel}{` · đang chạm: ${partLabel}`}{/if}
  {#if muscle.status === 'draft'}<DraftBadge />{/if}
</p>
<p class="text">{muscle.function}</p>
{@render links('Bài tập chính cho cơ này', related.primary)}
{@render links('Cơ này hỗ trợ trong', related.secondary)}
{#if !related.primary.length && !related.secondary.length}
  <p class="text muted">Chưa có bài tập nào trong app có nguồn nêu rõ cơ này.</p>
{/if}
<SourceList sources={muscle.sources ?? []} />

<style>
  .name {
    margin: 0;
    font-size: var(--font-lg);
    line-height: var(--line-tight);
  }
  .name i {
    font-weight: 400;
    color: var(--color-text-muted);
  }
  .meta {
    margin: var(--space-1) 0 var(--space-3);
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  .text {
    margin: 0;
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
  .muted {
    margin-top: var(--space-3);
    color: var(--color-text-muted);
  }
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li button {
    width: 100%;
    min-height: var(--tap-min);
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--color-border);
    background: none;
    text-align: left;
    font-size: var(--font-md);
    color: var(--color-accent);
  }
</style>
