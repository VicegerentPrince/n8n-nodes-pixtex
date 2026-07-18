# n8n-nodes-pixtex

Render n8n workflows into share-ready diagrams **from inside n8n** — powered by the
[Pixtex](https://pixtex.dev) render API.

Two ways to use it:

- **Render** — get the diagram back as binary data (PNG/JPEG/WebP/SVG/PDF) and pipe it
  into any node that takes binary: Slack, email, S3, Google Drive, Telegram…
- **Hosted Image** — publish the diagram to a **permanent PNG URL** you can embed in
  READMEs, Notion, docs, or dashboards. Re-publish with *Update* and the URL never
  changes — embeds refresh on their own. Perfect for a scheduled "keep my workflow
  docs current" flow.

## Installation

In n8n: **Settings → Community Nodes → Install**, enter `n8n-nodes-pixtex`.

Self-hosted via npm:

```bash
npm install n8n-nodes-pixtex
```

## Credentials

You need a free Pixtex API key (`pxt_…`):

- grab one at [pixtex.dev/developers](https://pixtex.dev/developers), or
- run `npx pixtex signup you@example.com`

Then create a **Pixtex API** credential in n8n and paste the key. Leave the base URL
at `https://api.pixtex.dev` unless you run your own render API.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Render | Render | Workflow JSON → image as binary data (`png`, `jpeg`, `webp`, `svg`, `pdf`) |
| Hosted Image | Publish | Render + host at a permanent URL; returns `imageUrl` + ready-to-paste `markdown` |
| Hosted Image | Update | Re-render an existing image in place — same URL, fresh diagram |
| Hosted Image | Get Many | List images owned by your key |
| Hosted Image | Delete | Remove a hosted image |
| Account | Get Usage | Tier, monthly render quota usage, hosted-image count |

### Workflow JSON input

The **Workflow JSON** field defaults to `{{ $json }}` — the incoming item. Feed it a
workflow export from:

- the **n8n node** (Get Workflow) pointed at your own instance,
- an HTTP Request to `/api/v1/workflows/:id` of any n8n instance, or
- a pasted workflow export.

JSON strings and the common `{ workflow: … }` / `{ data: … }` envelopes are unwrapped
automatically.

> A workflow export can contain secrets in node parameters. Pixtex never logs workflow
> bodies, but hosted images are public URLs — publish diagrams, not credentials.

### Options

All canvas options from the pixtex.dev editor are available under **Options**
(background, icon pack, layout, spacing, node detail, frame presets for OG/YouTube
cards, custom-pack palettes, …). Only options you explicitly add are sent — everything
else keeps the editor's defaults.

Notes:

- **Scale** applies to sync renders only; hosted images always render at a fixed crisp
  scale.
- Free-tier hosted images always include the Pixtex watermark.
- Renders count against your key's monthly quota; the Render operation outputs
  `rendersRemaining` / `rendersLimit` so a flow can alert before running out.

## Example: self-updating README diagram

1. **Schedule Trigger** — nightly
2. **n8n node** — Get Workflow (the one you document)
3. **Pixtex** — Hosted Image → Update with the image ID from your first Publish

The `imageUrl` embedded in your README now always shows the current workflow.

## Related tooling

- CLI + GitHub Action: [`pixtex` on npm](https://www.npmjs.com/package/pixtex) /
  [VicegerentPrince/pixtex](https://github.com/VicegerentPrince/pixtex)
- API docs: [pixtex.dev/developers](https://pixtex.dev/developers)

## License

[MIT](LICENSE)
