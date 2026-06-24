import { describe, it, expect } from 'vitest'
import { isDefaultSite, DEFAULT_SITE_MATCHES } from '../src/sites'

describe('isDefaultSite', () => {
  it('returns true for github.com', () => {
    expect(isDefaultSite('github.com')).toBe(true)
  })

  it('returns true for gitlab.com', () => {
    expect(isDefaultSite('gitlab.com')).toBe(true)
  })

  it('returns true for a wildcard *.atlassian.net subdomain', () => {
    expect(isDefaultSite('team.atlassian.net')).toBe(true)
  })

  it('returns true for dev.to', () => {
    expect(isDefaultSite('dev.to')).toBe(true)
  })

  it('returns true for stackoverflow.com', () => {
    expect(isDefaultSite('stackoverflow.com')).toBe(true)
  })

  it('returns true for a wildcard *.stackexchange.com subdomain', () => {
    expect(isDefaultSite('foo.stackexchange.com')).toBe(true)
  })

  it('returns true for linear.app', () => {
    expect(isDefaultSite('linear.app')).toBe(true)
  })

  it('returns true for a wildcard *.hashnode.dev subdomain', () => {
    expect(isDefaultSite('myblog.hashnode.dev')).toBe(true)
  })

  it('returns true for chatgpt.com', () => {
    expect(isDefaultSite('chatgpt.com')).toBe(true)
  })

  it('returns true for claude.ai', () => {
    expect(isDefaultSite('claude.ai')).toBe(true)
  })

  it('returns true for gemini.google.com', () => {
    expect(isDefaultSite('gemini.google.com')).toBe(true)
  })

  it('returns true for www.perplexity.ai', () => {
    expect(isDefaultSite('www.perplexity.ai')).toBe(true)
  })

  it('returns true for www.beauty-diagram.com', () => {
    expect(isDefaultSite('www.beauty-diagram.com')).toBe(true)
  })

  it('returns false for example.com', () => {
    expect(isDefaultSite('example.com')).toBe(false)
  })

  it('returns false for evil.com', () => {
    expect(isDefaultSite('evil.com')).toBe(false)
  })

  it('returns false for notatlassian.net (not a subdomain match)', () => {
    expect(isDefaultSite('notatlassian.net')).toBe(false)
  })
})

describe('DEFAULT_SITE_MATCHES', () => {
  it('contains https://dev.to/*', () => {
    expect(DEFAULT_SITE_MATCHES).toContain('https://dev.to/*')
  })

  it('contains https://github.com/*', () => {
    expect(DEFAULT_SITE_MATCHES).toContain('https://github.com/*')
  })

  it('contains https://*.atlassian.net/*', () => {
    expect(DEFAULT_SITE_MATCHES).toContain('https://*.atlassian.net/*')
  })

  it('contains https://www.beauty-diagram.com/*', () => {
    expect(DEFAULT_SITE_MATCHES).toContain('https://www.beauty-diagram.com/*')
  })

  it('has exactly 13 entries', () => {
    expect(DEFAULT_SITE_MATCHES).toHaveLength(13)
  })
})
