<script lang="ts">
  import { exerciseCount, REGION_LABELS } from '../lib/content'
  import type { Muscle, MusclePart } from '../lib/content-types'
  import DraftBadge from './DraftBadge.svelte'
  import SheetTitle from './SheetTitle.svelte'

  let { muscle, part, onShowExercises }: { muscle: Muscle; part: MusclePart | null; onShowExercises?: () => void } = $props()

  const partLabel = $derived(muscle.parts.length > 1 ? part?.vi : undefined)
  const count = $derived(exerciseCount(muscle.id))
</script>

<SheetTitle title={muscle.vi} en={muscle.en}>
  {REGION_LABELS[muscle.region]}{#if partLabel}{` · đang chạm: ${partLabel}`}{/if}{#if count}{` · ${count} bài tập`}{/if}
  {#if muscle.status === 'draft'}<DraftBadge />{/if}
</SheetTitle>
{#if onShowExercises && count}
  <button class="sheet-action" onclick={onShowExercises}>Xem {count} bài tập</button>
{/if}
