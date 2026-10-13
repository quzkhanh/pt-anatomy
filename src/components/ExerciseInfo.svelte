<script lang="ts">
  import { EQUIPMENT_LABELS, videoSearchUrl } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'
  import FavoriteButton from './FavoriteButton.svelte'
  import RefGroup from './RefGroup.svelte'
  import SourceList from './SourceList.svelte'

  let { exercise }: { exercise: Exercise } = $props()
</script>

<div class="title">
  <h2 class="name">{exercise.vi}</h2>
  <FavoriteButton id={exercise.id} name={exercise.vi} />
</div>
<p class="meta">
  <i lang="en">{exercise.en}</i> · {EQUIPMENT_LABELS[exercise.equipment]}
  {#if exercise.status === 'draft'}<DraftBadge />{/if}
</p>
<RefGroup label="Cơ chính" refs={exercise.primary} tone="primary" />
<RefGroup label="Cơ phụ" refs={exercise.secondary} tone="secondary" />
<h3>Lưu ý kỹ thuật</h3>
<ul class="cues">
  {#each exercise.cues as cue (cue)}
    <li>{cue}</li>
  {/each}
</ul>
<a class="video" href={videoSearchUrl(exercise)} target="_blank" rel="noopener">Tìm video hướng dẫn trên YouTube ↗</a>
<SourceList sources={exercise.sources} />

<style>
  .title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .name {
    margin: 0;
    padding-top: var(--space-2);
    font-size: var(--font-lg);
    line-height: var(--line-tight);
  }
  .meta {
    margin: 0 0 var(--space-2);
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  .cues {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
  .video {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-min);
    margin-top: var(--space-2);
    font-size: var(--font-md);
  }
</style>
