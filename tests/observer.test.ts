// tests/observer.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { startObserver } from '../src/observer'

afterEach(() => { document.body.innerHTML = '' })

describe('startObserver', () => {
  it('invokes scan once immediately', () => {
    const scan = vi.fn()
    const stop = startObserver(scan)
    expect(scan).toHaveBeenCalledTimes(1)
    stop()
  })

  it('invokes scan again after a history pushState (SPA nav)', () => {
    const scan = vi.fn()
    const stop = startObserver(scan)
    scan.mockClear()
    history.pushState({}, '', '/other')
    expect(scan).toHaveBeenCalled()
    stop()
  })

  it('stop() disconnects — no scan after stop on pushState', () => {
    const scan = vi.fn()
    const stop = startObserver(scan)
    stop()
    scan.mockClear()
    history.pushState({}, '', '/again')
    expect(scan).not.toHaveBeenCalled()
  })
})
