// tests/content.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scanOnce } from '../src/content'
import type { RenderAdapter } from '../src/render-adapter'
import { githubQuirks } from '../src/quirks/github'

const adapter: RenderAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }

beforeEach(() => { document.body.innerHTML = '' })

describe('scanOnce', () => {
  it('beautifies a generic mermaid code block (no quirk)', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    expect(document.querySelector('.bd-mount .bd-preview img')).toBeTruthy()
  })

  it('does nothing on a page with no diagrams', async () => {
    document.body.innerHTML = '<p>hello</p>'
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    expect(document.querySelector('.bd-mount')).toBeNull()
  })

  it('Gap B: passes the directive theme override into the adapter', async () => {
    document.body.innerHTML = '<pre><code>%% bd:theme=atlas\ngraph TD\nA--&gt;B</code></pre>'
    const adapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    expect(adapter.render).toHaveBeenCalledWith(expect.objectContaining({ theme: 'atlas' }))
  })

  it('a render rejection does not throw out of scanOnce and does not break the page', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    const adapter = { render: vi.fn().mockRejectedValue(new Error('ctx invalidated')) }
    await expect(scanOnce({ adapter, defaultTheme: 'classic', quirks: null })).resolves.toBeUndefined()
    expect(document.querySelector('.bd-mount')).toBeNull() // native render left intact
  })

  it('GitHub: replaces the rendered-mermaid section with a mount built from the recovered source', async () => {
    const html = readFileSync(resolve(__dirname, 'fixtures', 'github-readme.html'), 'utf8')
    document.body.innerHTML = html
    const adapter = { render: vi.fn().mockResolvedValue({ kind: 'svg', markup: '<svg id="z"></svg>' }) }
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: githubQuirks, replaceRendered: true })
    expect(document.querySelector('section[data-type="mermaid"]')).toBeNull() // native section gone
    expect(document.querySelector('.bd-mount .bd-preview svg#z')).toBeTruthy()  // inline-svg injected
    expect(adapter.render).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFormat: 'mermaid', renderMode: 'inline-svg' }),
    )
    expect((adapter.render as any).mock.calls[0][0].source.startsWith('flowchart LR')).toBe(true)
  })
})
