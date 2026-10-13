<script lang="ts">
  import { openExercise, openMuscle } from '../lib/app-state.svelte'
  import { exercises, muscles } from '../lib/content'
  import { load, save } from '../lib/storage'

  type Verdict = 'ok' | 'wrong'
  interface Result {
    verdict?: Verdict
    note?: string
  }

  const KEY = 'pt-anatomy:review:v1'
  const VERDICT_LABELS: Record<Verdict, string> = { ok: '✓ Đúng', wrong: '✗ Sai' }
  const items = [
    ...muscles.map((m) => ({ key: `muscle:${m.id}`, kind: 'Cơ', name: m.vi, open: () => openMuscle(m) })),
    ...exercises.map((e) => ({ key: `exercise:${e.id}`, kind: 'Bài tập', name: e.vi, open: () => openExercise(e) })),
  ]

  let results = $state<Record<string, Result>>(load(KEY, {}))
  let index = $state(0)
  let exportStatus = $state('')
  const item = $derived(items[index])
  const current = $derived(results[item.key] ?? {})
  const done = $derived(items.filter((i) => results[i.key]?.verdict).length)

  $effect(() => item.open())

  function update(patch: Result) {
    results[item.key] = { ...current, ...patch }
    save(KEY, results)
  }

  const go = (step: number) => (index = (index + step + items.length) % items.length)

  function judge(verdict: Verdict) {
    update({ verdict })
    go(1)
  }

  function addNote() {
    const note = prompt(`Ghi chú cho “${item.name}”`, current.note ?? '')
    if (note !== null) update({ note: note.trim() || undefined })
  }

  async function exportResults() {
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), results }, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      exportStatus = 'Đã copy JSON'
    } catch {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      a.download = 'pt-anatomy-review.json'
      a.click()
      URL.revokeObjectURL(a.href)
      exportStatus = 'Đã tải file JSON'
    }
  }
</script>

<nav class="review" aria-label="Duyệt nội dung">
  <div class="row">
    <button aria-label="Mục trước" onclick={() => go(-1)}>‹</button>
    <p class="status" aria-live="polite">
      {item.kind} {index + 1}/{items.length} · {current.verdict ? VERDICT_LABELS[current.verdict] : 'Chưa duyệt'}{current.note
        ? ' · có ghi chú'
        : ''}
      <small>Đã duyệt {done}/{items.length} {exportStatus && `· ${exportStatus}`}</small>
    </p>
    <button aria-label="Mục tiếp" onclick={() => go(1)}>›</button>
  </div>
  <div class="row">
    <button class="ok" onclick={() => judge('ok')}>Đúng</button>
    <button class="wrong" onclick={() => judge('wrong')}>Sai</button>
    <button onclick={addNote}>Ghi chú</button>
    <button aria-label="Xuất kết quả" onclick={exportResults}>Xuất</button>
  </div>
</nav>

<style>
  .review {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-tabbar);
    display: grid;
    gap: var(--space-1);
    height: var(--tabbar-height);
    box-sizing: border-box;
    padding: var(--space-1) var(--space-2) env(safe-area-inset-bottom);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .status {
    flex: 1;
    display: grid;
    margin: 0;
    text-align: center;
    font-size: var(--font-sm);
  }
  small {
    font-size: var(--font-xs);
    color: var(--color-text-muted);
  }
  button {
    flex: 1;
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    font-size: var(--font-sm);
  }
  .row:first-child button {
    flex: none;
  }
  .ok {
    border-color: var(--color-text);
  }
  .wrong {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
