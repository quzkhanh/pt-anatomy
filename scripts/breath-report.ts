import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { MOTIONS } = await server.ssrLoadModule('/src/lib/motion/library/index.ts')
const { PHASE_BREATH } = await server.ssrLoadModule('/src/lib/motion/breath.ts')
const uses = new Map<string, string[]>()
for (const [id, build] of Object.entries(MOTIONS as Record<string, () => { keys: { phase: string }[] }>)) {
  for (const phase of new Set(build().keys.map((k) => k.phase))) uses.set(phase, [...(uses.get(phase) ?? []), id])
}
for (const [phase, ids] of [...uses].sort()) console.log(`${PHASE_BREATH[phase] ?? '—'}\t${phase}\t${ids.join(', ')}`)
await server.close()
