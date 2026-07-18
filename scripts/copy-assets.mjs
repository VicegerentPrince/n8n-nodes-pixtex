// `n8n-node build` copies png/svg assets but not codex metadata (.node.json).
import { cpSync } from 'node:fs'

cpSync('nodes/Pixtex/Pixtex.node.json', 'dist/nodes/Pixtex/Pixtex.node.json')
