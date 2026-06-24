// tests/detector.test.ts
import { describe, it, expect } from 'vitest'
import { detectSourceBlocks, detectRenderedDiagrams } from '../src/detector'

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

  it('captures the bg directive into bgOverride', () => {
    const root = dom('<pre><code>%% bd:bg=dark\ngraph TD\nA--&gt;B</code></pre>')
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].bgOverride).toBe('dark')
  })

  it('handlePlantuml:false — skips plantuml blocks but still detects mermaid', () => {
    const root = dom(
      '<pre><code>@startuml\nAlice -&gt; Bob\n@enduml</code></pre>' +
      '<pre><code>graph TD\nA--&gt;B</code></pre>'
    )
    const hits = detectSourceBlocks(root, { handlePlantuml: false })
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('mermaid')
  })

  it('handlePlantuml:true — detects plantuml blocks normally', () => {
    const root = dom('<pre><code>@startuml\nAlice -&gt; Bob\n@enduml</code></pre>')
    const hits = detectSourceBlocks(root, { handlePlantuml: true })
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('plantuml')
  })

  it('handlePlantuml default (no opts) — detects plantuml blocks normally', () => {
    const root = dom('<pre><code>@startuml\nAlice -&gt; Bob\n@enduml</code></pre>')
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('plantuml')
  })

  it('detects a rehype-pretty-code mermaid block (data-language attr, line spans, no newlines, %%{init}%% first line)', () => {
    const root = dom(
      '<figure data-rehype-pretty-code-figure><div class="group relative"><pre tabindex="0" data-language="mermaid" data-theme="github-dark"><code data-language="mermaid">' +
      "<span data-line>%%{init: {'theme':'base'}}%%</span>" +
      '<span data-line>flowchart LR</span>' +
      '<span data-line>  A --&gt; B --&gt; C</span>' +
      '</code></pre><button>Copy</button></div></figure>',
    )
    const hits = detectSourceBlocks(root)
    expect(hits).toHaveLength(1)
    expect(hits[0].sourceFormat).toBe('mermaid')
  })
})

describe('detectRenderedDiagrams', () => {
  it('finds an svg with a mermaid- id', () => {
    const root = dom('<div><svg id="mermaid-17"></svg></div>')
    expect(detectRenderedDiagrams(root)).toHaveLength(1)
  })
  it('finds an svg with aria-roledescription', () => {
    const root = dom('<svg aria-roledescription="flowchart-v2"></svg>')
    expect(detectRenderedDiagrams(root)).toHaveLength(1)
  })
  it('finds a .mermaid > svg wrapper', () => {
    const root = dom('<div class="mermaid"><svg></svg></div>')
    expect(detectRenderedDiagrams(root)).toHaveLength(1)
  })
  it('ignores unrelated svgs', () => {
    const root = dom('<svg class="octicon"></svg>')
    expect(detectRenderedDiagrams(root)).toHaveLength(0)
  })
})
