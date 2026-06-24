// tests/settings.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, isSiteEnabled, setSiteEnabled } from '../src/settings'

beforeEach(() => {
  ;(globalThis as any).chrome = {
    storage: {
      sync: { get: vi.fn((defaults, cb) => cb(defaults)), set: vi.fn((patch, cb) => cb()) },
      local: { get: vi.fn((_keys, cb) => cb({})), set: vi.fn((_patch, cb) => cb()) },
    },
  }
})

afterEach(() => { delete (globalThis as any).chrome })

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

describe('saveSettings', () => {
  it('saveSettings writes the patch to chrome.storage.sync', async () => {
    await saveSettings({ defaultTheme: 'atlas' })
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ defaultTheme: 'atlas' }, expect.any(Function))
  })
})

describe('isSiteEnabled', () => {
  it('returns true when no value is stored (default ON)', async () => {
    // local.get returns {} — key absent
    const result = await isSiteEnabled('https://example.com')
    expect(result).toBe(true)
  })

  it('returns false when stored value is false', async () => {
    ;(chrome.storage.local.get as any) = vi.fn((_keys: any, cb: any) =>
      cb({ 'bd:site:https://example.com': false }))
    const result = await isSiteEnabled('https://example.com')
    expect(result).toBe(false)
  })

  it('returns true when stored value is true', async () => {
    ;(chrome.storage.local.get as any) = vi.fn((_keys: any, cb: any) =>
      cb({ 'bd:site:https://example.com': true }))
    const result = await isSiteEnabled('https://example.com')
    expect(result).toBe(true)
  })
})

describe('setSiteEnabled', () => {
  it('writes to chrome.storage.local with the correct key', async () => {
    await setSiteEnabled('https://example.com', false)
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { 'bd:site:https://example.com': false },
      expect.any(Function),
    )
  })

  it('writes enabled=true to chrome.storage.local', async () => {
    await setSiteEnabled('https://example.com', true)
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { 'bd:site:https://example.com': true },
      expect.any(Function),
    )
  })
})
