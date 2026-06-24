// tests/render-adapter.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ApiRenderAdapter } from '../src/render-adapter'

describe('ApiRenderAdapter — anonymous path', () => {
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

describe('ApiRenderAdapter — share path', () => {
  it('shareMode=true + mintShare returns token → uses /v1/share/<token>.svg (img-url)', async () => {
    const mintShare = vi.fn().mockResolvedValue({ token: 'abc123' })
    const fetchViaBackground = vi.fn()
    const a = new ApiRenderAdapter({
      apiBase: 'https://api.beauty-diagram.com',
      fetchViaBackground,
      mintShare,
    })
    const r = await a.render({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic', shareMode: true })
    expect(r).toEqual({ kind: 'img-url', url: 'https://api.beauty-diagram.com/v1/share/abc123.svg' })
    expect(fetchViaBackground).not.toHaveBeenCalled()
    // mintShare was called with correct input
    expect(mintShare).toHaveBeenCalledWith({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' })
  })

  it('shareMode=true + mintShare returns null → falls back to anonymous path', async () => {
    const mintShare = vi.fn().mockResolvedValue(null)
    const a = new ApiRenderAdapter({
      apiBase: 'https://api.beauty-diagram.com',
      fetchViaBackground: vi.fn(),
      mintShare,
    })
    const r = await a.render({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic', shareMode: true })
    expect(r?.kind).toBe('img-url')
    expect((r as any).url).toContain('/v1/beautify.svg')
    expect((r as any).url).toContain('&onfail=status')
  })

  it('shareMode=true + inline-svg + mint ok → fetches share URL and returns svg', async () => {
    const mintShare = vi.fn().mockResolvedValue({ token: 'tok-xyz' })
    const fetchViaBackground = vi.fn().mockResolvedValue({ ok: true, status: 200, body: '<svg id="shared"></svg>' })
    const a = new ApiRenderAdapter({
      apiBase: 'https://api.beauty-diagram.com',
      fetchViaBackground,
      mintShare,
    })
    const r = await a.render({
      source: 'graph TD; A-->B',
      sourceFormat: 'mermaid',
      theme: 'classic',
      renderMode: 'inline-svg',
      shareMode: true,
    })
    expect(r).toEqual({ kind: 'svg', markup: '<svg id="shared"></svg>' })
    expect(fetchViaBackground).toHaveBeenCalledWith('https://api.beauty-diagram.com/v1/share/tok-xyz.svg')
  })

  it('shareMode=false → always uses anonymous path even when mintShare is configured', async () => {
    const mintShare = vi.fn()
    const a = new ApiRenderAdapter({
      apiBase: 'https://api.beauty-diagram.com',
      fetchViaBackground: vi.fn(),
      mintShare,
    })
    const r = await a.render({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic', shareMode: false })
    expect(mintShare).not.toHaveBeenCalled()
    expect((r as any).url).toContain('/v1/beautify.svg')
  })
})
