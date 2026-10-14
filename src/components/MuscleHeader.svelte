<script lang="ts">
  import { exerciseCount, REGION_LABELS } from '../lib/content'
  import type { Muscle, MusclePart } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'

  let { muscle, part }: { muscle: Muscle; part: MusclePart | null } = $props()

  const partLabel = $derived(muscle.parts.length > 1 ? part?.vi : undefined)
  const count = $derived(exerciseCount(muscle.id))
</script>

<h2>{muscle.vi} <i lang="en">{muscle.en}</i></h2>
<p class="meta">
  {REGION_LABELS[muscle.region]}{#if partLabel}{` · đang chạm: ${partLabel}`}{/if}{#if count}{` · ${count} bài tập`}{/if}
  {#if muscle.status === 'draft'}<DraftBadge />{/if}
</p>

<style>
  h2 {
    margin: 0;
    font-size: var(--font-lg);
    line-height: var(--line-tight);
  }
  i {
    display: block;
    font-size: var(--font-sm);
    font-weight: 400;
    color: var(--color-text-muted);
  }
  .meta {
    margin: var(--space-1) 0 0;
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
</style>
