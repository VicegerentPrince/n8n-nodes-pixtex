import type {
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow'
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow'

import { buildOptions, coerceWorkflow, CONTENT_TYPES, outputFileName } from './options'
import type {
  AgentPortOrder, EdgeStyle, ExportBackground, ExportFormat, ExportPadding,
  ExportScale, FramePreset, GridStyle, HostedImageResponse, IconPack, IconShape,
  LayoutDirection, ListHostedImagesResponse, NodeDetail, NodePalette,
  PixtexWorkflow, SettingsStyle, SpacingPreset, WorkflowLayout,
} from './types'

const DEFAULT_BASE_URL = 'https://api.pixtex.dev'

type Opt<T extends string | number> = { name: string; value: T }

// Option lists mirror the server's zod schema; the value types keep them in
// lockstep with the vendored contract types — a bad value fails typecheck.
const FORMAT_OPTIONS: Array<Opt<ExportFormat>> = [
  { name: 'PNG', value: 'png' },
  { name: 'JPEG', value: 'jpeg' },
  { name: 'WebP', value: 'webp' },
  { name: 'SVG', value: 'svg' },
  { name: 'PDF', value: 'pdf' },
]

const BACKGROUND_OPTIONS: Array<Opt<ExportBackground>> = [
  { name: 'Dark', value: 'dark' },
  { name: 'Midnight', value: 'midnight' },
  { name: 'Plum', value: 'plum' },
  { name: 'Gradient', value: 'gradient' },
  { name: 'White', value: 'white' },
  { name: 'Paper', value: 'paper' },
  { name: 'Transparent', value: 'transparent' },
]

const ICON_PACK_OPTIONS: Array<Opt<IconPack>> = [
  { name: 'N8n (Real Node Icons)', value: 'n8n' },
  { name: 'Custom (Pixel Cards)', value: 'custom' },
]

const LAYOUT_OPTIONS: Array<Opt<WorkflowLayout>> = [
  { name: 'Original Positions', value: 'original' },
  { name: 'Auto Layout', value: 'auto' },
]

const DIRECTION_OPTIONS: Array<Opt<LayoutDirection>> = [
  { name: 'Auto', value: 'auto' },
  { name: 'Left to Right', value: 'LR' },
  { name: 'Top to Bottom', value: 'TB' },
]

const SPACING_OPTIONS: Array<Opt<SpacingPreset>> = [
  { name: 'Compact', value: 'compact' },
  { name: 'Normal', value: 'normal' },
  { name: 'Spacious', value: 'spacious' },
]

const DETAIL_OPTIONS: Array<Opt<NodeDetail>> = [
  { name: 'Minimal', value: 'minimal' },
  { name: 'Standard', value: 'standard' },
  { name: 'Detailed', value: 'detailed' },
]

const ICON_SHAPE_OPTIONS: Array<Opt<IconShape>> = [
  { name: 'Square', value: 'square' },
  { name: 'Rounded', value: 'rounded' },
  { name: 'Circle', value: 'circle' },
]

const GRID_OPTIONS: Array<Opt<GridStyle>> = [
  { name: 'Dots', value: 'dots' },
  { name: 'Lines', value: 'lines' },
  { name: 'Cross', value: 'cross' },
  { name: 'None', value: 'none' },
]

const EDGE_OPTIONS: Array<Opt<EdgeStyle>> = [
  { name: 'Curved', value: 'curved' },
  { name: 'Straight', value: 'straight' },
  { name: 'Step', value: 'step' },
]

const PADDING_OPTIONS: Array<Opt<ExportPadding>> = [
  { name: 'Tight', value: 'tight' },
  { name: 'Normal', value: 'normal' },
  { name: 'Roomy', value: 'roomy' },
]

const FRAME_OPTIONS: Array<Opt<FramePreset>> = [
  { name: 'Auto (Fit Content)', value: 'auto' },
  { name: 'Open Graph (1200×630)', value: 'og' },
  { name: 'YouTube (1280×720)', value: 'youtube' },
  { name: 'Square', value: 'square' },
]

const PALETTE_OPTIONS: Array<Opt<NodePalette>> = [
  { name: 'Punch', value: 'punch' },
  { name: 'Candy', value: 'candy' },
  { name: 'Sunset', value: 'sunset' },
  { name: 'Mono', value: 'mono' },
]

const AGENT_PORT_OPTIONS: Array<Opt<AgentPortOrder>> = [
  { name: 'Canonical (Chat Model → Memory → Tool)', value: 'canonical' },
  { name: 'As Wired in the JSON', value: 'wired' },
]

const SETTINGS_STYLE_OPTIONS: Array<Opt<SettingsStyle>> = [
  { name: 'Stamp', value: 'stamp' },
  { name: 'Pixel', value: 'pixel' },
  { name: 'Zine', value: 'zine' },
  { name: 'Patch', value: 'patch' },
  { name: 'Pinned', value: 'pinned' },
  { name: 'Rigged', value: 'rigged' },
]

const SCALE_OPTIONS: Array<Opt<ExportScale>> = [
  { name: '1× (Screen)', value: 1 },
  { name: '2× (Crisp)', value: 2 },
  { name: '3× (Print)', value: 3 },
  { name: '4× (Poster)', value: 4 },
]

export class Pixtex implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pixtex',
    name: 'pixtex',
    icon: { light: 'file:pixtex-light.svg', dark: 'file:pixtex-dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Render n8n workflows into share-ready diagrams via the Pixtex render API',
    defaults: { name: 'Pixtex' },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'pixtexApi', required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Account', value: 'account' },
          { name: 'Hosted Image', value: 'hostedImage' },
          { name: 'Render', value: 'render' },
        ],
        default: 'render',
      },

      // ── Operations ──────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['render'] } },
        options: [
          {
            name: 'Render',
            value: 'render',
            description: 'Render workflow JSON to an image and return it as binary data',
            action: 'Render a workflow diagram',
          },
        ],
        default: 'render',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['hostedImage'] } },
        options: [
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a hosted image (its URL stops resolving)',
            action: 'Delete a hosted image',
          },
          {
            name: 'Get Many',
            value: 'getAll',
            description: 'List the hosted images owned by your API key',
            action: 'Get many hosted images',
          },
          {
            name: 'Publish',
            value: 'publish',
            description: 'Render the workflow and host it at a permanent PNG URL',
            action: 'Publish a hosted image',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Re-render an existing hosted image in place — the URL never changes',
            action: 'Update a hosted image',
          },
        ],
        default: 'publish',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [
          {
            name: 'Get Usage',
            value: 'getUsage',
            description: 'Get your key\'s tier, monthly render usage, and hosted-image count',
            action: 'Get account usage',
          },
        ],
        default: 'getUsage',
      },

      // ── Fields ──────────────────────────────────────────────────────────
      {
        displayName: 'Workflow JSON',
        name: 'workflowJson',
        type: 'json',
        default: '={{ $json }}',
        required: true,
        description:
          'The n8n workflow to draw — an export object with "nodes" and "connections". Feed it from the n8n node (Get Workflow), an HTTP request to your instance, or paste it.',
        displayOptions: {
          show: { resource: ['render', 'hostedImage'], operation: ['render', 'publish', 'update'] },
        },
      },
      {
        displayName: 'Image ID',
        name: 'imageId',
        type: 'string',
        default: '',
        required: true,
        description: 'ID of the hosted image (from Publish or Get Many)',
        displayOptions: { show: { resource: ['hostedImage'], operation: ['update', 'delete'] } },
      },
      {
        displayName: 'Image Name',
        name: 'imageName',
        type: 'string',
        default: '',
        description: 'Display name for the hosted image. Defaults to the workflow\'s name.',
        displayOptions: { show: { resource: ['hostedImage'], operation: ['publish', 'update'] } },
      },
      {
        displayName: 'Format',
        name: 'format',
        type: 'options',
        options: FORMAT_OPTIONS,
        default: 'png',
        description: 'Output image format',
        displayOptions: { show: { resource: ['render'] } },
      },
      {
        displayName: 'Put Output in Field',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        description: 'Name of the binary property to write the rendered image to',
        displayOptions: { show: { resource: ['render'] } },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        description:
          'Only options you set are sent — everything else keeps the pixtex.dev editor defaults',
        displayOptions: {
          show: { resource: ['render', 'hostedImage'], operation: ['render', 'publish', 'update'] },
        },
        options: [
          {
            displayName: 'Agent Port Order',
            name: 'agentPortOrder',
            type: 'options',
            options: AGENT_PORT_OPTIONS,
            default: 'canonical',
            description: 'Order of an AI Agent\'s bottom ports',
          },
          {
            displayName: 'Background',
            name: 'background',
            type: 'options',
            options: BACKGROUND_OPTIONS,
            default: 'dark',
          },
          {
            displayName: 'Edge Style',
            name: 'edgeStyle',
            type: 'options',
            options: EDGE_OPTIONS,
            default: 'curved',
          },
          {
            displayName: 'Frame',
            name: 'frame',
            type: 'options',
            options: FRAME_OPTIONS,
            default: 'auto',
            description: 'Fixed output canvas for social embeds',
          },
          {
            displayName: 'Grid Opacity',
            name: 'gridOpacity',
            type: 'number',
            typeOptions: { minValue: 0.25, maxValue: 1, numberPrecision: 2 },
            default: 0.5,
            description: 'Grid strength, 0.25–1',
          },
          {
            displayName: 'Grid Style',
            name: 'gridStyle',
            type: 'options',
            options: GRID_OPTIONS,
            default: 'dots',
          },
          {
            displayName: 'Icon Pack',
            name: 'iconPack',
            type: 'options',
            options: ICON_PACK_OPTIONS,
            default: 'n8n',
            description: 'Real n8n node icons, or Pixtex\'s custom pixel-card style',
          },
          {
            displayName: 'Icon Shape',
            name: 'iconShape',
            type: 'options',
            options: ICON_SHAPE_OPTIONS,
            default: 'rounded',
          },
          {
            displayName: 'Layout',
            name: 'layout',
            type: 'options',
            options: LAYOUT_OPTIONS,
            default: 'original',
            description: 'Keep the positions from the JSON, or let Pixtex auto-arrange',
          },
          {
            displayName: 'Layout Direction',
            name: 'layoutDirection',
            type: 'options',
            options: DIRECTION_OPTIONS,
            default: 'auto',
            description: 'Flow direction when auto layout is on',
          },
          {
            displayName: 'Node Detail',
            name: 'nodeDetail',
            type: 'options',
            options: DETAIL_OPTIONS,
            default: 'standard',
            description: 'How much text each node card shows',
          },
          {
            displayName: 'Node Outline',
            name: 'outlineOpacity',
            type: 'number',
            typeOptions: { minValue: 0.05, maxValue: 1, numberPrecision: 2 },
            default: 0.15,
            description: 'N8n-pack node border strength, 0.05–1 (0.15 = n8n in-app look, ~0.4 = n8n site renders)',
          },
          {
            displayName: 'Node Palette',
            name: 'nodePalette',
            type: 'options',
            options: PALETTE_OPTIONS,
            default: 'punch',
            description: 'Color scheme for the custom icon pack',
          },
          {
            displayName: 'Padding',
            name: 'padding',
            type: 'options',
            options: PADDING_OPTIONS,
            default: 'normal',
            description: 'Space around the diagram',
          },
          {
            displayName: 'Scale',
            name: 'scale',
            type: 'options',
            options: SCALE_OPTIONS,
            default: 2,
            description: 'Output resolution multiplier (render only — hosted images use a fixed crisp scale)',
            displayOptions: { show: { '/resource': ['render'] } },
          },
          {
            displayName: 'Settings Style',
            name: 'settingsStyle',
            type: 'options',
            options: SETTINGS_STYLE_OPTIONS,
            default: 'stamp',
            description: 'How the custom pack draws node-settings marks (retry/continue/…)',
          },
          {
            displayName: 'Show Group Borders',
            name: 'showGroupBorders',
            type: 'boolean',
            default: true,
            description: 'Whether to draw borders around AI agent groups',
          },
          {
            displayName: 'Show Legend',
            name: 'showLegend',
            type: 'boolean',
            default: false,
            description: 'Whether to draw the node-type legend',
          },
          {
            displayName: 'Show Marks Key',
            name: 'showMarksKey',
            type: 'boolean',
            default: true,
            description: 'Whether to draw the key explaining node-settings marks',
          },
          {
            displayName: 'Show Title',
            name: 'showTitle',
            type: 'boolean',
            default: false,
            description: 'Whether to draw the workflow name as a title',
          },
          {
            displayName: 'Show Watermark',
            name: 'showWatermark',
            type: 'boolean',
            default: true,
            description:
              'Whether to draw the Pixtex watermark. Free-tier hosted images always include it.',
          },
          {
            displayName: 'Spacing',
            name: 'spacing',
            type: 'options',
            options: SPACING_OPTIONS,
            default: 'normal',
            description: 'Distance between nodes when auto layout is on',
          },
        ],
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    const resource = this.getNodeParameter('resource', 0) as string
    const operation = this.getNodeParameter('operation', 0) as string

    const credentials = await this.getCredentials('pixtexApi')
    const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')

    const request = async (options: Partial<IHttpRequestOptions> & { url: string }) =>
      this.helpers.httpRequestWithAuthentication.call(this, 'pixtexApi', {
        json: true,
        ...options,
        url: `${baseUrl}${options.url}`,
      } as IHttpRequestOptions)

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'render') {
          const workflow = getWorkflow(this, i)
          const format = this.getNodeParameter('format', i) as ExportFormat
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string
          const options = getOptions(this, i, format)

          const response = (await request({
            method: 'POST',
            url: '/v1/render',
            body: { workflow, options },
            encoding: 'arraybuffer',
            returnFullResponse: true,
          })) as { body: Buffer; headers: Record<string, unknown> }

          const binary = await this.helpers.prepareBinaryData(
            Buffer.from(response.body),
            outputFileName(workflow, format),
            CONTENT_TYPES[format],
          )
          returnData.push({
            json: { format, ...quotaJson(response.headers) },
            binary: { [binaryPropertyName]: binary },
            pairedItem: { item: i },
          })
        } else if (resource === 'hostedImage' && (operation === 'publish' || operation === 'update')) {
          const workflow = getWorkflow(this, i)
          const name = this.getNodeParameter('imageName', i, '') as string
          const body: Record<string, unknown> = {
            workflow,
            options: getOptions(this, i),
            ...(name ? { name } : {}),
          }

          const response = (await (operation === 'publish'
            ? request({ method: 'POST', url: '/v1/images', body })
            : request({ method: 'PUT', url: `/v1/images/${getImageId(this, i)}`, body }))) as HostedImageResponse
          returnData.push({ json: { ...response }, pairedItem: { item: i } })
        } else if (resource === 'hostedImage' && operation === 'getAll') {
          const response = (await request({ method: 'GET', url: '/v1/images' })) as ListHostedImagesResponse
          for (const image of response.images) {
            returnData.push({ json: { ...image }, pairedItem: { item: i } })
          }
        } else if (resource === 'hostedImage' && operation === 'delete') {
          const id = getImageId(this, i)
          await request({ method: 'DELETE', url: `/v1/images/${id}` })
          returnData.push({ json: { deleted: true, id }, pairedItem: { item: i } })
        } else if (resource === 'account' && operation === 'getUsage') {
          const response = (await request({ method: 'GET', url: '/v1/keys/me' })) as JsonObject
          returnData.push({ json: response, pairedItem: { item: i } })
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unsupported operation "${resource}:${operation}"`,
            { itemIndex: i },
          )
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: errorMessage(error) }, pairedItem: { item: i } })
          continue
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, {
          itemIndex: i,
          message: errorMessage(error),
        })
      }
    }

    return [returnData]
  }
}

function getWorkflow(ctx: IExecuteFunctions, itemIndex: number): PixtexWorkflow {
  const raw = ctx.getNodeParameter('workflowJson', itemIndex)
  try {
    return coerceWorkflow(raw)
  } catch (error) {
    throw new NodeOperationError(ctx.getNode(), errorMessage(error), { itemIndex })
  }
}

function getOptions(
  ctx: IExecuteFunctions,
  itemIndex: number,
  format?: ExportFormat,
): Record<string, unknown> {
  const collection = ctx.getNodeParameter('options', itemIndex, {}) as Record<string, unknown>
  try {
    return buildOptions(collection, format)
  } catch (error) {
    throw new NodeOperationError(ctx.getNode(), errorMessage(error), { itemIndex })
  }
}

function getImageId(ctx: IExecuteFunctions, itemIndex: number): string {
  const id = (ctx.getNodeParameter('imageId', itemIndex) as string).trim()
  if (!id) throw new NodeOperationError(ctx.getNode(), 'Image ID is required', { itemIndex })
  return encodeURIComponent(id)
}

/** Pulls the X-Renders-* quota headers into the item JSON so flows can alert on them. */
function quotaJson(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const remaining = headers['x-renders-remaining']
  const limit = headers['x-renders-limit']
  if (remaining !== undefined) out.rendersRemaining = Number(remaining)
  if (limit !== undefined) out.rendersLimit = Number(limit)
  return out
}

/** Best human message from an API failure — the server sends { error } bodies. */
function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { body?: unknown } }).response
    let body = response?.body
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf8'))
      } catch {
        body = undefined
      }
    }
    if (typeof body === 'object' && body !== null) {
      const message = (body as { error?: unknown }).error
      if (typeof message === 'string' && message) return message
    }
  }
  return error instanceof Error ? error.message : String(error)
}
