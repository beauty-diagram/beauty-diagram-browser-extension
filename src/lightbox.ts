let activeOverlay: HTMLElement | null = null
let activeKeydown: ((e: KeyboardEvent) => void) | null = null

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export function closeLightbox(): void {
  if (!activeOverlay) return
  activeOverlay.remove()
  activeOverlay = null
  if (activeKeydown) {
    document.removeEventListener('keydown', activeKeydown)
    activeKeydown = null
  }
}

export function openLightbox(previewEl: HTMLElement): void {
  // Close any existing lightbox first
  closeLightbox()

  const visual = previewEl.querySelector('svg, img') as SVGElement | HTMLImageElement | null
  if (!visual) return

  const r = visual.getBoundingClientRect()

  const fig = visual.cloneNode(true) as HTMLElement
  fig.classList.add('bd-lightbox-fig')
  fig.style.width = r.width + 'px'
  fig.style.height = r.height + 'px'
  fig.removeAttribute('hidden')

  let scale = 1
  let tx = 0
  let ty = 0

  function apply() {
    fig.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`
  }

  // Fit to viewport on open
  scale = Math.min(1, (window.innerWidth * 0.92) / r.width, (window.innerHeight * 0.86) / r.height)
  tx = (window.innerWidth - r.width * scale) / 2
  ty = (window.innerHeight - r.height * scale) / 2
  apply()

  const overlay = document.createElement('div')
  overlay.className = 'bd-lightbox'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  const closeBtn = document.createElement('button')
  closeBtn.className = 'bd-lightbox-close'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    closeLightbox()
  })

  const hint = document.createElement('div')
  hint.className = 'bd-lightbox-hint'
  hint.textContent = 'scroll to zoom · drag to pan · esc to close'

  overlay.append(fig, closeBtn, hint)
  document.body.appendChild(overlay)
  activeOverlay = overlay

  // Wheel zoom anchored to cursor
  overlay.addEventListener('wheel', (e) => {
    e.preventDefault()
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const ns = clamp(scale * f, 0.2, 8)
    tx = e.clientX - (e.clientX - tx) * (ns / scale)
    ty = e.clientY - (e.clientY - ty) * (ns / scale)
    scale = ns
    apply()
  }, { passive: false })

  // Drag pan
  let dragging = false
  let dragStartX = 0
  let dragStartY = 0
  let dragTx = 0
  let dragTy = 0

  overlay.addEventListener('pointerdown', (e) => {
    // Don't start drag on close button
    if ((e.target as HTMLElement).closest('.bd-lightbox-close')) return
    dragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragTx = tx
    dragTy = ty
    overlay.style.cursor = 'grabbing'
    if (typeof (overlay as any).setPointerCapture === 'function') {
      (overlay as any).setPointerCapture(e.pointerId)
    }
  })

  overlay.addEventListener('pointermove', (e) => {
    if (!dragging) return
    tx = dragTx + (e.clientX - dragStartX)
    ty = dragTy + (e.clientY - dragStartY)
    apply()
  })

  const stopDrag = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    overlay.style.cursor = 'grab'
    if (typeof (overlay as any).releasePointerCapture === 'function') {
      try { (overlay as any).releasePointerCapture(e.pointerId) } catch {}
    }
  }
  overlay.addEventListener('pointerup', stopDrag)
  overlay.addEventListener('pointercancel', stopDrag)

  // Close on backdrop click (target is overlay itself, not a child)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox()
  })

  // Close on ESC
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
  }
  activeKeydown = onKeydown
  document.addEventListener('keydown', onKeydown)
}
