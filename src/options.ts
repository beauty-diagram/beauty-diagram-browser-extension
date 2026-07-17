import { loadSettings, saveSettings, getApiKey, setApiKey, type Settings } from './settings'
import { FALLBACK_THEMES } from './constants'
import type { VerifyKeyRequest, VerifyKeyResponse } from './messages'

/**
 * Pre-flight verdict for watermark-free, shown after Verify key so the user
 * learns a key can't produce watermark-free renders BEFORE seeing a stubbornly
 * watermarked diagram. Two independent gates must both pass:
 *   1. Owner plan is Pro+ (the server keeps the watermark for free owners).
 *   2. The key carries the 'share:write' scope — labelled “Create share links”
 *      in the web key UI. Without it, minting a share 403s and the render
 *      silently falls back to the watermarked path.
 * Returns '' when plan is Pro+ but scopes are absent (older API that doesn't
 * report them) so we never assert "missing scope" on incomplete data.
 */
export function watermarkFreeStatus(plan: string | undefined, scopes: string[] | undefined): string {
  if (plan === 'free') return 'Watermark-free needs a Pro plan'
  if (!scopes) return ''
  return scopes.includes('share:write')
    ? 'Watermark-free: ready'
    : 'Watermark-free: key missing the “Create share links” scope'
}

export function readForm(): Settings {
  const theme = (document.getElementById('defaultTheme') as HTMLSelectElement).value
  const apiBase = (document.getElementById('apiBase') as HTMLInputElement).value
  const replaceRendered = (document.getElementById('replaceRendered') as HTMLInputElement).checked
  const defaultImageWidth = (document.getElementById('defaultImageWidth') as HTMLInputElement).value
  const handlePlantuml = (document.getElementById('handlePlantuml') as HTMLInputElement).checked
  const watermarkFree = (document.getElementById('watermarkFree') as HTMLInputElement).checked
  return { defaultTheme: theme, apiBase, replaceRendered, defaultImageWidth, handlePlantuml, watermarkFree }
}

/**
 * Wire the options page. Listeners are attached SYNCHRONOUSLY (before any await)
 * so a failure loading stored settings can't leave Save/Verify inert — the same
 * root cause that broke the popup. Loading current values runs afterwards in a
 * try/catch; the Save/Verify handlers read live DOM values at click time, so
 * they work regardless.
 */
export function initOptions(): void {
  const sel = document.getElementById('defaultTheme') as HTMLSelectElement | null
  if (!sel) return
  for (const t of FALLBACK_THEMES) {
    const o = document.createElement('option')
    o.value = t
    o.textContent = t
    sel.appendChild(o)
  }

  document.getElementById('save')?.addEventListener('click', async () => {
    const form = readForm()
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value
    await saveSettings(form) // synced settings (excludes apiKey)
    await setApiKey(apiKey) // apiKey is local-only
    const status = document.getElementById('status')
    if (status) {
      // Watermark-free needs a key to mint share links; with the box on but no
      // key the toggle is inert and renders silently stay watermarked. Say so at
      // save time instead of letting the user discover it on the page.
      const inert = form.watermarkFree && !apiKey.trim()
      status.textContent = inert
        ? 'Saved — but Watermark-free needs an API key above to take effect.'
        : 'Saved.'
      setTimeout(() => { status.textContent = '' }, inert ? 4000 : 1500)
    }
  })

  document.getElementById('verifyKey')?.addEventListener('click', async () => {
    const verifyStatus = document.getElementById('verifyStatus')
    if (verifyStatus) verifyStatus.textContent = 'Verifying…'
    await setApiKey((document.getElementById('apiKey') as HTMLInputElement).value)
    const msg: VerifyKeyRequest = { type: 'bd-verify-key' }
    chrome.runtime.sendMessage(msg, (res: VerifyKeyResponse) => {
      void chrome.runtime.lastError
      if (!verifyStatus) return
      if (!res) { verifyStatus.textContent = 'Error: no response from background.'; return }
      if (!res.ok) { verifyStatus.textContent = `Error: ${res.error ?? 'unknown'}`; return }
      const limitStr = res.limit == null ? '∞' : String(res.limit)
      const wm = watermarkFreeStatus(res.plan, res.scopes)
      verifyStatus.textContent =
        `✓ Plan: ${res.plan ?? '?'} · Exports: ${res.used ?? 0} / ${limitStr}` +
        (wm ? ` · ${wm}` : '')
    })
  })

  // Load current values asynchronously; failures log but never break the controls.
  void (async () => {
    try {
      const s = await loadSettings()
      sel.value = s.defaultTheme
      ;(document.getElementById('apiBase') as HTMLInputElement).value = s.apiBase
      ;(document.getElementById('replaceRendered') as HTMLInputElement).checked = s.replaceRendered
      ;(document.getElementById('defaultImageWidth') as HTMLInputElement).value = s.defaultImageWidth
      ;(document.getElementById('handlePlantuml') as HTMLInputElement).checked = s.handlePlantuml
      ;(document.getElementById('watermarkFree') as HTMLInputElement).checked = s.watermarkFree
      ;(document.getElementById('apiKey') as HTMLInputElement).value = await getApiKey()
    } catch (err) {
      console.error('[beauty-diagram] options state load failed (controls still work)', err)
    }
  })()
}

if (typeof chrome !== 'undefined' && (chrome as { runtime?: unknown }).runtime && document.getElementById('save')) {
  console.log('[beauty-diagram] options script loaded')
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptions)
  } else {
    initOptions()
  }
}
