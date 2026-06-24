// tests/content.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scanOnce } from '../src/content'
import type { RenderAdapter } from '../src/render-adapter'
import { githubQuirks } from '../src/quirks/github'

/**
 * Flush microtasks + several macrotask ticks.
 * The click handler chain goes: click → async handler → shortHash (crypto.subtle) → adapter.render
 * — multiple awaited promises, so we drain a few setTimeouts to ensure everything settles.
 */
async function tick(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>(r => setTimeout(r, 0))
  }
}

const adapter: RenderAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }

beforeEach(() => { document.body.innerHTML = '' })

describe('scanOnce', () => {
  it('Detector A attaches a render affordance (raw by default), not an immediate render', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    // Affordance button present, no mount yet
    expect(document.querySelector('.bd-render-btn')).toBeTruthy()
    expect(document.querySelector('.bd-mount')).toBeNull()
  })

  it('clicking the render affordance renders the block (generic mermaid code block)', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    const localAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter: localAdapter, defaultTheme: 'classic', quirks: null })
    // Before click: affordance present, no mount
    expect(document.querySelector('.bd-render-btn')).toBeTruthy()
    expect(document.querySelector('.bd-mount')).toBeNull()
    // Click triggers render
    ;(document.querySelector('.bd-render-btn') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelector('.bd-mount .bd-preview img')).toBeTruthy()
    expect(document.querySelector('.bd-render-btn')).toBeNull() // button consumed by processHit
  })

  it('does nothing on a page with no diagrams', async () => {
    document.body.innerHTML = '<p>hello</p>'
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    expect(document.querySelector('.bd-mount')).toBeNull()
    expect(document.querySelector('.bd-render-btn')).toBeNull()
  })

  it('Gap B: clicking the affordance passes the directive theme override into the adapter', async () => {
    document.body.innerHTML = '<pre><code>%% bd:theme=atlas\ngraph TD\nA--&gt;B</code></pre>'
    const localAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter: localAdapter, defaultTheme: 'classic', quirks: null })
    // render NOT called yet — only after click
    expect(localAdapter.render).not.toHaveBeenCalled()
    ;(document.querySelector('.bd-render-btn') as HTMLButtonElement).click()
    await tick()
    expect(localAdapter.render).toHaveBeenCalledWith(expect.objectContaining({ theme: 'atlas' }))
  })

  it('clicking the affordance forwards the bg directive through to the adapter render input', async () => {
    document.body.innerHTML = '<pre><code>%% bd:bg=transparent\ngraph TD\nA--&gt;B</code></pre>'
    const localAdapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter: localAdapter, defaultTheme: 'classic', quirks: null })
    expect(localAdapter.render).not.toHaveBeenCalled()
    ;(document.querySelector('.bd-render-btn') as HTMLButtonElement).click()
    await tick()
    expect(localAdapter.render).toHaveBeenCalledWith(expect.objectContaining({ bg: 'transparent' }))
  })

  it('a render rejection on affordance click does not throw and leaves no .bd-mount', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    const localAdapter = { render: vi.fn().mockRejectedValue(new Error('ctx invalidated')) }
    await scanOnce({ adapter: localAdapter, defaultTheme: 'classic', quirks: null })
    // affordance is present before click
    expect(document.querySelector('.bd-render-btn')).toBeTruthy()
    // click should not throw; page should not break
    expect(() => (document.querySelector('.bd-render-btn') as HTMLButtonElement).click()).not.toThrow()
    await tick()
    expect(document.querySelector('.bd-mount')).toBeNull() // native render left intact
  })

  it('scanOnce is idempotent — second call does not double-attach affordance', async () => {
    document.body.innerHTML = '<pre><code>graph TD\nA--&gt;B</code></pre>'
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: null })
    expect(document.querySelectorAll('.bd-render-btn').length).toBe(1)
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

  it('GitHub B-path: directive theme override is parsed and passed to adapter; directive line stripped from source', async () => {
    document.body.innerHTML =
      '<section class="js-render-needs-enrichment" data-type="mermaid">' +
      '<div class="js-render-enrichment-target" data-plain="%% bd:theme=atlas&#10;flowchart LR&#10;A--&gt;B"></div></section>'
    const adapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: githubQuirks, replaceRendered: true })
    expect(adapter.render).toHaveBeenCalledWith(expect.objectContaining({ theme: 'atlas' }))
    expect((adapter.render as any).mock.calls[0][0].source).not.toContain('bd:theme')
  })

  it('GitHub B-path: no directive → themeOverride undefined, falls back to defaultTheme', async () => {
    document.body.innerHTML =
      '<section class="js-render-needs-enrichment" data-type="mermaid">' +
      '<div class="js-render-enrichment-target" data-plain="flowchart LR&#10;A--&gt;B"></div></section>'
    const adapter = { render: vi.fn().mockResolvedValue({ kind: 'img-url', url: 'https://x/y.svg' }) }
    await scanOnce({ adapter, defaultTheme: 'classic', quirks: githubQuirks, replaceRendered: true })
    expect(adapter.render).toHaveBeenCalledWith(expect.objectContaining({ theme: 'classic' }))
  })
})
