import { loadSettings, saveSettings, getApiKey, setApiKey, type Settings } from './settings'
import { FALLBACK_THEMES } from './constants'
import type { VerifyKeyRequest, VerifyKeyResponse } from './messages'

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
    await saveSettings(readForm()) // synced settings (excludes apiKey)
    await setApiKey((document.getElementById('apiKey') as HTMLInputElement).value) // apiKey is local-only
    const status = document.getElementById('status')
    if (status) {
      status.textContent = 'Saved.'
      setTimeout(() => { status.textContent = '' }, 1500)
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
      verifyStatus.textContent = `✓ Plan: ${res.plan ?? '?'} · Exports: ${res.used ?? 0} / ${limitStr}`
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
