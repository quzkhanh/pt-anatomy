<script lang="ts">
  import MotionPlayer from '../components/MotionPlayer.svelte'
  import { exerciseById } from '../lib/content'
  import type { View } from '../lib/motion/player'

  // Review and screenshot aid: ?motion=<exercise-id>&t=<0..1>&view=front|angle|side|back
  const params = new URLSearchParams(location.search)
  const exercise = exerciseById(params.get('motion') ?? '')
  const t = params.get('t')
  const still = t === null ? undefined : { t: Number(t) || 0, view: (params.get('view') ?? 'angle') as View }
</script>

<main>
  {#if exercise}
    <h1>{exercise.vi}</h1>
    <MotionPlayer {exercise} {still} />
  {:else}
    <p>Không có bài tập "{params.get('motion')}".</p>
  {/if}
</main>

<style>
  main {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-3);
  }
  h1 {
    margin: 0;
    font-size: var(--font-md);
  }
</style>
