import { describe, it, expect, vi } from 'vitest'
import { processHit } from '../src/swap'
import type { SourceHit } from '../src/detector'
import type { RenderAdapter } from '../src/render-adapter'

function hitFrom(html: string): { hit: SourceHit; host: HTMLElement } {
  const host = document.createElement('div')
  host.innerHTML = html
  const node = host.querySelector('pre')!
  return { hit: { source: 'graph TD; A-->B', sourceFormat: 'mermaid', node }, host }
}

const imgAdapter: RenderAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
const deps = { adapter: imgAdapter, defaultTheme: 'classic', editorWebBase: 'https://www.beauty-diagram.com' }

describe('processHit', () => {
  it('replaces the node with a .bd-mount preview + hidden source', async () => {
    const { hit, host } = hitFrom('<pre><code>graph TD\nA--&gt;B</code></pre>')
    await processHit(hit, deps)
    const mount = host.querySelector('.bd-mount')!
    expect(mount).toBeTruthy()
    expect(mount.querySelector('.bd-preview img')!.getAttribute('src')).toBe('https://x/y.svg')
    expect(mount.querySelector('.bd-source')!.getAttribute('hidden')).not.toBeNull()
    expect(mount.getAttribute('data-bd-format')).toBe('mermaid')
    expect(mount.getAttribute('data-bd-processed')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is idempotent: re-processing the same mount does nothing (same hash)', async () => {
    const { hit, host } = hitFrom('<pre><code>graph TD\nA--&gt;B</code></pre>')
    await processHit(hit, deps)
    const first = host.querySelector('.bd-mount')!
    // re-run detector on the new DOM: the mount is already processed → skip
    await processHit({ ...hit, node: first }, deps)
    expect(host.querySelectorAll('.bd-mount')).toHaveLength(1)
  })

  it('leaves the node untouched when adapter returns null (fallback)', async () => {
    const { hit, host } = hitFrom('<pre><code>graph TD\nA--&gt;B</code></pre>')
    const nullAdapter: RenderAdapter = { render: vi.fn().mockResolvedValue(null) }
    await processHit(hit, { ...deps, adapter: nullAdapter })
    expect(host.querySelector('.bd-mount')).toBeNull()
    expect(host.querySelector('pre')).toBeTruthy()
  })

  it('inline-svg result is injected as markup, not <img>', async () => {
    const { hit, host } = hitFrom('<pre><code>graph TD\nA--&gt;B</code></pre>')
    const svgAdapter: RenderAdapter = { render: vi.fn().mockResolvedValue({ kind: 'svg', markup: '<svg id="z"></svg>' }) }
    await processHit(hit, { ...deps, adapter: svgAdapter })
    expect(host.querySelector('.bd-preview svg#z')).toBeTruthy()
  })

  it('Gap A: removes an adjacent bd:inline-img marker block (no double image)', async () => {
    const host = document.createElement('div')
    host.innerHTML =
      '<pre><code>graph TD\nA--&gt;B</code></pre>' +
      '<!-- bd:inline-img hash=abc12345 -->' +
      '<p><img src="https://api.beauty-diagram.com/v1/beautify.svg?source=zz"></p>' +
      '<!-- /bd:inline-img -->'
    const node = host.querySelector('pre')!
    await processHit({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', node }, deps)
    expect(host.querySelectorAll('.bd-mount')).toHaveLength(1)
    // the previously-injected marker image is gone; only the beautified preview img remains
    expect(host.querySelectorAll('img')).toHaveLength(1)
    expect(host.querySelector('img')!.getAttribute('src')).toBe('https://x/y.svg')
  })
})
