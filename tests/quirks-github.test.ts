import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { githubQuirks } from '../src/quirks/github'

function loadFixture(name: string): HTMLElement {
  const html = readFileSync(resolve(__dirname, 'fixtures', name), 'utf8')
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('githubQuirks', () => {
  it('matches github.com and renders inline-svg', () => {
    expect(githubQuirks.match).toContain('github.com')
    expect(githubQuirks.renderMode).toBe('inline-svg')
  })

  it('detectRendered finds the rendered mermaid section', () => {
    const root = loadFixture('github-readme.html')
    const nodes = githubQuirks.detectRendered!(root)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].matches('section[data-type="mermaid"]')).toBe(true)
  })

  it('recoverSource extracts the mermaid source (entity-decoded) from data-plain', () => {
    const root = loadFixture('github-readme.html')
    const node = githubQuirks.detectRendered!(root)[0]
    const src = githubQuirks.recoverSource!(node)!
    expect(src.startsWith('flowchart LR')).toBe(true)
    expect(src).toContain('HandleRedemptionDeposit')
    expect(src).toContain('<br/>')  // entity-decoded, NOT &lt;br/&gt;
    expect(src).toContain('-->')     // entity-decoded edge
  })
})
