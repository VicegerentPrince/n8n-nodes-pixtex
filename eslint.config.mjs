// Mirrors the config @n8n/scan-community-package lints submissions with, so
// `npm run lint` catches verification failures before a release does.
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes'
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base'
import tsParser from '@typescript-eslint/parser'

export default [
  // The scanner only lints package.json + nodes/ + credentials/ — dev files
  // (tests, scripts, this config) never ship and are excluded there too.
  { ignores: ['dist/**', 'node_modules/**', 'test/**', 'scripts/**', '*.mjs'] },
  n8nCommunityNodesPlugin.configs.recommended,
  { rules: { 'no-console': 'error' } },
  { plugins: { 'n8n-nodes-base': n8nNodesBase } },
  {
    files: ['package.json'],
    rules: { ...n8nNodesBase.configs.community.rules },
  },
  {
    files: ['**/credentials/**/*.ts'],
    rules: {
      ...n8nNodesBase.configs.credentials.rules,
      'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
      'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
    },
  },
  {
    files: ['**/nodes/**/*.ts'],
    rules: {
      ...n8nNodesBase.configs.nodes.rules,
      'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
      'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
      'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
    },
  },
  { files: ['**/*.json'], languageOptions: { parser: tsParser } },
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
]
