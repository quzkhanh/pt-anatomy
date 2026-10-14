<script lang="ts">
  import type { Muscle } from '../lib/content-types'
  import SourceList from './SourceList.svelte'

  let { muscle }: { muscle: Muscle } = $props()
</script>

<p class="text">{muscle.function}</p>
<SourceList sources={muscle.sources ?? []} />

<style>
  .text {
    margin: 0;
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
</style>
