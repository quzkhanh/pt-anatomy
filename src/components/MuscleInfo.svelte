<script lang="ts">
  import { REGION_LABELS } from '../lib/content'
  import type { Muscle, MusclePart } from '../lib/content-types'

  let { muscle, part }: { muscle: Muscle; part: MusclePart | null } = $props()

  const partLabel = $derived(muscle.parts.length > 1 ? part?.vi : undefined)
</script>

<h2 class="name">{muscle.vi} — <i lang="en">{muscle.en}</i></h2>
<p class="meta">
  {REGION_LABELS[muscle.region]}{#if partLabel} · đang chạm: {partLabel}{/if}
  {#if muscle.status === 'draft'}<span class="badge">nháp</span>{/if}
</p>
{#if muscle.function}
  <p class="text">{muscle.function}</p>
{:else}
  <p class="text muted">Chức năng và bài tập cho cơ này đang được soạn.</p>
{/if}

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
  .badge {
    margin-left: var(--space-2);
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-surface-muted);
    font-size: var(--font-xs);
  }
  .text {
    margin: 0;
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
  .muted {
    color: var(--color-text-muted);
  }
</style>
