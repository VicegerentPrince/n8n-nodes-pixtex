import { config } from '@n8n/node-cli/eslint'

// test/ is dev-only (vitest) and never ships — the n8n scanner likewise only
// lints package.json + nodes/ + credentials/.
export default [...config, { ignores: ['test/**'] }]
