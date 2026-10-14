<script lang="ts">
  import { TIP_LABELS } from '../lib/content'
  import { TIP_KINDS, type Muscle } from '../lib/content-types'
  import SourceList from './SourceList.svelte'

  let { muscle }: { muscle: Muscle } = $props()

  const groups = $derived(TIP_KINDS.flatMap((kind) => (muscle.tips?.[kind] ? [{ kind, tips: muscle.tips[kind] }] : [])))
</script>

{#each groups as { kind, tips } (kind)}
  <h3>{TIP_LABELS[kind]}</h3>
  <ul>
    {#each tips as tip (tip)}
      <li>{tip}</li>
    {/each}
  </ul>
{/each}
<SourceList sources={muscle.sources ?? []} />

<style>
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  h3:first-child {
    margin-top: var(--space-2);
  }
  ul {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
</style>
