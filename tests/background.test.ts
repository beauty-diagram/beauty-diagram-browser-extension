// tests/background.test.ts
import { describe, it, expect, vi } from 'vitest'
import { sanitizeSvg, mintShare, verifyKey, type MintDeps, type VerifyDeps } from '../src/background'

describe('sanitizeSvg', () => {
  it('keeps <svg> structure', () => {
    const out = sanitizeSvg('<svg id="x"><rect/></svg>')
    expect(out).toContain('<svg')
    expect(out).toContain('<rect')
  })
  it('strips <script> from the svg', () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><rect/></svg>')
    expect(out).not.toContain('<script')
    expect(out).toContain('<rect')
  })
  it('strips on* event handler attributes', () => {
    const out = sanitizeSvg('<svg><rect onload="x()"/></svg>')
    expect(out.toLowerCase()).not.toContain('onload')
  })
  it('returns empty string when no <svg> root present', () => {
    expect(sanitizeSvg('<html>nope</html>')).toBe('')
  })
})

// --- mintShare ---

function makeMintDeps(overrides: Partial<MintDeps> = {}): MintDeps {
  const cache: Record<string, string> = {}
  return {
    apiBase: 'https://api.beauty-diagram.com',
    apiKey: 'sk-test',
    fetchFn: vi.fn() as any,
    getCache: async (k) => cache[k],
    setCache: async (k, v) => { cache[k] = v },
    hash: async (s) => `hash(${s.slice(0, 8)})`,
    now: () => 1000,
    ...overrides,
  }
}

describe('mintShare', () => {
  it('returns no-api-key when apiKey is empty', async () => {
    const deps = makeMintDeps({ apiKey: '' })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: false, error: 'no-api-key' })
    expect(deps.fetchFn).not.toHaveBeenCalled()
  })

  it('returns cached token without calling fetch on cache hit', async () => {
    const cache: Record<string, string> = {}
    const hash = async (_s: string) => 'fixed-hash'
    const cacheKey = 'bd:share:fixed-hash'
    cache[cacheKey] = JSON.stringify({ token: 'cached-token', ts: 1000 })
    const fetchFn = vi.fn()
    const deps = makeMintDeps({
      getCache: async (k) => cache[k],
      setCache: async (k, v) => { cache[k] = v },
      hash,
      fetchFn: fetchFn as any,
      now: () => 1000,
    })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: true, token: 'cached-token' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('re-fetches when cache entry is stale (older than 7 days)', async () => {
    const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000
    const cache: Record<string, string> = {}
    const hash = async (_s: string) => 'fixed-hash'
    const cacheKey = 'bd:share:fixed-hash'
    cache[cacheKey] = JSON.stringify({ token: 'stale-token', ts: 0 })
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ shareToken: 'fresh-token' }),
    })
    const deps = makeMintDeps({
      getCache: async (k) => cache[k],
      setCache: async (k, v) => { cache[k] = v },
      hash,
      fetchFn: fetchFn as any,
      now: () => SHARE_TTL_MS + 1,
    })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(fetchFn).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true, token: 'fresh-token' })
  })

  it('POSTs to /v1/share with correct headers and body on cache miss', async () => {
    const cache: Record<string, string> = {}
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ shareToken: 'new-token-abc', diagramId: 'd1' }),
    })
    const deps = makeMintDeps({
      getCache: async (k) => cache[k],
      setCache: async (k, v) => { cache[k] = v },
      fetchFn: fetchFn as any,
    })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: true, token: 'new-token-abc' })

    expect(fetchFn).toHaveBeenCalledOnce()
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://api.beauty-diagram.com/v1/share')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer sk-test')
    expect(init.headers['X-Bd-Client']).toBe('browser-ext')
    expect(init.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body)
    expect(body.source).toBe('graph TD; A-->B')
    expect(body.theme).toBe('classic')
    expect(body.sourceFormat).toBe('mermaid')

    // writes to cache as JSON { token, ts }
    const cacheKey = Object.keys(cache)[0]
    expect(cacheKey).toMatch(/^bd:share:/)
    const stored = JSON.parse(cache[cacheKey]) as { token: string; ts: number }
    expect(stored.token).toBe('new-token-abc')
    expect(typeof stored.ts).toBe('number')
  })

  it('returns error on non-200 response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 403,
      json: async () => ({ error: 'unauthorized' }),
    })
    const deps = makeMintDeps({ fetchFn: fetchFn as any })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: false, error: 'http-403' })
  })

  it('returns network error on fetch throw', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'))
    const deps = makeMintDeps({ fetchFn: fetchFn as any })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: false, error: 'network' })
  })

  it('returns no-token error when API response lacks shareToken', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ diagramId: 'd1' }), // no shareToken
    })
    const deps = makeMintDeps({ fetchFn: fetchFn as any })
    const result = await mintShare({ source: 'graph TD; A-->B', sourceFormat: 'mermaid', theme: 'classic' }, deps)
    expect(result).toEqual({ ok: false, error: 'no-token' })
  })
})

// --- verifyKey ---

function makeVerifyDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    apiBase: 'https://api.beauty-diagram.com',
    apiKey: 'sk-test',
    fetchFn: vi.fn() as any,
    ...overrides,
  }
}

describe('verifyKey', () => {
  it('returns no-api-key when apiKey is empty', async () => {
    const deps = makeVerifyDeps({ apiKey: '' })
    const result = await verifyKey(deps)
    expect(result).toEqual({ ok: false, error: 'no-api-key' })
  })

  it('returns plan, used, limit on 200 response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        plan: 'pro',
        exports: { used: 42, limit: 500, resetsAt: '2026-07-01' },
      }),
    })
    const deps = makeVerifyDeps({ fetchFn: fetchFn as any })
    const result = await verifyKey(deps)
    expect(result).toEqual({ ok: true, plan: 'pro', used: 42, limit: 500 })

    // assert correct request
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://api.beauty-diagram.com/v1/usage')
    expect(init.headers['Authorization']).toBe('Bearer sk-test')
    expect(init.headers['X-Bd-Client']).toBe('browser-ext')
  })

  it('passes through granted scopes from /v1/usage', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        plan: 'pro',
        exports: { used: 1, limit: 100 },
        scopes: ['render:write', 'share:write'],
      }),
    })
    const deps = makeVerifyDeps({ fetchFn: fetchFn as any })
    const result = await verifyKey(deps)
    expect(result.scopes).toEqual(['render:write', 'share:write'])
  })

  it('returns limit: null when exports.limit is null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ ok: true, plan: 'unlimited', exports: { used: 5, limit: null } }),
    })
    const deps = makeVerifyDeps({ fetchFn: fetchFn as any })
    const result = await verifyKey(deps)
    expect(result.limit).toBeNull()
  })

  it('returns error on non-200 response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    })
    const deps = makeVerifyDeps({ fetchFn: fetchFn as any })
    const result = await verifyKey(deps)
    expect(result).toEqual({ ok: false, error: 'http-401' })
  })

  it('returns network error on fetch throw', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'))
    const deps = makeVerifyDeps({ fetchFn: fetchFn as any })
    const result = await verifyKey(deps)
    expect(result).toEqual({ ok: false, error: 'network' })
  })
})
