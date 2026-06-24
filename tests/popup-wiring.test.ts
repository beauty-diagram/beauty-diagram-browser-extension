import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initPopup } from '../src/popup' // imported with chrome undefined → module guard skips auto-init

const POPUP_BODY = `
  <label class="row" id="siteRow"><span class="txt"><span class="t1">Beautify on this site</span><span class="t2" id="siteHost">—</span></span><span class="switch"><input type="checkbox" id="siteEnabled"><span class="track"></span></span></label>
  <label class="row"><span class="txt"><span class="t1">Replace rendered diagrams</span></span><span class="switch"><input type="checkbox" id="replaceRendered"><span class="track"></span></span></label>
  <div class="selectwrap"><select id="defaultTheme"></select></div>
  <div class="seg" id="widthSeg">
    <button type="button" data-width="full" aria-pressed="true">Full</button>
    <button type="button" data-width="800px" aria-pressed="false">800</button>
    <button type="button" data-width="640px" aria-pressed="false">640</button>
    <button type="button" data-width="480px" aria-pressed="false">480</button>
  </div>
  <a class="more" id="openOptions">More settings</a>
`

function setupChrome(opts: { queryRejects?: boolean } = {}) {
  const syncSet = vi.fn((_p: unknown, cb?: () => void) => cb && cb())
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { openOptionsPage: vi.fn(), lastError: undefined },
    tabs: {
      query: opts.queryRejects
        ? vi.fn(() => Promise.reject(new Error('tab url unavailable')))
        : vi.fn(() => Promise.resolve([{ id: 1, url: 'https://github.com/o/r' }])),
      reload: vi.fn(() => Promise.resolve()),
    },
    storage: {
      sync: { get: (d: unknown, cb: (d: unknown) => void) => cb(d), set: syncSet },
      local: { get: (_k: unknown, cb: (r: unknown) => void) => cb({}), set: (_p: unknown, cb?: () => void) => cb && cb() },
    },
    permissions: { request: vi.fn(() => Promise.resolve(true)) },
    scripting: { registerContentScripts: vi.fn(() => Promise.resolve()), unregisterContentScripts: vi.fn(() => Promise.resolve()) },
  }
  return { syncSet }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.spyOn(window, 'close').mockImplementation(() => {}) // jsdom window.close() tears down the window
  document.body.innerHTML = POPUP_BODY
})
afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as unknown as { chrome?: unknown }).chrome
})

describe('popup wiring robustness', () => {
  it('control listeners still work when async init (chrome.tabs.query) REJECTS — the dead-popup root cause', async () => {
    const { syncSet } = setupChrome({ queryRejects: true })
    initPopup()
    await flush(); await flush()
    ;(document.querySelector('#widthSeg button[data-width="800px"]') as HTMLButtonElement).click()
    await flush()
    expect(syncSet).toHaveBeenCalledWith({ defaultImageWidth: '800px' }, expect.any(Function))
  })

  it('happy path: populates theme options and shows the site host', async () => {
    setupChrome()
    initPopup()
    await flush(); await flush()
    expect(document.querySelectorAll('#defaultTheme option').length).toBeGreaterThan(0)
    expect(document.getElementById('siteHost')!.textContent).toContain('github.com')
  })

  it('permissions.request rejection on a non-built-in site: handler does not throw, checkbox reverts to unchecked', async () => {
    // Override chrome with a non-built-in tab URL and a rejecting permissions.request
    ;(globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: { openOptionsPage: vi.fn(), lastError: undefined },
      tabs: {
        query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com/x' }])),
        reload: vi.fn(() => Promise.resolve()),
      },
      storage: {
        sync: { get: (d: unknown, cb: (d: unknown) => void) => cb(d), set: vi.fn((_p: unknown, cb?: () => void) => cb && cb()) },
        local: { get: (_k: unknown, cb: (r: unknown) => void) => cb({}), set: (_p: unknown, cb?: () => void) => cb && cb() },
      },
      permissions: {
        request: vi.fn(() => Promise.reject(new Error('Only permissions specified in the manifest may be requested'))),
        contains: (_q: unknown, cb: (g: boolean) => void) => cb(false),
      },
      scripting: {
        registerContentScripts: vi.fn(() => Promise.resolve()),
        unregisterContentScripts: vi.fn(() => Promise.resolve()),
      },
    }

    initPopup()
    await flush(); await flush() // let async state-loading complete (tab url → example.com)

    const siteEl = document.getElementById('siteEnabled') as HTMLInputElement
    // Simulate user enabling the toggle
    siteEl.checked = true
    siteEl.dispatchEvent(new Event('change'))
    await flush(); await flush() // drain the async handler

    // Handler must NOT throw (test completes), and checkbox must revert to unchecked
    expect(siteEl.checked).toBe(false)
  })
})
