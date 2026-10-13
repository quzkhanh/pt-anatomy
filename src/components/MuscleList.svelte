<script lang="ts">
  import { muscles, REGION_LABELS } from '../lib/content'
  import { REGIONS, type Muscle } from '../lib/content-types'

  let { onSelect }: { onSelect: (muscle: Muscle) => void } = $props()
</script>

<div class="list">
  <p class="note">Máy này không hiển thị được 3D. Bạn vẫn tra cứu được toàn bộ cơ ở danh sách dưới đây.</p>
  {#each REGIONS as region (region)}
    <h2>{REGION_LABELS[region]}</h2>
    <ul>
      {#each muscles.filter((m) => m.region === region) as muscle (muscle.id)}
        <li>
          <button onclick={() => onSelect(muscle)}>{muscle.vi} <i lang="en">{muscle.en}</i></button>
        </li>
      {/each}
    </ul>
  {/each}
</div>

<style>
  .list {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    padding: calc(var(--tap-min) + var(--space-6)) var(--space-4) 50dvh;
  }
  .note {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-sm);
  }
  h2 {
    margin: var(--space-4) 0 var(--space-1);
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  button {
    width: 100%;
    min-height: var(--tap-min);
    border: 0;
    border-bottom: 1px solid var(--color-border);
    background: none;
    text-align: left;
    font-size: var(--font-md);
  }
  i {
    color: var(--color-text-muted);
  }
</style>
