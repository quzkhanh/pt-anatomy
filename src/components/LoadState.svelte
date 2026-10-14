<script lang="ts">
  interface Props {
    phase: 'loading' | 'error'
    progress: number | null
    message?: string
    onRetry: () => void
  }

  let { phase, progress, message = 'Không tải được mô hình. Kiểm tra kết nối rồi thử lại.', onRetry }: Props = $props()
</script>

<div class="state" role="status" aria-live="polite">
  {#if phase === 'loading'}
    <p>Đang tải mô hình…</p>
    <div class="bar" class:indeterminate={progress === null}>
      <span style:width={progress === null ? null : `${Math.round(progress * 100)}%`}></span>
    </div>
  {:else}
    <p>{message}</p>
    <button onclick={onRetry}>Thử lại</button>
  {/if}
</div>

<style>
  .state {
    position: fixed;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-3);
    padding: var(--space-6);
    text-align: center;
  }
  p {
    margin: 0;
    color: var(--color-text-muted);
  }
  .bar {
    width: 12rem;
    height: var(--space-1);
    overflow: hidden;
    border-radius: var(--radius-pill);
    background: var(--color-border);
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--color-accent);
    transition: width var(--duration-ui) var(--ease-ui);
  }
  .indeterminate span {
    width: 40%;
    animation: slide 1.2s var(--ease-ui) infinite;
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(250%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .indeterminate span {
      animation: none;
      width: 100%;
    }
  }
  button {
    min-height: var(--tap-min);
    padding: 0 var(--space-6);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-text);
    color: var(--color-surface);
  }
</style>
