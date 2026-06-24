import { FALLBACK_THEMES } from './constants'
import { loadSettings, saveSettings, isSiteEnabled, setSiteEnabled } from './settings'
import { isDefaultSite } from './sites'

/** Pure helper — testable in jsdom without chrome */
export function isAutoSite(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.protocol === 'https:' && isDefaultSite(u.host)
  } catch { return false }
}

/**
 * Wire the popup. Listeners are attached SYNCHRONOUSLY (before any await) so a
 * failure while loading async state (chrome.tabs.query / storage) can never
 * leave the controls inert — that was the root cause of the "dead popup" bug.
 * Async state-loading runs afterwards inside a try/catch.
 */
export function initPopup(): void {
  const siteEl = document.getElementById('siteEnabled') as HTMLInputElement | null
  const replaceEl = document.getElementById('replaceRendered') as HTMLInputElement | null
  const themeEl = document.getElementById('defaultTheme') as HTMLSelectElement | null
  const widthSeg = document.getElementById('widthSeg')
  const hostEl = document.getElementById('siteHost')
  if (!siteEl || !replaceEl || !themeEl || !widthSeg) return
  const widthBtns = Array.from(widthSeg.querySelectorAll('button'))

  // Theme options (capitalised label, lowercase value) — synchronous
  for (const t of FALLBACK_THEMES) {
    const opt = document.createElement('option')
    opt.value = t
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1)
    themeEl.appendChild(opt)
  }

  // State resolved asynchronously below; handlers read these lazily.
  let tabId: number | undefined
  let origin: string | null = null

  const reloadAndClose = async () => {
    if (tabId != null) { try { await chrome.tabs.reload(tabId) } catch { /* tab gone */ } }
    window.close()
  }

  // --- Attach ALL listeners synchronously ---
  siteEl.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked
    if (!origin) return
    if (!isAutoSite(origin)) {
      if (checked) {
        const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
        if (!granted) { (e.target as HTMLInputElement).checked = false; return }
        const id = `bd-${origin}`
        try {
          try { await chrome.scripting.unregisterContentScripts({ ids: [id] }) } catch { /* none yet */ }
          await chrome.scripting.registerContentScripts([{
            id, matches: [`${origin}/*`], js: ['dist/content.js'], css: ['content.css'], runAt: 'document_idle',
          }])
        } catch (err) {
          console.error('[beauty-diagram] registerContentScripts failed', err)
          ;(e.target as HTMLInputElement).checked = false
          return
        }
      } else {
        try { await chrome.scripting.unregisterContentScripts({ ids: [`bd-${origin}`] }) } catch { /* noop */ }
      }
    }
    await setSiteEnabled(origin, checked)
    await reloadAndClose()
  })

  replaceEl.addEventListener('change', async (e) => {
    await saveSettings({ replaceRendered: (e.target as HTMLInputElement).checked })
    await reloadAndClose()
  })

  themeEl.addEventListener('change', async (e) => {
    await saveSettings({ defaultTheme: (e.target as HTMLSelectElement).value })
    await reloadAndClose()
  })

  for (const btn of widthBtns) {
    btn.addEventListener('click', async () => {
      widthBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)))
      await saveSettings({ defaultImageWidth: btn.dataset.width || 'full' })
      await reloadAndClose()
    })
  }

  document.getElementById('openOptions')?.addEventListener('click', () => chrome.runtime.openOptionsPage())

  // --- Load current state asynchronously; failures log but never break the UI ---
  void (async () => {
    try {
      const settings = await loadSettings()
      themeEl.value = settings.defaultTheme
      replaceEl.checked = settings.replaceRendered
      const w = settings.defaultImageWidth || 'full'
      widthBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.width === w)))

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      tabId = tab?.id
      const url = tab?.url
      const isHttp = !!url && (url.startsWith('http://') || url.startsWith('https://'))
      origin = isHttp ? new URL(url).origin : null
      if (origin) {
        if (hostEl) hostEl.textContent = origin.replace(/^https?:\/\//, '')
        siteEl.checked = await isSiteEnabled(origin)
      } else {
        if (hostEl) hostEl.textContent = 'Not available on this page'
        siteEl.disabled = true
        document.getElementById('siteRow')?.classList.add('off')
      }
    } catch (err) {
      console.error('[beauty-diagram] popup state load failed (controls still work)', err)
    }
  })()
}

if (typeof chrome !== 'undefined' && (chrome as { runtime?: unknown }).runtime) {
  console.log('[beauty-diagram] popup script loaded')
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup)
  } else {
    initPopup()
  }
}
