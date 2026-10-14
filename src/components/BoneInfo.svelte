<script lang="ts">
  import { openMuscle } from '../lib/app-state.svelte'
  import type { BoneAttachment } from '../lib/content'

  let { origin, insertion }: { origin: BoneAttachment[]; insertion: BoneAttachment[] } = $props()

  const groups = $derived(
    [
      { label: 'Cơ bắt đầu từ xương này (nguyên ủy)', list: origin },
      { label: 'Cơ bám tận vào xương này', list: insertion },
    ].filter((g) => g.list.length),
  )
</script>

{#each groups as group (group.label)}
  <h3>{group.label}</h3>
  <ul>
    {#each group.list as { muscle, landmarks } (muscle.id)}
      <li>
        <button onclick={() => openMuscle(muscle)}>{muscle.vi}</button>
        <span>{landmarks.join('; ')}</span>
      </li>
    {/each}
  </ul>
{/each}

<style>
  h3 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }
  button {
    display: block;
    min-height: var(--tap-min);
    padding: 0;
    border: 0;
    background: none;
    font-size: var(--font-md);
    font-weight: 600;
    color: var(--color-accent);
    text-align: left;
  }
  span {
    font-size: var(--font-sm);
    line-height: var(--line-body);
    color: var(--color-text-muted);
  }
</style>
