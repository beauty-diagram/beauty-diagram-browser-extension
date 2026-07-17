import type { BdMessage, FetchSvgResponse, MintShareResponse, VerifyKeyResponse } from './messages'
import { shortHash } from './hash'
import { DEFAULT_API_BASE } from './constants'

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

// --- mintShare ---

export interface MintDeps {
  apiBase: string
  apiKey: string
  fetchFn: typeof fetch
  getCache: (k: string) => Promise<string | undefined>
  setCache: (k: string, v: string) => Promise<void>
  hash: (s: string) => Promise<string>
  now: () => number
}

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function mintShare(
  input: { source: string; sourceFormat: string; theme: string },
  deps: MintDeps,
): Promise<MintShareResponse> {
  if (!deps.apiKey) return { ok: false, error: 'no-api-key' }
  const cacheKey = `bd:share:${await deps.hash(`${input.source}\0${input.theme}\0${input.sourceFormat}`)}`
  const raw = await deps.getCache(cacheKey)
  if (raw) {
    try {
      const c = JSON.parse(raw) as { token?: string; ts?: number }
      if (c.token && typeof c.ts === 'number' && deps.now() - c.ts < SHARE_TTL_MS) return { ok: true, token: c.token }
    } catch {}
  }
  try {
    const res = await deps.fetchFn(`${deps.apiBase}/v1/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bd-Client': 'browser-ext',
        Authorization: `Bearer ${deps.apiKey}`,
      },
      body: JSON.stringify({ source: input.source, theme: input.theme, sourceFormat: input.sourceFormat }),
    })
    if (res.status !== 200) return { ok: false, error: `http-${res.status}` }
    const data = (await res.json()) as { shareToken?: string }
    if (!data.shareToken) return { ok: false, error: 'no-token' }
    await deps.setCache(cacheKey, JSON.stringify({ token: data.shareToken, ts: deps.now() }))
    return { ok: true, token: data.shareToken }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// --- verifyKey ---

export interface VerifyDeps {
  apiBase: string
  apiKey: string
  fetchFn: typeof fetch
}

export async function verifyKey(deps: VerifyDeps): Promise<VerifyKeyResponse> {
  if (!deps.apiKey) return { ok: false, error: 'no-api-key' }
  try {
    const res = await deps.fetchFn(`${deps.apiBase}/v1/usage`, {
      headers: {
        'X-Bd-Client': 'browser-ext',
        Authorization: `Bearer ${deps.apiKey}`,
      },
    })
    if (res.status !== 200) return { ok: false, error: `http-${res.status}` }
    const d = (await res.json()) as {
      plan?: string
      exports?: { used: number; limit: number | null }
      scopes?: string[]
    }
    return {
      ok: true,
      plan: d.plan,
      used: d.exports?.used,
      limit: d.exports?.limit ?? null,
      scopes: d.scopes,
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// --- first-run onboarding: open options page once on install ---

if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return
    chrome.storage.local.get(['bd:onboarded'], (r) => {
      if (r['bd:onboarded']) return
      chrome.storage.local.set({ 'bd:onboarded': true }, () => {})
      chrome.runtime.openOptionsPage()
    })
  })
}

// --- chrome message listener (guarded for jsdom test safety) ---

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg: BdMessage, _sender, sendResponse) => {
    if (msg.type === 'bd-fetch-svg') {
      handleFetchSvg(msg.url).then(sendResponse)
      return true // async response
    }

    if (msg.type === 'bd-mint-share') {
      // Build real deps from chrome APIs; read synced apiBase so custom installs are respected
      chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (synced) => {
        const base = (synced.apiBase as string) || DEFAULT_API_BASE
        chrome.storage.local.get(['bd:apiKey'], (local) => {
          const apiKey = (local['bd:apiKey'] as string) ?? ''
          const deps: MintDeps = {
            apiBase: base,
            apiKey,
            fetchFn: fetch.bind(globalThis),
            getCache: (k) =>
              new Promise((res) =>
                chrome.storage.local.get([k], (r) => res(r[k] as string | undefined))),
            setCache: (k, v) =>
              new Promise((res) =>
                chrome.storage.local.set({ [k]: v }, () => res())),
            hash: shortHash,
            now: () => Date.now(),
          }
          mintShare(msg, deps).then(sendResponse)
        })
      })
      return true
    }

    if (msg.type === 'bd-verify-key') {
      chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (synced) => {
        const base = (synced.apiBase as string) || DEFAULT_API_BASE
        chrome.storage.local.get(['bd:apiKey'], (local) => {
          const apiKey = (local['bd:apiKey'] as string) ?? ''
          const deps: VerifyDeps = { apiBase: base, apiKey, fetchFn: fetch.bind(globalThis) }
          verifyKey(deps).then(sendResponse)
        })
      })
      return true
    }

    return false
  })
}
