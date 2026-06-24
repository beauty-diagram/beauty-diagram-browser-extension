import type { SourceHit } from './detector'
import type { RenderAdapter, RenderInput } from './render-adapter'
import { shortHash } from './hash'
import { buildBar } from './toggle'

const PROCESSED_ATTR = 'data-bd-processed'

export interface SwapDeps {
  adapter: RenderAdapter
  defaultTheme: string
  editorWebBase?: string
  theme?: string // explicit override (e.g. from a directive); takes precedence over defaultTheme (processHit uses `deps.theme ?? deps.defaultTheme`)
  renderMode?: 'img' | 'inline-svg'
  imageWidth?: string
  shareMode?: boolean
}

/**
 * Walk the siblings of `afterNode` to find and remove a trailing
 * `<!-- bd:inline-img -->` ... `<!-- /bd:inline-img -->` marker block.
 *
 * Algorithm:
 * 1. Skip whitespace-only Text nodes.
 * 2. If the first non-whitespace sibling is a Comment matching
 *    /^\s*bd:inline-img\b/, remove everything from that opening comment
 *    through and including the first following Comment matching
 *    /^\s*\/bd:inline-img\b/.
 * 3. If the first non-whitespace sibling is anything else, do nothing.
 */
function removeAdjacentMarker(afterNode: Node): void {
  const parent = afterNode.parentNode
  if (!parent) return

  // Find the first non-whitespace sibling after afterNode.
  let sibling: ChildNode | null = afterNode.nextSibling
  while (sibling !== null) {
    if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent?.trim() === '') {
      sibling = sibling.nextSibling
      continue
    }
    break
  }

  // If it's a Comment with bd:inline-img opener, collect and remove.
  if (
    sibling !== null &&
    sibling.nodeType === Node.COMMENT_NODE &&
    /^\s*bd:inline-img\b/.test((sibling as Comment).data)
  ) {
    const toRemove: ChildNode[] = []
    let cur: ChildNode | null = sibling
    let foundClose = false
    while (cur !== null) {
      toRemove.push(cur)
      if (
        cur !== sibling &&
        cur.nodeType === Node.COMMENT_NODE &&
        /^\s*\/bd:inline-img\b/.test((cur as Comment).data)
      ) {
        foundClose = true
        break
      }
      cur = cur.nextSibling
    }
    // Only remove when both opening AND closing comments were found.
    // If the closing comment is absent (malformed/truncated DOM), do nothing —
    // silently destroying unrelated trailing content is worse than leaving the marker.
    if (foundClose) {
      for (const node of toRemove) {
        parent.removeChild(node)
      }
    }
  }
}

export async function processHit(hit: SourceHit, deps: SwapDeps): Promise<void> {
  const theme = deps.theme ?? deps.defaultTheme
  const hash = await shortHash(`${hit.source}\0${theme}\0${hit.sourceFormat}`)

  // Idempotency: if this node is already our mount with the same hash, skip.
  const existing = hit.node.closest('.bd-mount')
  if (existing && existing.getAttribute(PROCESSED_ATTR) === hash) return

  const input: RenderInput = {
    source: hit.source,
    sourceFormat: hit.sourceFormat,
    theme,
    bg: hit.bgOverride,
    renderMode: deps.renderMode,
    shareMode: deps.shareMode,
  }
  const result = await deps.adapter.render(input)
  if (!result) return // fallback: leave native render

  const mount = document.createElement('div')
  mount.className = 'bd-mount'
  mount.setAttribute(PROCESSED_ATTR, hash)
  mount.setAttribute('data-bd-format', hit.sourceFormat)

  const preview = document.createElement('div')
  preview.className = 'bd-preview'
  if (deps.imageWidth && deps.imageWidth !== 'full') {
    preview.style.maxWidth = deps.imageWidth
  }
  if (result.kind === 'img-url') {
    const img = document.createElement('img')
    img.src = result.url
    img.alt = hit.source.split('\n')[0].slice(0, 120)
    preview.appendChild(img)
  } else {
    // markup is pre-sanitized by the background worker (sanitizeSvg) before it reaches
    // here; only Beauty Diagram API output is ever assigned. Do not assign untrusted HTML.
    preview.innerHTML = result.markup
  }

  const sourceView = document.createElement('div')
  sourceView.className = 'bd-source'
  sourceView.setAttribute('hidden', '')
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.textContent = hit.source
  pre.appendChild(code)
  sourceView.appendChild(pre)

  const bar = buildBar({
    mount,
    source: hit.source,
    sourceFormat: hit.sourceFormat,
    theme,
    editorWebBase: deps.editorWebBase,
  })

  mount.append(preview, sourceView, bar)

  // Replace the original node (or an existing stale mount) in place.
  const target = existing ?? hit.node
  target.replaceWith(mount)

  // Gap A: remove any trailing bd:inline-img marker block that was injected
  // by a prior `bd extract` run, so the user doesn't see a double image.
  removeAdjacentMarker(mount)
}
