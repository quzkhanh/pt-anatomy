<script lang="ts">
  import type { SkeletonBone } from '../lib/content-types'
  import SheetTitle from './SheetTitle.svelte'

  let { bone, muscleCount }: { bone: SkeletonBone; muscleCount: number } = $props()
</script>

<SheetTitle title={bone.vi} en={bone.object}>
  {muscleCount ? `${muscleCount} cơ trong app bám vào xương này` : 'Chưa có cơ nào trong app bám vào xương này'}
</SheetTitle>
