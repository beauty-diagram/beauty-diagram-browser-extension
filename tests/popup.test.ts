// tests/popup.test.ts
import { describe, it, expect } from 'vitest'
import { isAutoSite } from '../src/popup'

describe('isAutoSite', () => {
  it('returns true for github.com origin', () => {
    expect(isAutoSite('https://github.com')).toBe(true)
  })

  it('returns true for gitlab.com origin', () => {
    expect(isAutoSite('https://gitlab.com')).toBe(true)
  })

  it('returns false for an arbitrary https origin', () => {
    expect(isAutoSite('https://example.com')).toBe(false)
  })

  it('returns false for an atlassian origin', () => {
    expect(isAutoSite('https://myteam.atlassian.net')).toBe(false)
  })

  it('returns false for http variant of github (not auto)', () => {
    expect(isAutoSite('http://github.com')).toBe(false)
  })
})
