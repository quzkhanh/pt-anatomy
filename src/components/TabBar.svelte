<script lang="ts">
  import { onMount } from 'svelte'
  import { app, type Tab } from '../lib/app-state.svelte'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'body', label: 'Cơ thể' },
    { id: 'exercises', label: 'Bài tập' },
    { id: 'favorites', label: 'Yêu thích' },
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
    border: 0;
    background: none;
    font-size: var(--font-sm);
    color: var(--color-text-muted);
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
