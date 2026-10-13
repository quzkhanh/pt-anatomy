<script lang="ts">
  import { onMount } from 'svelte'
  import type { Viewer } from '../lib/viewer/viewer'

  const REFRESH_MS = 500

  let { viewer }: { viewer: Viewer } = $props()
  // viewer không đổi suốt vòng đời overlay nên chỉ cần đọc giá trị đầu
  // svelte-ignore state_referenced_locally
  let stats = $state(viewer.stats())

  onMount(() => {
    const timer = setInterval(() => (stats = viewer.stats()), REFRESH_MS)
    return () => clearInterval(timer)
  })
</script>

<p class="debug">
  {stats.fps} fps · chạm {stats.pickMs.toFixed(1)} ms · pixelRatio {stats.pixelRatio} · sẵn sàng {Math.round(stats.readyMs)} ms
</p>

<style>
  .debug {
    position: fixed;
    left: var(--space-3);
    top: calc(var(--tap-min) + var(--space-6) + env(safe-area-inset-top));
    margin: 0;
    font-size: var(--font-xs);
    color: var(--color-text-muted);
    pointer-events: none;
  }
</style>
