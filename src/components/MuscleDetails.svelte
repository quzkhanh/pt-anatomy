<script lang="ts">
  import type { Muscle } from '../lib/content-types'
  import AttachmentList from './AttachmentList.svelte'
  import SourceList from './SourceList.svelte'

  let { muscle }: { muscle: Muscle } = $props()
</script>

{#if muscle.function}
  <h3>Chức năng</h3>
  <p class="text">{muscle.function}</p>
{/if}
{#if muscle.origin}<AttachmentList label="Nguyên ủy" attachments={muscle.origin} />{/if}
{#if muscle.insertion}<AttachmentList label="Bám tận" attachments={muscle.insertion} />{/if}
{#if muscle.nerve}
  <h3>Thần kinh chi phối</h3>
  <p class="text">{muscle.nerve}</p>
{/if}
<SourceList sources={muscle.sources ?? []} />

<style>
  .text {
    margin: 0;
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
</style>
