import type { ExportFormat, PixtexWorkflow } from './types'

/**
 * Turns the node's Options collection into the /v1 options object.
 * Only explicitly-set fields are sent — omitted fields keep the server's
 * defaults (the same defaults the pixtex.dev editor uses).
 *
 * Hosted images (`POST/PUT /v1/images`) reject format/scale — they're only
 * included when `format` is passed, i.e. for sync `/v1/render` calls.
 */
export function buildOptions(
  collection: Record<string, unknown>,
  format?: ExportFormat,
): Record<string, unknown> {
  const { scale, ...canvas } = collection

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(canvas)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }

  if (out.gridOpacity !== undefined) {
    const n = Number(out.gridOpacity)
    if (!Number.isFinite(n) || n < 0.25 || n > 1) {
      throw new Error(`Grid opacity must be a number between 0.25 and 1 (got "${String(out.gridOpacity)}")`)
    }
    out.gridOpacity = n
  }

  if (out.outlineOpacity !== undefined) {
    const n = Number(out.outlineOpacity)
    if (!Number.isFinite(n) || n < 0.05 || n > 1) {
      throw new Error(`Node outline must be a number between 0.05 and 1 (got "${String(out.outlineOpacity)}")`)
    }
    out.outlineOpacity = n
  }

  if (format !== undefined) {
    out.format = format
    if (scale !== undefined && scale !== null && scale !== '') out.scale = Number(scale)
  }

  return out
}

/**
 * Coerces the Workflow JSON parameter into a workflow object. Accepts the
 * object itself, a JSON string, or common wrappers (`{ workflow }` from
 * Pixtex payloads, `{ data }` from n8n REST responses).
 */
export function coerceWorkflow(raw: unknown): PixtexWorkflow {
  let value = raw
  if (typeof value === 'string') {
    // parse-then-throw keeps the throw outside the catch block — n8n's
    // community-node lint forbids raw throws inside catch
    let parsed: unknown
    let parseFailed = false
    try {
      parsed = JSON.parse(value)
    } catch {
      parseFailed = true
    }
    if (parseFailed) throw new Error('Workflow JSON is not valid JSON')
    value = parsed
  }

  if (isWorkflowShape(value)) return value
  if (isRecord(value)) {
    if (isWorkflowShape(value.workflow)) return value.workflow
    if (isWorkflowShape(value.data)) return value.data
  }

  throw new Error('Workflow JSON must be an n8n workflow export — an object with "nodes" and "connections"')
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isWorkflowShape = (v: unknown): v is PixtexWorkflow =>
  isRecord(v) && Array.isArray(v.nodes) && isRecord(v.connections)

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  png: 'png', jpeg: 'jpg', webp: 'webp', svg: 'svg', pdf: 'pdf',
}

/** Output file name: the workflow's name slugified, with the format's extension. */
export function outputFileName(workflow: PixtexWorkflow, format: ExportFormat): string {
  const stem = (typeof workflow.name === 'string' ? workflow.name : '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${stem || 'workflow'}.${FILE_EXTENSIONS[format]}`
}
