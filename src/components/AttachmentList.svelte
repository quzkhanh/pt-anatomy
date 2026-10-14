<script lang="ts">
  import { boneNames } from '../lib/content'
  import type { Attachment } from '../lib/content-types'

  let { label, attachments }: { label: string; attachments: Attachment[] } = $props()
</script>

<h3>{label}</h3>
<ul>
  {#each attachments as a, i (i)}
    <li>
      {#each boneNames(a) as name, j (j)}{#if j}, {/if}<strong>{name}</strong>{/each} — {a.vi}
    </li>
  {/each}
</ul>

<style>
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  ul {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--font-md);
    line-height: var(--line-body);
  }
</style>
