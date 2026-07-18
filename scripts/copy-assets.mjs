// tsc only emits .js — the node icons and codex metadata ship alongside them.
import { cpSync, mkdirSync } from 'node:fs'

mkdirSync('dist/nodes/Pixtex', { recursive: true })
for (const file of ['pixtex.svg', 'pixtex.dark.svg', 'Pixtex.node.json']) {
  cpSync(`nodes/Pixtex/${file}`, `dist/nodes/Pixtex/${file}`)
}
