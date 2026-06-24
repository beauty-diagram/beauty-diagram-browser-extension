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

/** Pure helper — returns contextual status text for the popup's "This site" section */
export function siteStatusText(o: { hasOrigin: boolean; isAuto: boolean; enabled: boolean }): string {
  if (!o.hasOrigin) return 'Not available on this page'
  if (o.isAuto) return o.enabled ? '✓ Built-in support — active here' : 'Built-in support — turned off here'
  return o.enabled ? 'Active on this site' : 'Off — turn on to beautify mermaid here'
}

/** Pure helper — a site is "active" iff it's built-in OR we already hold its host
 *  permission, AND it hasn't been turned off. A non-built-in site with no granted
 *  permission must read as OFF even though the stored flag defaults to true. */
export function isSiteActive(o: { isAuto: boolean; hasPermission: boolean; flag: boolean }): boolean {
  return (o.isAuto || o.hasPermission) && o.flag
}

function hasHostPermission(origin: string): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.permissions.contains({ origins: [`${origin}/*`] }, (granted) => resolve(!!granted)),
  )
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
  const statusEl = document.getElementById('siteStatus')
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
      const u = new URL(origin)
      const matchPattern = `${u.protocol}//${u.hostname}/*`
      const scriptId = 'bd-' + origin.replace(/[^a-z0-9]+/gi, '-')
      if (checked) {
        let granted = false
        try {
          granted = await chrome.permissions.request({ origins: [matchPattern] })
        } catch (err) {
          console.error('[beauty-diagram] permission request failed', err)
          ;(e.target as HTMLInputElement).checked = false
          return
        }
        if (!granted) { (e.target as HTMLInputElement).checked = false; return }
        try {
          try { await chrome.scripting.unregisterContentScripts({ ids: [scriptId] }) } catch { /* none yet */ }
          await chrome.scripting.registerContentScripts([{
            id: scriptId, matches: [matchPattern], js: ['dist/content.js'], css: ['content.css'], runAt: 'document_idle',
          }])
        } catch (err) {
          console.error('[beauty-diagram] registerContentScripts failed', err)
          ;(e.target as HTMLInputElement).checked = false
          return
        }
      } else {
        try { await chrome.scripting.unregisterContentScripts({ ids: [scriptId] }) } catch { /* noop */ }
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
        const isAuto = isAutoSite(origin)
        const hasPerm = isAuto ? true : await hasHostPermission(origin)
        const flag = await isSiteEnabled(origin)
        const active = isSiteActive({ isAuto, hasPermission: hasPerm, flag })
        siteEl.checked = active
        if (statusEl) statusEl.textContent = siteStatusText({ hasOrigin: true, isAuto, enabled: active })
      } else {
        siteEl.disabled = true
        document.getElementById('siteRow')?.classList.add('off')
        if (statusEl) statusEl.textContent = siteStatusText({ hasOrigin: false, isAuto: false, enabled: false })
        if (hostEl) hostEl.textContent = ''
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
