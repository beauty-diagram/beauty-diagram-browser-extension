// tests/render-adapter.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ApiRenderAdapter } from '../src/render-adapter'

describe('ApiRenderAdapter', () => {
  it('img mode: composes /v1/beautify.svg URL with onfail=status appended', async () => {
    const a = new ApiRenderAdapter({ apiBase: 'https://api.beauty-diagram.com', fetchViaBackground: vi.fn() })
    const r = await a.render({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' })
    expect(r).toEqual({
      kind: 'img-url',
      url: expect.stringContaining('https://api.beauty-diagram.com/v1/beautify.svg?source='),
    })
    expect((r as any).url).toContain('&theme=classic')
    expect((r as any).url).toContain('&sourceFormat=mermaid')
    expect((r as any).url).toContain('&onfail=status')
  })

  it('returns null when source exceeds the 5KB anonymous cap', async () => {
    const a = new ApiRenderAdapter({ apiBase: 'https://api.beauty-diagram.com', fetchViaBackground: vi.fn() })
    const big = 'graph TD;\n' + 'A-->B\n'.repeat(2000)
    expect(await a.render({ source: big, sourceFormat: 'mermaid', theme: 'classic' })).toBeNull()
  })

  it('inline-svg mode: fetches via background and returns svg markup', async () => {
    const fetchViaBackground = vi.fn().mockResolvedValue({ ok: true, status: 200, body: '<svg id="x"></svg>' })
    const a = new ApiRenderAdapter({ apiBase: 'https://api.beauty-diagram.com', fetchViaBackground })
    const r = await a.render({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic', renderMode: 'inline-svg' })
    expect(r).toEqual({ kind: 'svg', markup: '<svg id="x"></svg>' })
    expect(fetchViaBackground).toHaveBeenCalledWith(expect.stringContaining('/v1/beautify.svg?source='))
  })

  it('inline-svg mode: returns null on 422 (render failure contract)', async () => {
    const fetchViaBackground = vi.fn().mockResolvedValue({ ok: false, status: 422, body: '{"error":"parse"}' })
    const a = new ApiRenderAdapter({ apiBase: 'https://api.beauty-diagram.com', fetchViaBackground })
    const r = await a.render({ source: 'bad', sourceFormat: 'mermaid', theme: 'classic', renderMode: 'inline-svg' })
    expect(r).toBeNull()
  })
})
