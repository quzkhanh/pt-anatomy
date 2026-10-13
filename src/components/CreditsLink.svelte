<script lang="ts">
  import { app } from '../lib/app-state.svelte'
</script>

<button onclick={() => (app.credits = true)}>Nguồn & giấy phép</button>

<style>
  button {
    display: block;
    min-height: var(--tap-min);
    margin: var(--space-4) auto 0;
    border: 0;
    background: none;
    font-size: var(--font-xs);
    color: var(--color-text-muted);
    text-decoration: underline;
  }
</style>
