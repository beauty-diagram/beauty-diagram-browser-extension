// tests/settings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadSettings, DEFAULT_SETTINGS } from '../src/settings'

beforeEach(() => {
  ;(globalThis as any).chrome = {
    storage: { sync: { get: vi.fn((defaults, cb) => cb(defaults)) } },
  }
})

describe('loadSettings', () => {
  it('returns defaults when storage is empty', async () => {
    const s = await loadSettings()
    expect(s).toEqual(DEFAULT_SETTINGS)
    expect(s.defaultTheme).toBe('classic')
    expect(s.apiBase).toBe('https://api.beauty-diagram.com')
    expect(s.replaceRendered).toBe(true)
  })

  it('merges stored overrides over defaults', async () => {
    ;(chrome.storage.sync.get as any) = vi.fn((defaults: any, cb: any) =>
      cb({ ...defaults, defaultTheme: 'atlas' }))
    const s = await loadSettings()
    expect(s.defaultTheme).toBe('atlas')
  })
})
