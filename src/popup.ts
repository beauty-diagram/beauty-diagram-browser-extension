import { FALLBACK_THEMES } from './constants'
import { loadSettings, saveSettings, isSiteEnabled, setSiteEnabled } from './settings'

/** Pure helper — testable in jsdom without chrome */
export function isAutoSite(origin: string): boolean {
  return origin === 'https://github.com' || origin === 'https://gitlab.com'
}

// Only wire DOM/chrome APIs when actually running in the extension popup
if (
  typeof chrome !== 'undefined' &&
  (chrome as any).tabs &&
  document.getElementById('siteEnabled')
) {
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    // Disable UI for non-http(s) pages (e.g. chrome://, about:blank)
    const isHttp = tab?.url?.startsWith('http://') || tab?.url?.startsWith('https://')
    if (!isHttp || !tab?.url) {
      ;(document.getElementById('siteEnabled') as HTMLInputElement).disabled = true
      ;(document.getElementById('replaceRendered') as HTMLInputElement).disabled = true
      ;(document.getElementById('defaultTheme') as HTMLSelectElement).disabled = true
      return
    }

    const origin = new URL(tab.url).origin

    // Populate theme select
    const themeSelect = document.getElementById('defaultTheme') as HTMLSelectElement
    for (const t of FALLBACK_THEMES) {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = t
      themeSelect.appendChild(opt)
    }

    // Load current state
    const [settings, siteOn] = await Promise.all([loadSettings(), isSiteEnabled(origin)])
    themeSelect.value = settings.defaultTheme
    ;(document.getElementById('replaceRendered') as HTMLInputElement).checked = settings.replaceRendered
    ;(document.getElementById('siteEnabled') as HTMLInputElement).checked = siteOn

    // --- siteEnabled toggle ---
    document.getElementById('siteEnabled')!.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked

      if (!isAutoSite(origin)) {
        if (checked) {
          // Opt-in site: request permission then register dynamic content script
          const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
          if (!granted) {
            // Revert checkbox
            ;(e.target as HTMLInputElement).checked = false
            return
          }
          const id = `bd-${origin}`
          try { await chrome.scripting.unregisterContentScripts({ ids: [id] }) } catch {}
          await chrome.scripting.registerContentScripts([{
            id,
            matches: [`${origin}/*`],
            js: ['dist/content.js'],
            css: ['content.css'],
            runAt: 'document_idle',
          }])
        } else {
          // Disabling an opt-in site: unregister dynamic script
          try { await chrome.scripting.unregisterContentScripts({ ids: [`bd-${origin}`] }) } catch {}
        }
      }
      // Auto sites (github/gitlab): no register/unregister — manifest handles injection

      await setSiteEnabled(origin, checked)
      await chrome.tabs.reload(tab.id!)
      window.close()
    })

    // --- replaceRendered toggle ---
    document.getElementById('replaceRendered')!.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked
      await saveSettings({ replaceRendered: checked })
      await chrome.tabs.reload(tab.id!)
      window.close()
    })

    // --- theme select ---
    document.getElementById('defaultTheme')!.addEventListener('change', async (e) => {
      const value = (e.target as HTMLSelectElement).value
      await saveSettings({ defaultTheme: value })
      await chrome.tabs.reload(tab.id!)
      window.close()
    })

    // --- open options ---
    document.getElementById('openOptions')!.addEventListener('click', () => {
      chrome.runtime.openOptionsPage()
    })
  })()
}
