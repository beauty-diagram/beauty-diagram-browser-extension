import { detectSourceBlocks, detectRenderedDiagrams, type SourceHit } from './detector'
import { processHit, type SwapDeps } from './swap'
import { ApiRenderAdapter, type RenderAdapter } from './render-adapter'
import { startObserver } from './observer'
import { loadSettings, isSiteEnabled, getApiKey } from './settings'
import { matchQuirks, type SiteQuirks } from './quirks'
import { parseDirective, isExcluded } from './directives'
import type { FetchSvgRequest, FetchSvgResponse, MintShareRequest, MintShareResponse } from './messages'
import { DEFAULT_API_BASE } from './constants'
import type { SourceFormat } from './types'

export interface ScanContext {
  adapter: RenderAdapter
  defaultTheme: string
  quirks: SiteQuirks | null
  editorWebBase?: string
  replaceRendered?: boolean
  imageWidth?: string
  handlePlantuml?: boolean
  shareMode?: boolean
}

export async function scanOnce(ctx: ScanContext): Promise<void> {
  const renderMode = ctx.quirks?.renderMode
  const base = {
    adapter: ctx.adapter,
    defaultTheme: ctx.defaultTheme,
    editorWebBase: ctx.editorWebBase,
    renderMode,
    imageWidth: ctx.imageWidth,
    shareMode: ctx.shareMode,
  }
  // A: unrendered source blocks — attach an opt-in "Render" affordance instead of auto-rendering
  for (const hit of detectSourceBlocks(document.body, { handlePlantuml: ctx.handlePlantuml })) {
    const node = hit.node as HTMLElement
    if (node.closest('.bd-mount') || node.dataset.bdAffordance) continue
    attachRenderAffordance(hit, { ...base, theme: hit.themeOverride })
  }
  // B: already-rendered diagrams (GitHub etc.) — needs quirk.recoverSource for the source
  if (ctx.replaceRendered !== false && ctx.quirks?.recoverSource) {
    const rendered = ctx.quirks.detectRendered
      ? ctx.quirks.detectRendered(document.body)
      : detectRenderedDiagrams(document.body)
    for (const node of rendered) {
      if (node.closest('.bd-mount')) continue
      const recovered = ctx.quirks.recoverSource(node)
      if (!recovered) continue
      const { overrides, source } = parseDirective('mermaid', recovered)
      if (isExcluded(overrides)) continue
      ctx.quirks.hideNativeRender?.(node)
      const ghHit = {
        source,
        sourceFormat: 'mermaid' as const,
        node,
        themeOverride: overrides.theme,
        bgOverride: overrides.bg,
      }
      try {
        await processHit(ghHit, { ...base, theme: ghHit.themeOverride })
      } catch (err) {
        console.debug('[beauty-diagram] processHit failed; leaving native render', err)
      }
    }
  }
}

function attachRenderAffordance(hit: SourceHit, deps: SwapDeps): void {
  const node = hit.node as HTMLElement
  node.dataset.bdAffordance = '1'
  // Make the button positionable without disturbing the code text.
  if (getComputedStyle(node).position === 'static') node.style.position = 'relative'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'bd-render-btn'
  btn.textContent = '◇ Render'
  btn.setAttribute('aria-label', 'Render with Beauty Diagram')
  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await processHit(hit, deps) // replaces the code block (incl. this button) with the rendered mount
    } catch (err) {
      console.debug('[beauty-diagram] render failed; leaving code block', err)
    }
  })
  node.appendChild(btn)
}

function fetchViaBackground(url: string): Promise<FetchSvgResponse> {
  const msg: FetchSvgRequest = { type: 'bd-fetch-svg', url }
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(msg, (res: FetchSvgResponse) => {
      // Read lastError so Chrome doesn't log an unchecked "Could not establish
      // connection" error when the service worker is asleep on first call.
      void chrome.runtime.lastError
      resolve(res ?? { ok: false, status: 0, body: '' })
    }),
  )
}

function mintShareViaBackground(
  input: { source: string; sourceFormat: SourceFormat; theme: string },
): Promise<{ token: string } | null> {
  const msg: MintShareRequest = {
    type: 'bd-mint-share',
    source: input.source,
    sourceFormat: input.sourceFormat,
    theme: input.theme,
  }
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(msg, (res: MintShareResponse) => {
      void chrome.runtime.lastError
      if (res?.ok && res.token) {
        resolve({ token: res.token })
      } else {
        resolve(null)
      }
    }),
  )
}

async function main(): Promise<void> {
  if ((window as any).__bdInit) return
  ;(window as any).__bdInit = true
  const settings = await loadSettings()
  if (!(await isSiteEnabled(location.origin))) return
  const apiKey = await getApiKey()
  const shareMode = settings.watermarkFree && !!apiKey
  const quirks = matchQuirks(location.hostname)
  const adapter = new ApiRenderAdapter({
    apiBase: settings.apiBase ?? DEFAULT_API_BASE,
    fetchViaBackground,
    mintShare: shareMode ? mintShareViaBackground : undefined,
  })
  const ctx: ScanContext = {
    adapter,
    defaultTheme: settings.defaultTheme,
    quirks,
    replaceRendered: settings.replaceRendered,
    editorWebBase: 'https://www.beauty-diagram.com',
    imageWidth: settings.defaultImageWidth,
    handlePlantuml: settings.handlePlantuml,
    shareMode,
  }
  quirks?.spaNav?.(() => void scanOnce(ctx))
  startObserver(() => void scanOnce(ctx))
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  void main()
}
