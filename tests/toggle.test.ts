import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildBar } from '../src/toggle'

function makeMount(): HTMLElement {
  const mount = document.createElement('div')
  mount.className = 'bd-mount'
  mount.innerHTML = '<div class="bd-preview"><img/></div><div class="bd-source" hidden><pre><code>graph TD</code></pre></div>'
  document.body.appendChild(mount)
  return mount
}

describe('buildBar', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('toggles between preview and source views', () => {
    const mount = makeMount()
    const bar = buildBar({ mount, source: 'graph TD', sourceFormat: 'mermaid', theme: 'classic' })
    mount.appendChild(bar)
    const toggle = bar.querySelector('.bd-toggle') as HTMLButtonElement
    expect(mount.querySelector('.bd-source')!.hasAttribute('hidden')).toBe(true)
    toggle.click()
    expect(mount.querySelector('.bd-source')!.hasAttribute('hidden')).toBe(false)
    expect(mount.querySelector('.bd-preview')!.hasAttribute('hidden')).toBe(true)
    toggle.click()
    expect(mount.querySelector('.bd-source')!.hasAttribute('hidden')).toBe(true)
  })

  it('copy button writes source to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const mount = makeMount()
    const bar = buildBar({ mount, source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' })
    ;(bar.querySelector('.bd-copy') as HTMLButtonElement).click()
    expect(writeText).toHaveBeenCalledWith('graph TD; A-->B')
  })

  it('open-in-editor link points at the web editor with encoded source', () => {
    const mount = makeMount()
    const bar = buildBar({
      mount, source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'atlas',
      editorWebBase: 'https://www.beauty-diagram.com',
    })
    const a = bar.querySelector('.bd-edit') as HTMLAnchorElement
    expect(a.href).toContain('https://www.beauty-diagram.com/editor?source=')
    expect(a.href).toContain('format=mermaid')
    expect(a.href).toContain('theme=atlas')
    expect(a.target).toBe('_blank')
  })
})
