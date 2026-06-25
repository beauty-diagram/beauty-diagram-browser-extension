import { editorLink } from './editor-link'
import { openLightbox } from './lightbox'
import type { SourceFormat } from './types'

export interface BarOptions {
  mount: HTMLElement
  source: string
  sourceFormat: SourceFormat
  theme: string
  editorWebBase?: string
}

function button(cls: string, label: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = cls
  b.textContent = label
  return b
}

const LABEL_SOURCE = '</> Source'
const LABEL_PREVIEW = '🖼 Preview'

export function buildBar(opts: BarOptions): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'bd-bar'

  const toggle = button('bd-toggle', LABEL_SOURCE)
  toggle.addEventListener('click', () => {
    const preview = opts.mount.querySelector('.bd-preview') as HTMLElement | null
    const source = opts.mount.querySelector('.bd-source') as HTMLElement | null
    if (!preview || !source) return
    const showingSource = !source.hasAttribute('hidden')
    if (showingSource) {
      source.setAttribute('hidden', '')
      preview.removeAttribute('hidden')
      toggle.textContent = LABEL_SOURCE
    } else {
      preview.setAttribute('hidden', '')
      source.removeAttribute('hidden')
      toggle.textContent = LABEL_PREVIEW
    }
  })

  const copy = button('bd-copy', '⧉ Copy')
  copy.addEventListener('click', () => {
    navigator.clipboard?.writeText(opts.source).catch(() => { /* copy failed (focus/permission) — ignore, no UI yet */ })
  })

  const zoom = button('bd-zoom', '⤢ Zoom')
  zoom.addEventListener('click', () => {
    const preview = opts.mount.querySelector('.bd-preview') as HTMLElement | null
    if (preview) openLightbox(preview)
  })

  const edit = document.createElement('a')
  edit.className = 'bd-edit'
  edit.textContent = '↗ Open in editor'
  edit.target = '_blank'
  edit.rel = 'noopener noreferrer'
  edit.href = editorLink({
    source: opts.source,
    sourceFormat: opts.sourceFormat,
    theme: opts.theme,
    webBase: opts.editorWebBase,
  })

  bar.append(toggle, copy, zoom, edit)
  return bar
}
