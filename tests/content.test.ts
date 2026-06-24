// tests/content.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanOnce } from '../src/content'
import type { RenderAdapter } from '../src/render-adapter'

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
})
