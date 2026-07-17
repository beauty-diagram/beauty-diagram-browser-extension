import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initOptions } from '../src/options' // imported with chrome undefined → guard skips auto-init

const OPTIONS_BODY = `
  <select id="defaultTheme"></select>
  <input id="apiBase" />
  <input id="replaceRendered" type="checkbox" />
  <input id="defaultImageWidth" />
  <input id="handlePlantuml" type="checkbox" />
  <input id="apiKey" type="password" />
  <button id="verifyKey"></button><span id="verifyStatus"></span>
  <input id="watermarkFree" type="checkbox" />
  <button id="save"></button><span id="status"></span>
`

function setupChrome(opts: { loadThrows?: boolean } = {}) {
  const syncSet = vi.fn((_p: unknown, cb?: () => void) => cb && cb())
  const localSet = vi.fn((_p: unknown, cb?: () => void) => cb && cb())
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { sendMessage: vi.fn(), lastError: undefined },
    storage: {
      sync: {
        get: opts.loadThrows
          ? () => { throw new Error('storage unavailable') }
          : (d: unknown, cb: (d: unknown) => void) => cb(d),
        set: syncSet,
      },
      local: { get: (_k: unknown, cb: (r: unknown) => void) => cb({}), set: localSet },
    },
  }
  return { syncSet }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => { document.body.innerHTML = OPTIONS_BODY })
afterEach(() => { delete (globalThis as unknown as { chrome?: unknown }).chrome })

describe('options wiring robustness', () => {
  it('Save still works when loading stored settings THROWS — the dead-options root cause', async () => {
    const { syncSet } = setupChrome({ loadThrows: true })
    initOptions()
    await flush(); await flush()
    ;(document.getElementById('apiBase') as HTMLInputElement).value = 'https://api.beauty-diagram.com'
    ;(document.getElementById('save') as HTMLButtonElement).click()
    await flush()
    expect(syncSet).toHaveBeenCalled()
  })

  it('happy path: populates theme options', async () => {
    setupChrome()
    initOptions()
    await flush(); await flush()
    expect(document.querySelectorAll('#defaultTheme option').length).toBeGreaterThan(0)
  })

  it('warns on Save when Watermark-free is on but no API key is entered', async () => {
    setupChrome()
    initOptions()
    await flush(); await flush()
    ;(document.getElementById('watermarkFree') as HTMLInputElement).checked = true
    ;(document.getElementById('apiKey') as HTMLInputElement).value = ''
    ;(document.getElementById('save') as HTMLButtonElement).click()
    await flush()
    expect(document.getElementById('status')?.textContent).toContain('needs an API key')
  })

  it('plain "Saved." when Watermark-free is on AND a key is present', async () => {
    setupChrome()
    initOptions()
    await flush(); await flush()
    ;(document.getElementById('watermarkFree') as HTMLInputElement).checked = true
    ;(document.getElementById('apiKey') as HTMLInputElement).value = 'bd_live_abc'
    ;(document.getElementById('save') as HTMLButtonElement).click()
    await flush()
    expect(document.getElementById('status')?.textContent).toBe('Saved.')
  })
})
