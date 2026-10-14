<script lang="ts">
  import { app, backToMuscle, type MuscleTab, type Selection } from '../lib/app-state.svelte'
  import { attachmentsOn } from '../lib/content'
  import type { Equipment } from '../lib/content-types'
  import type { Snap } from '../lib/sheet'
  import BoneHeader from './BoneHeader.svelte'
  import BoneInfo from './BoneInfo.svelte'
  import BottomSheet from './BottomSheet.svelte'
  import ExerciseHeader from './ExerciseHeader.svelte'
  import ExerciseInfo from './ExerciseInfo.svelte'
  import MuscleHeader from './MuscleHeader.svelte'
  import MuscleInfo from './MuscleInfo.svelte'

  interface Props {
    /** The selection on show; it outlives `app.selection` so the sheet keeps its content while closing. */
    shown: Selection | null
    snap: Snap
    peekHeight: number
    muscleTab: MuscleTab
    equipment: Equipment | null
    motionActive: boolean
  }

  let {
    shown,
    snap = $bindable(),
    peekHeight = $bindable(),
    muscleTab = $bindable(),
    equipment = $bindable(),
    motionActive,
  }: Props = $props()

  const LABELS = { muscle: 'Thông tin cơ', exercise: 'Thông tin bài tập', bone: 'Thông tin xương' }
  const key = (s: Selection) => (s.kind === 'muscle' ? `m:${s.muscle.id}` : s.kind === 'exercise' ? `e:${s.exercise.id}` : `b:${s.bone.object}`)
  const onBone = $derived(shown?.kind === 'bone' ? attachmentsOn(shown.bone.object) : null)
</script>

<BottomSheet
  open={app.selection !== null}
  bind:snap
  bind:peekHeight
  label={LABELS[shown?.kind ?? 'muscle']}
  contentKey={shown ? key(shown) : ''}
  onClose={() => (app.selection = null)}
>
  {#snippet header()}
    {#if shown?.kind === 'muscle'}
      <MuscleHeader
        muscle={shown.muscle}
        part={shown.part}
        onShowExercises={snap === 'peek'
          ? () => {
              muscleTab = 'exercises'
              snap = 'half'
            }
          : undefined}
      />
    {:else if shown?.kind === 'exercise'}
      {@const from = shown.from}
      <ExerciseHeader
        exercise={shown.exercise}
        back={from && { label: from.muscle.vi, go: () => backToMuscle(from) }}
        onShowMotion={snap === 'peek' ? () => (snap = 'half') : undefined}
      />
    {:else if shown?.kind === 'bone' && onBone}
      <BoneHeader bone={shown.bone} muscleCount={new Set([...onBone.origin, ...onBone.insertion].map((a) => a.muscle.id)).size} />
    {/if}
  {/snippet}
  {#if shown?.kind === 'muscle'}
    <MuscleInfo muscle={shown.muscle} bind:tab={muscleTab} bind:equipment />
  {:else if shown?.kind === 'exercise'}
    <ExerciseInfo exercise={shown.exercise} {motionActive} />
  {:else if onBone}
    <BoneInfo {...onBone} />
  {/if}
</BottomSheet>
