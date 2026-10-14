<script lang="ts" generics="T extends string">
  interface Props {
    options: readonly T[]
    value: T | null
    label: (value: T) => string
    /** A leading chip that clears the choice (value null); omit for a plain pick between options. */
    allLabel?: string
    ariaLabel: string
    onSelect: (value: T | null) => void
  }

  let { options, value, label, allLabel, ariaLabel, onSelect }: Props = $props()
</script>

<div class="chips" role="group" aria-label={ariaLabel}>
  {#if allLabel}
    <button aria-pressed={value === null} onclick={() => onSelect(null)}>{allLabel}</button>
  {/if}
  {#each options as option (option)}
    <button aria-pressed={value === option} onclick={() => onSelect(option)}>{label(option)}</button>
  {/each}
</div>

<style>
  .chips {
    display: flex;
    gap: var(--space-2);
    margin: var(--space-3) calc(-1 * var(--space-4)) var(--space-2);
    padding: 0 var(--space-4);
    overflow-x: auto;
    scrollbar-width: none;
  }
  button {
    flex: none;
    min-height: var(--tap-min);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font-size: var(--font-sm);
  }
  [aria-pressed='true'] {
    border-color: var(--color-text);
    background: var(--color-text);
    color: var(--color-surface);
  }
</style>
