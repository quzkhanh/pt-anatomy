<script lang="ts">
  import { videoSearchUrl } from '../lib/content'
  import type { Exercise } from '../lib/content-types'
  import BreathingNote from './BreathingNote.svelte'
  import MotionPlayer from './MotionPlayer.svelte'
  import RefGroup from './RefGroup.svelte'
  import SourceList from './SourceList.svelte'

  /** `motionActive`: the sheet is open past peek on a visible tab, so the motion may play. */
  let { exercise, motionActive }: { exercise: Exercise; motionActive: boolean } = $props()
</script>

<MotionPlayer {exercise} active={motionActive} />
<RefGroup label="Cơ chính" refs={exercise.primary} tone="primary" />
<RefGroup label="Cơ phụ" refs={exercise.secondary} tone="secondary" />
<h3>Lưu ý kỹ thuật</h3>
<ul class="cues">
  {#each exercise.cues as cue (cue)}
    <li>{cue}</li>
  {/each}
</ul>
<BreathingNote />
<a class="video" href={videoSearchUrl(exercise)} target="_blank" rel="noopener">Tìm video hướng dẫn trên YouTube ↗</a>
<SourceList sources={exercise.sources} />

<style>
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
