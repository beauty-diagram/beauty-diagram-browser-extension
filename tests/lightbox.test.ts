import { describe, it, expect, beforeEach } from 'vitest'
import { openLightbox, closeLightbox } from '../src/lightbox'

function makePreview(inner = '<svg width="100" height="60"><rect width="100" height="60"/></svg>'): HTMLElement {
  const preview = document.createElement('div')
  preview.className = 'bd-preview'
  preview.innerHTML = inner
  document.body.appendChild(preview)

  // jsdom getBoundingClientRect returns zeros; mock the visual element
  const visual = preview.querySelector('svg, img') as Element | null
  if (visual) {
    visual.getBoundingClientRect = () => ({
      width: 100, height: 60,
      top: 0, left: 0, right: 100, bottom: 60,
      x: 0, y: 0,
      toJSON() { return this },
    } as DOMRect)
  }

  return preview
}

describe('openLightbox / closeLightbox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    closeLightbox()
  })

  it('appends one .bd-lightbox to body containing a cloned svg with bd-lightbox-fig class', () => {
    const preview = makePreview()
    openLightbox(preview)
    const overlays = document.body.querySelectorAll('.bd-lightbox')
    expect(overlays).toHaveLength(1)
    const fig = overlays[0].querySelector('.bd-lightbox-fig')
    expect(fig).not.toBeNull()
    expect(fig!.tagName.toLowerCase()).toBe('svg')
  })

  it('a second openLightbox does not stack — still only one overlay', () => {
    const preview = makePreview()
    openLightbox(preview)
    openLightbox(preview)
    expect(document.body.querySelectorAll('.bd-lightbox')).toHaveLength(1)
  })

  it('closeLightbox removes the overlay', () => {
    const preview = makePreview()
    openLightbox(preview)
    expect(document.body.querySelector('.bd-lightbox')).not.toBeNull()
    closeLightbox()
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })

  it('dispatching keydown Escape removes the overlay', () => {
    const preview = makePreview()
    openLightbox(preview)
    expect(document.body.querySelector('.bd-lightbox')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })

  it('clicking the overlay backdrop (target === overlay) removes it', () => {
    const preview = makePreview()
    openLightbox(preview)
    const overlay = document.body.querySelector('.bd-lightbox') as HTMLElement
    expect(overlay).not.toBeNull()
    // Simulate backdrop click: target is the overlay itself
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })

  it('openLightbox on a preview with no svg/img is a no-op', () => {
    const preview = document.createElement('div')
    preview.className = 'bd-preview'
    preview.textContent = 'just text'
    document.body.appendChild(preview)
    openLightbox(preview)
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })

  it('contains a close button and hint', () => {
    const preview = makePreview()
    openLightbox(preview)
    const overlay = document.body.querySelector('.bd-lightbox')!
    expect(overlay.querySelector('.bd-lightbox-close')).not.toBeNull()
    expect(overlay.querySelector('.bd-lightbox-hint')).not.toBeNull()
  })

  it('clicking the close button removes the overlay', () => {
    const preview = makePreview()
    openLightbox(preview)
    const closeBtn = document.body.querySelector('.bd-lightbox-close') as HTMLButtonElement
    closeBtn.click()
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })

  it('no document keydown listener leaks after close', () => {
    const preview = makePreview()
    openLightbox(preview)
    closeLightbox()
    // After close, ESC should not throw or attempt anything on a removed overlay
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    }).not.toThrow()
    // No overlay exists
    expect(document.body.querySelector('.bd-lightbox')).toBeNull()
  })
})
