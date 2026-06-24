import { FALLBACK_THEMES } from './constants'
import { loadSettings, saveSettings, isSiteEnabled, setSiteEnabled } from './settings'

/** Pure helper — testable in jsdom without chrome */
export function isAutoSite(origin: string): boolean {
  return origin === 'https://github.com' || origin === 'https://gitlab.com'
}

if (
  typeof chrome !== 'undefined' &&
  (chrome as any).tabs &&
  document.getElementById('siteEnabled')
) {
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tab?.url
    const isHttp = !!url && (url.startsWith('http://') || url.startsWith('https://'))
    const origin = isHttp ? new URL(url).origin : null

    const siteEl = document.getElementById('siteEnabled') as HTMLInputElement
    const replaceEl = document.getElementById('replaceRendered') as HTMLInputElement
    const themeEl = document.getElementById('defaultTheme') as HTMLSelectElement
    const hostEl = document.getElementById('siteHost') as HTMLElement
    const widthSeg = document.getElementById('widthSeg') as HTMLElement
    const widthBtns = Array.from(widthSeg.querySelectorAll('button'))

    // Theme options (capitalised label, lowercase value)
    for (const t of FALLBACK_THEMES) {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1)
      themeEl.appendChild(opt)
    }

    // Global settings — always available, even on chrome:// / new-tab pages
    const settings = await loadSettings()
    themeEl.value = settings.defaultTheme
    replaceEl.checked = settings.replaceRendered

    const activeWidth = settings.defaultImageWidth || 'full'
    for (const btn of widthBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.width === activeWidth))
    }

    const reloadAndClose = async () => {
      if (tab?.id) await chrome.tabs.reload(tab.id)
      window.close()
    }

    // Per-site toggle — only meaningful on an http(s) origin
    if (origin) {
      hostEl.textContent = origin.replace(/^https?:\/\//, '')
      siteEl.checked = await isSiteEnabled(origin)
      siteEl.addEventListener('change', async (e) => {
        const checked = (e.target as HTMLInputElement).checked
        if (!isAutoSite(origin)) {
          if (checked) {
            const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
            if (!granted) { (e.target as HTMLInputElement).checked = false; return }
            const id = `bd-${origin}`
            try {
              try { await chrome.scripting.unregisterContentScripts({ ids: [id] }) } catch {}
              await chrome.scripting.registerContentScripts([{
                id, matches: [`${origin}/*`], js: ['dist/content.js'], css: ['content.css'], runAt: 'document_idle',
              }])
            } catch (err) {
              console.error('[beauty-diagram] registerContentScripts failed', err)
              ;(e.target as HTMLInputElement).checked = false
              return
            }
          } else {
            try { await chrome.scripting.unregisterContentScripts({ ids: [`bd-${origin}`] }) } catch {}
          }
        }
        await setSiteEnabled(origin, checked)
        await reloadAndClose()
      })
    } else {
      hostEl.textContent = 'Not available on this page'
      siteEl.disabled = true
      document.getElementById('siteRow')?.classList.add('off')
    }

    // Global controls — always wired
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
    document.getElementById('openOptions')!.addEventListener('click', () => chrome.runtime.openOptionsPage())
  })()
}
