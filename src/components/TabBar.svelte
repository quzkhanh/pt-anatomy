<script lang="ts">
  import { onMount } from 'svelte'
  import { app, type Tab } from '../lib/app-state.svelte'

  // 24×24 stroke icons drawn for this app: a figure, a dumbbell, a star.
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'body', label: 'Cơ thể', icon: 'M12 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM6 10.5h12M12 10.5v5M12 15.5l-3 5M12 15.5l3 5' },
    { id: 'exercises', label: 'Bài tập', icon: 'M3 9.5v5M6 7.5v9M18 7.5v9M21 9.5v5M6 12h12' },
    { id: 'favorites', label: 'Yêu thích', icon: 'M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8Z' },
  ]

  let online = $state(navigator.onLine)

  onMount(() => {
    const update = () => (online = navigator.onLine)
    addEventListener('online', update)
    addEventListener('offline', update)
    return () => {
      removeEventListener('online', update)
      removeEventListener('offline', update)
    }
  })
</script>

<nav aria-label="Chuyển màn">
  {#if !online}
    <p class="offline" role="status">Đang mất mạng · app vẫn dùng được với dữ liệu đã lưu</p>
  {/if}
  {#each TABS as tab (tab.id)}
    <button aria-current={app.tab === tab.id ? 'page' : undefined} onclick={() => (app.tab = tab.id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.icon} /></svg>
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-tabbar);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    height: var(--tabbar-height);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }
  button {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-1);
    border: 0;
    background: none;
    font-size: var(--font-xs);
    color: var(--color-text-muted);
  }
  svg {
    width: var(--space-6);
    height: var(--space-6);
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  [aria-current='page'] {
    color: var(--color-accent);
    font-weight: 600;
  }
  .offline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    margin: 0;
    padding: var(--space-1) var(--space-4);
    background: var(--color-text);
    color: var(--color-surface);
    font-size: var(--font-xs);
    text-align: center;
  }
</style>
