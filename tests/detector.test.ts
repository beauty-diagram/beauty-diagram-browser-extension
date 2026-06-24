// tests/detector.test.ts
import { describe, it, expect } from 'vitest'
import { detectSourceBlocks } from '../src/detector'

function dom(html: string): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = html
  return d
}

describe('detectSourceBlocks', () => {
  it('finds a mermaid code block by grammar keyword', () => {
    const root = dom('<pre><code>graph TD\n  A--&gt;B</code></pre>')
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('mermaid')
    expect(hits[0].source.startsWith('graph TD')).toBe(true)
  })

  it('finds a plantuml block by @start', () => {
    const root = dom('<pre><code>@startuml\nAlice -&gt; Bob\n@enduml</code></pre>')
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('plantuml')
  })

  it('finds a block tagged class="language-mermaid" even without keyword match on first line', () => {
    const root = dom('<pre><code class="language-mermaid">sequenceDiagram\nA->>B: hi</code></pre>')
    expect(detectSourceBlocks(root)).toHaveLength(1)
  })

  it('ignores ordinary code blocks', () => {
    const root = dom('<pre><code>const x = 1\nconsole.log(x)</code></pre>')
    expect(detectSourceBlocks(root)).toHaveLength(0)
  })

  it('respects %% bd:exclude — skips the block', () => {
    const root = dom('<pre><code>%% bd:exclude\ngraph TD\nA--&gt;B</code></pre>')
    expect(detectSourceBlocks(root)).toHaveLength(0)
  })

  it('Gap B: populates themeOverride from %% bd:theme=atlas directive', () => {
    const root = dom('<pre><code>%% bd:theme=atlas\ngraph TD\nA--&gt;B</code></pre>')
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].themeOverride).toBe('atlas')
    // source must NOT contain the directive line
    expect(hits[0].source).not.toContain('bd:theme')
    expect(hits[0].source.trim().startsWith('graph TD')).toBe(true)
  })
})
