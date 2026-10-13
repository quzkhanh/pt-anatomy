<script lang="ts">
  import { openMuscle } from '../lib/app-state.svelte'
  import { refLabel, resolveRef } from '../lib/content'

  let { label, refs, tone }: { label: string; refs: string[]; tone: 'primary' | 'secondary' } = $props()

  const resolved = $derived(refs.flatMap((ref) => resolveRef(ref) ?? []))
</script>

{#if resolved.length}
  <h3><span class="dot {tone}" aria-hidden="true"></span>{label}</h3>
  <ul>
    {#each resolved as r (refLabel(r))}
      <li><button onclick={() => openMuscle(r.muscle)}>{refLabel(r)}</button></li>
    {/each}
  </ul>
{/if}

<style>
  h3 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--font-sm);
  }
  .dot {
    width: var(--space-3);
    height: var(--space-3);
    border-radius: var(--radius-pill);
  }
  .primary {
    background: var(--color-selected);
  }
  .secondary {
    background: var(--color-secondary);
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  button {
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font-size: var(--font-sm);
  }
</style>
