import type { BdMessage, FetchSvgResponse } from './messages'

/** Defensive SVG sanitizer for inline injection: keep only the <svg>…</svg>
 *  root, drop <script> elements and on* handlers. The server output is trusted
 *  but we strip actives so a compromised/edge response can't run in the page. */
export function sanitizeSvg(body: string): string {
  const start = body.indexOf('<svg')
  const end = body.lastIndexOf('</svg>')
  if (start === -1 || end === -1) return ''
  let svg = body.slice(start, end + '</svg>'.length)
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '')
  svg = svg.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  svg = svg.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  return svg
}

async function handleFetchSvg(url: string): Promise<FetchSvgResponse> {
  try {
    const res = await fetch(url, { credentials: 'omit' })
    const raw = await res.text()
    const ok = res.status === 200
    return { ok, status: res.status, body: ok ? sanitizeSvg(raw) : '' }
  } catch {
    return { ok: false, status: 0, body: '' }
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg: BdMessage, _sender, sendResponse) => {
    if (msg.type === 'bd-fetch-svg') {
      handleFetchSvg(msg.url).then(sendResponse)
      return true // async response
    }
    return false
  })
}

export function contentScriptForOrigin(tabId: number): chrome.scripting.ScriptInjection<[], void> {
  return { target: { tabId }, files: ['dist/content.js'] }
}

if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) return
    const origin = new URL(tab.url).origin + '/*'
    const granted = await chrome.permissions.request({ origins: [origin] })
    if (!granted) return
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] })
    await chrome.scripting.executeScript(contentScriptForOrigin(tab.id))
  })
}
