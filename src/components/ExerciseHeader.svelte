<script lang="ts">
  import { EQUIPMENT_LABELS, refLabel, resolveRef } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'
  import FavoriteButton from './FavoriteButton.svelte'

  /** `onShowMotion` is given while the sheet is collapsed: it opens the sheet to the motion player. */
  let { exercise, onShowMotion }: { exercise: Exercise; onShowMotion?: () => void } = $props()

  const primary = $derived(exercise.primary.flatMap((ref) => resolveRef(ref) ?? []).map(refLabel).join(', '))
</script>

<div class="row">
  <h2>{exercise.vi}</h2>
  <FavoriteButton id={exercise.id} name={exercise.vi} />
</div>
<p class="meta">
  {EQUIPMENT_LABELS[exercise.equipment]} · <span class="dot" aria-hidden="true"></span>{primary}
  {#if exercise.status === 'draft'}<DraftBadge />{/if}
</p>
{#if onShowMotion}
  <button class="show" onclick={onShowMotion}>▶ Xem động tác</button>
{/if}

<style>
  .row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-1);
  }
  h2 {
    flex: 1;
    margin: 0;
    padding-top: var(--space-2);
    font-size: var(--font-lg);
    line-height: var(--line-tight);
  }
  .meta {
    margin: 0;
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  .show {
    min-height: var(--tap-min);
    margin-top: var(--space-2);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-text);
    color: var(--color-surface);
    font-size: var(--font-sm);
    font-weight: 600;
  }
  .dot {
    display: inline-block;
    width: var(--space-2);
    height: var(--space-2);
    margin-right: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--color-selected);
  }
</style>
