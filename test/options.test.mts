import { describe, expect, it } from 'vitest'
import { buildOptions, coerceWorkflow, outputFileName } from '../nodes/Pixtex/options'

const WORKFLOW = { name: 'My Flow', nodes: [], connections: {} }

describe('buildOptions', () => {
  it('returns only explicitly-set fields', () => {
    expect(buildOptions({})).toEqual({})
    expect(buildOptions({ background: 'paper', showTitle: true })).toEqual({
      background: 'paper',
      showTitle: true,
    })
  })

  it('drops empty values so server defaults apply', () => {
    expect(buildOptions({ background: '', frame: undefined, layout: null as unknown as string })).toEqual({})
  })

  it('keeps false booleans (an explicit choice, not an empty value)', () => {
    expect(buildOptions({ showWatermark: false })).toEqual({ showWatermark: false })
  })

  it('includes format and scale only for sync renders', () => {
    expect(buildOptions({ scale: 3, background: 'dark' }, 'webp')).toEqual({
      background: 'dark',
      format: 'webp',
      scale: 3,
    })
  })

  it('strips scale for hosted images (server rejects it)', () => {
    expect(buildOptions({ scale: 3, background: 'dark' })).toEqual({ background: 'dark' })
  })

  it('validates the gridOpacity range', () => {
    expect(buildOptions({ gridOpacity: 0.5 })).toEqual({ gridOpacity: 0.5 })
    expect(() => buildOptions({ gridOpacity: 0.1 })).toThrow(/between 0.25 and 1/)
    expect(() => buildOptions({ gridOpacity: 2 })).toThrow(/between 0.25 and 1/)
    expect(() => buildOptions({ gridOpacity: 'lots' })).toThrow(/between 0.25 and 1/)
  })
})

describe('coerceWorkflow', () => {
  it('accepts a workflow object', () => {
    expect(coerceWorkflow(WORKFLOW)).toBe(WORKFLOW)
  })

  it('accepts a JSON string', () => {
    expect(coerceWorkflow(JSON.stringify(WORKFLOW))).toEqual(WORKFLOW)
  })

  it('unwraps { workflow } and { data } envelopes', () => {
    expect(coerceWorkflow({ workflow: WORKFLOW })).toEqual(WORKFLOW)
    expect(coerceWorkflow({ data: WORKFLOW })).toEqual(WORKFLOW)
  })

  it('rejects non-workflow shapes with a clear message', () => {
    expect(() => coerceWorkflow('not json {')).toThrow(/not valid JSON/)
    expect(() => coerceWorkflow({ foo: 1 })).toThrow(/"nodes" and "connections"/)
    expect(() => coerceWorkflow([WORKFLOW])).toThrow(/"nodes" and "connections"/)
    expect(() => coerceWorkflow(null)).toThrow(/"nodes" and "connections"/)
  })
})

describe('outputFileName', () => {
  it('slugifies the workflow name and maps jpeg to .jpg', () => {
    expect(outputFileName(WORKFLOW, 'png')).toBe('my-flow.png')
    expect(outputFileName({ name: 'Näme  (v2)!', nodes: [], connections: {} }, 'jpeg')).toBe('n-me-v2.jpg')
  })

  it('falls back to "workflow" when there is no usable name', () => {
    expect(outputFileName({ nodes: [], connections: {} }, 'pdf')).toBe('workflow.pdf')
    expect(outputFileName({ name: '!!!', nodes: [], connections: {} }, 'svg')).toBe('workflow.svg')
  })
})
