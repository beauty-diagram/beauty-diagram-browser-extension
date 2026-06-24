import type { SourceFormat } from './types'
import { parseDirective, isExcluded } from './directives'

export type SourceHit = {
  source: string
  sourceFormat: SourceFormat
  node: Element
  themeOverride?: string
  bgOverride?: string
}

const MERMAID_HEAD =
  /^\s*(?:%%\{[\s\S]*?\}%%\s*)?(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|sankey(-beta)?|xychart(-beta)?|block(-beta)?|C4Context|C4Container|C4Component|C4Dynamic)\b/
const PLANTUML_HEAD = /^\s*@start(uml|mindmap|gantt|salt|json|yaml|wbs)\b/

/** Classify a raw code-block text. Returns null if it isn't a diagram source. */
export function classifySource(raw: string, langHint?: string): SourceFormat | null {
  const text = raw.replace(/\r\n/g, '\n')
  const hint = (langHint ?? '').toLowerCase()
  if (hint.includes('mermaid') || MERMAID_HEAD.test(text)) return 'mermaid'
  if (hint.includes('plantuml') || PLANTUML_HEAD.test(text)) return 'plantuml'
  return null
}

function langHintOf(code: Element): string {
  const cls = code.getAttribute('class') ?? ''
  return cls
}

/** Strip leading `%% bd:*` or `' bd:*` comment directive lines so that
 *  classifySource can find the grammar keyword even when a directive appears
 *  on the very first line. */
function stripLeadingDirectiveLines(raw: string): string {
  const mmDirective = /^\s*%%\s*bd:\w+(?:=[\w-]+)?\s*(\n|$)/
  const puDirective = /^\s*'\s*bd:\w+(?:=[\w-]+)?\s*(\n|$)/
  let text = raw
  while (mmDirective.test(text) || puDirective.test(text)) {
    const nl = text.indexOf('\n')
    if (nl === -1) { text = ''; break }
    text = text.slice(nl + 1)
  }
  return text
}

/** Detector A: scan for code blocks whose text is a mermaid/plantuml source. */
export function detectSourceBlocks(root: ParentNode, opts?: { handlePlantuml?: boolean }): SourceHit[] {
  const hits: SourceHit[] = []
  const codes = root.querySelectorAll('pre > code, code[class*="mermaid"], code[class*="plantuml"]')
  for (const code of Array.from(codes)) {
    const raw = code.textContent ?? ''
    if (!raw.trim()) continue
    const hint = langHintOf(code)
    // Try classifying on raw first; if directives on line 1 hide the keyword,
    // retry on the directive-stripped text.
    let fmt = classifySource(raw, hint)
    if (!fmt) fmt = classifySource(stripLeadingDirectiveLines(raw), hint)
    if (!fmt) continue
    if (fmt === 'plantuml' && opts?.handlePlantuml === false) continue
    const { overrides, source } = parseDirective(fmt, raw)
    if (isExcluded(overrides)) continue
    // mount target is the enclosing <pre> when present, else the <code>
    const node = code.closest('pre') ?? code
    // Gap B: propagate theme + bg directives to SourceHit
    const themeOverride: string | undefined = overrides.theme
    const bgOverride: string | undefined = overrides.bg
    hits.push({
      source,
      sourceFormat: fmt,
      node,
      ...(themeOverride !== undefined ? { themeOverride } : {}),
      ...(bgOverride !== undefined ? { bgOverride } : {}),
    })
  }
  return hits
}

/** Detector B: find SVGs that look like mermaid.js output. Returns the
 *  outermost replaceable node for each (the .mermaid wrapper if present). */
export function detectRenderedDiagrams(root: ParentNode): Element[] {
  const out = new Set<Element>()
  const svgs = root.querySelectorAll('svg[id^="mermaid-"], svg[aria-roledescription], .mermaid > svg')
  for (const svg of Array.from(svgs)) {
    out.add(svg.closest('.mermaid') ?? svg)
  }
  return Array.from(out)
}
