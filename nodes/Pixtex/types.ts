// Pixtex public API contract types — the subset this node touches.
// Vendored from the Pixtex monorepo's shared types (same approach as the CLI):
// when the API contract changes there, copy the delta over manually.

// ── Render options ────────────────────────────────────────────────────────────

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf'
export type ExportScale = 1 | 2 | 3 | 4
export type ExportBackground = 'dark' | 'midnight' | 'gradient' | 'white' | 'paper' | 'transparent'
export type IconPack = 'n8n' | 'custom'
export type WorkflowLayout = 'original' | 'auto'
export type LayoutDirection = 'LR' | 'TB' | 'auto'
export type NodeDetail = 'minimal' | 'standard' | 'detailed'
export type IconShape = 'square' | 'rounded' | 'circle'
export type SpacingPreset = 'compact' | 'normal' | 'spacious'
export type GridStyle = 'dots' | 'lines' | 'cross' | 'none'
export type EdgeStyle = 'curved' | 'straight' | 'step'
export type ExportPadding = 'tight' | 'normal' | 'roomy'

/** Fixed output canvas for social embeds; 'auto' sizes to the content. */
export type FramePreset = 'auto' | 'og' | 'youtube' | 'square'

/** Agent bottom-port order: n8n's canonical Chat Model→Memory→Tool, or as wired in the JSON. */
export type AgentPortOrder = 'canonical' | 'wired'

/** Color scheme for the custom (pixel-punk) node style. */
export type NodePalette = 'punch' | 'candy' | 'sunset' | 'mono'

/** How the custom pack draws node settings marks (retry/continue/once/always-out). */
export type SettingsStyle = 'stamp' | 'pixel' | 'zine' | 'patch' | 'pinned' | 'rigged'

// ── Workflow JSON (shape-checked only — the server validates in depth) ────────

export interface PixtexWorkflow {
  name?: string
  nodes: unknown[]
  connections: Record<string, unknown>
  [key: string]: unknown
}

// ── /v1 responses ─────────────────────────────────────────────────────────────

export interface HostedImageMeta {
  id: string
  name: string
  nodeCount: number
  createdAt: string
  updatedAt: string
}

export interface HostedImageResponse {
  image: HostedImageMeta
  /** Stable PNG URL — embed it anywhere; PUT updates it in place. */
  imageUrl: string
  /** Ready-to-paste markdown embed. */
  markdown: string
}

export interface ListHostedImagesResponse {
  images: Array<HostedImageMeta & { imageUrl: string }>
}
