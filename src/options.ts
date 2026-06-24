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

async function init(): Promise<void> {
  const sel = document.getElementById('defaultTheme') as HTMLSelectElement
  for (const t of FALLBACK_THEMES) {
    const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o)
  }
  const s = await loadSettings()
  sel.value = s.defaultTheme
  ;(document.getElementById('apiBase') as HTMLInputElement).value = s.apiBase
  ;(document.getElementById('replaceRendered') as HTMLInputElement).checked = s.replaceRendered
  ;(document.getElementById('defaultImageWidth') as HTMLInputElement).value = s.defaultImageWidth
  ;(document.getElementById('handlePlantuml') as HTMLInputElement).checked = s.handlePlantuml
  ;(document.getElementById('watermarkFree') as HTMLInputElement).checked = s.watermarkFree

  // apiKey lives in local storage — load separately (never part of Settings/sync)
  const storedKey = await getApiKey()
  ;(document.getElementById('apiKey') as HTMLInputElement).value = storedKey

  document.getElementById('save')!.addEventListener('click', async () => {
    // Save synced settings (excludes apiKey — that's local-only)
    await saveSettings(readForm())
    // Save apiKey to local storage separately
    const keyValue = (document.getElementById('apiKey') as HTMLInputElement).value
    await setApiKey(keyValue)
    const status = document.getElementById('status')!
    status.textContent = 'Saved.'
    setTimeout(() => { status.textContent = '' }, 1500)
  })

  document.getElementById('verifyKey')!.addEventListener('click', async () => {
    const verifyStatus = document.getElementById('verifyStatus')!
    verifyStatus.textContent = 'Verifying…'
    // Save the current key value first so the background worker uses the latest input
    const keyValue = (document.getElementById('apiKey') as HTMLInputElement).value
    await setApiKey(keyValue)
    const msg: VerifyKeyRequest = { type: 'bd-verify-key' }
    chrome.runtime.sendMessage(msg, (res: VerifyKeyResponse) => {
      void chrome.runtime.lastError
      if (!res) {
        verifyStatus.textContent = 'Error: no response from background.'
        return
      }
      if (!res.ok) {
        verifyStatus.textContent = `Error: ${res.error ?? 'unknown'}`
        return
      }
      const limitStr = res.limit == null ? '∞' : String(res.limit)
      verifyStatus.textContent = `✓ Plan: ${res.plan ?? '?'} · Exports: ${res.used ?? 0} / ${limitStr}`
    })
  })
}

if (typeof document !== 'undefined' && document.getElementById('save')) {
  void init()
}
