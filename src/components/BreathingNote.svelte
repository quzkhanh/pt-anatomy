<script lang="ts">
  import { breathing } from '../lib/content'
</script>

<h3>Cách thở</h3>
<ul>
  {#each breathing.points as point (point)}
    <li>{point}</li>
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
