import { detectSourceBlocks, detectRenderedDiagrams } from './detector'
import { processHit } from './swap'
import { ApiRenderAdapter, type RenderAdapter } from './render-adapter'
import { startObserver } from './observer'
import { loadSettings, isSiteEnabled } from './settings'
import { matchQuirks, type SiteQuirks } from './quirks'
import type { FetchSvgRequest, FetchSvgResponse } from './messages'
import { DEFAULT_API_BASE } from './constants'

export interface ScanContext {
  adapter: RenderAdapter
  defaultTheme: string
  quirks: SiteQuirks | null
  editorWebBase?: string
  replaceRendered?: boolean
}

export async function scanOnce(ctx: ScanContext): Promise<void> {
  const renderMode = ctx.quirks?.renderMode
  const base = { adapter: ctx.adapter, defaultTheme: ctx.defaultTheme, editorWebBase: ctx.editorWebBase, renderMode }
  // A: unrendered source blocks (works everywhere; only path for Jira/Confluence)
  for (const hit of detectSourceBlocks(document.body)) {
    if (hit.node.closest('.bd-mount')) continue
    try {
      await processHit(hit, { ...base, theme: hit.themeOverride })
    } catch (err) {
      console.debug('[beauty-diagram] processHit failed; leaving native render', err)
    }
  }
  // B: already-rendered diagrams (GitHub etc.) — needs quirk.recoverSource for the source
  if (ctx.replaceRendered !== false && ctx.quirks?.recoverSource) {
    const rendered = ctx.quirks.detectRendered
      ? ctx.quirks.detectRendered(document.body)
      : detectRenderedDiagrams(document.body)
    for (const node of rendered) {
      if (node.closest('.bd-mount')) continue
      const source = ctx.quirks.recoverSource(node)
      if (!source) continue
      ctx.quirks.hideNativeRender?.(node)
      try {
        await processHit({ source, sourceFormat: 'mermaid', node }, base)
      } catch (err) {
        console.debug('[beauty-diagram] processHit failed; leaving native render', err)
      }
    }
  }
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

async function main(): Promise<void> {
  if ((window as any).__bdInit) return
  ;(window as any).__bdInit = true
  const settings = await loadSettings()
  if (!(await isSiteEnabled(location.origin))) return
  const quirks = matchQuirks(location.hostname)
  const adapter = new ApiRenderAdapter({ apiBase: settings.apiBase ?? DEFAULT_API_BASE, fetchViaBackground })
  const ctx: ScanContext = {
    adapter,
    defaultTheme: settings.defaultTheme,
    quirks,
    replaceRendered: settings.replaceRendered,
    editorWebBase: 'https://www.beauty-diagram.com',
  }
  quirks?.spaNav?.(() => void scanOnce(ctx))
  startObserver(() => void scanOnce(ctx))
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  void main()
}
