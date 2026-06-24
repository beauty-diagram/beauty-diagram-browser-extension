// tests/popup.test.ts
import { describe, it, expect } from 'vitest'
import { isAutoSite, siteStatusText, isSiteActive } from '../src/popup'

describe('isAutoSite', () => {
  it('returns true for github.com origin', () => {
    expect(isAutoSite('https://github.com')).toBe(true)
  })

  it('returns true for gitlab.com origin', () => {
    expect(isAutoSite('https://gitlab.com')).toBe(true)
  })

  it('returns true for dev.to origin', () => {
    expect(isAutoSite('https://dev.to')).toBe(true)
  })

  it('returns true for an atlassian.net subdomain origin', () => {
    expect(isAutoSite('https://myteam.atlassian.net')).toBe(true)
  })

  it('returns true for claude.ai origin', () => {
    expect(isAutoSite('https://claude.ai')).toBe(true)
  })

  it('returns false for an arbitrary https origin', () => {
    expect(isAutoSite('https://example.com')).toBe(false)
  })

  it('returns false for http variant of github (not auto)', () => {
    expect(isAutoSite('http://github.com')).toBe(false)
  })
})

describe('siteStatusText', () => {
  it('returns "Not available on this page" when hasOrigin is false', () => {
    expect(siteStatusText({ hasOrigin: false, isAuto: false, enabled: false }))
      .toBe('Not available on this page')
  })

  it('returns message containing "Built-in" and "active" when isAuto and enabled', () => {
    const text = siteStatusText({ hasOrigin: true, isAuto: true, enabled: true })
    expect(text).toContain('Built-in')
    expect(text.toLowerCase()).toContain('active')
  })

  it('returns message containing "Built-in" and "turned off" when isAuto and not enabled', () => {
    const text = siteStatusText({ hasOrigin: true, isAuto: true, enabled: false })
    expect(text).toContain('Built-in')
    expect(text).toContain('turned off')
  })

  it('returns "Active on this site" when not isAuto and enabled', () => {
    expect(siteStatusText({ hasOrigin: true, isAuto: false, enabled: true }))
      .toBe('Active on this site')
  })

  it('returns message containing "Off" and "turn on" when not isAuto and not enabled', () => {
    const text = siteStatusText({ hasOrigin: true, isAuto: false, enabled: false })
    expect(text).toContain('Off')
    expect(text.toLowerCase()).toContain('turn on')
  })
})

describe('isSiteActive', () => {
  it('built-in site is active by default', () => {
    expect(isSiteActive({ isAuto: true, hasPermission: true, flag: true })).toBe(true)
  })
  it('built-in site turned off reads inactive', () => {
    expect(isSiteActive({ isAuto: true, hasPermission: true, flag: false })).toBe(false)
  })
  it('non-built-in site WITHOUT permission is OFF even though the flag defaults true (the bug fix)', () => {
    expect(isSiteActive({ isAuto: false, hasPermission: false, flag: true })).toBe(false)
  })
  it('non-built-in site WITH permission and flag on is active', () => {
    expect(isSiteActive({ isAuto: false, hasPermission: true, flag: true })).toBe(true)
  })
  it('non-built-in site with permission but turned off is inactive', () => {
    expect(isSiteActive({ isAuto: false, hasPermission: true, flag: false })).toBe(false)
  })
})
