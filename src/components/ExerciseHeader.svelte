<script lang="ts">
  import { EQUIPMENT_LABELS, refLabel, resolveRef } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'
  import FavoriteButton from './FavoriteButton.svelte'

  /** `onShowMotion` is given while the sheet is collapsed: it opens the sheet to the motion player. */
  let {
    exercise,
    onShowMotion,
    back,
  }: { exercise: Exercise; onShowMotion?: () => void; back?: { label: string; go: () => void } } = $props()

  const primary = $derived(exercise.primary.flatMap((ref) => resolveRef(ref) ?? []).map(refLabel).join(', '))
</script>

{#if back}
  <button class="back" onclick={back.go}>‹ {back.label}</button>
{/if}
<div class="row">
  <h2>{exercise.vi}</h2>
  <FavoriteButton id={exercise.id} name={exercise.vi} />
</div>
<p class="meta">
  {EQUIPMENT_LABELS[exercise.equipment]} · <span class="dot" aria-hidden="true"></span>{primary}
  {#if exercise.status === 'draft'}<DraftBadge />{/if}
</p>
{#if onShowMotion}
  <button class="sheet-action" onclick={onShowMotion}>▶ Xem động tác</button>
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
  .back {
    min-height: var(--tap-min);
    padding: 0;
    border: 0;
    background: none;
    font-size: var(--font-sm);
    color: var(--color-accent);
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
