import { loadSettings, saveSettings, type Settings } from './settings'
import { FALLBACK_THEMES } from './constants'

export function readForm(): Settings {
  const theme = (document.getElementById('defaultTheme') as HTMLSelectElement).value
  const apiBase = (document.getElementById('apiBase') as HTMLInputElement).value
  const replaceRendered = (document.getElementById('replaceRendered') as HTMLInputElement).checked
  return { defaultTheme: theme, apiBase, replaceRendered }
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
  document.getElementById('save')!.addEventListener('click', async () => {
    await saveSettings(readForm())
    const status = document.getElementById('status')!
    status.textContent = 'Saved.'
    setTimeout(() => { status.textContent = '' }, 1500)
  })
}

if (typeof document !== 'undefined' && document.getElementById('save')) {
  void init()
}
