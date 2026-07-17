import { describe, it, expect } from 'vitest'
import { readForm, watermarkFreeStatus } from '../src/options'

describe('readForm', () => {
  it('collects settings from form fields (watermarkFree unchecked)', () => {
    document.body.innerHTML = `
      <select id="defaultTheme"><option value="atlas" selected>atlas</option></select>
      <input id="apiBase" value="https://api.beauty-diagram.com" />
      <input id="replaceRendered" type="checkbox" checked />
      <input id="defaultImageWidth" value="800px" />
      <input id="handlePlantuml" type="checkbox" checked />
      <input id="watermarkFree" type="checkbox" />`
    expect(readForm()).toEqual({
      defaultTheme: 'atlas',
      apiBase: 'https://api.beauty-diagram.com',
      replaceRendered: true,
      defaultImageWidth: '800px',
      handlePlantuml: true,
      watermarkFree: false,
    })
  })

  it('readForm includes watermarkFree=true when checkbox is checked', () => {
    document.body.innerHTML = `
      <select id="defaultTheme"><option value="classic" selected>classic</option></select>
      <input id="apiBase" value="https://api.beauty-diagram.com" />
      <input id="replaceRendered" type="checkbox" />
      <input id="defaultImageWidth" value="full" />
      <input id="handlePlantuml" type="checkbox" />
      <input id="watermarkFree" type="checkbox" checked />`
    const s = readForm()
    expect(s.watermarkFree).toBe(true)
  })

  it('readForm does NOT include apiKey (apiKey is local-only, not in Settings shape)', () => {
    document.body.innerHTML = `
      <select id="defaultTheme"><option value="classic" selected>classic</option></select>
      <input id="apiBase" value="https://api.beauty-diagram.com" />
      <input id="replaceRendered" type="checkbox" />
      <input id="defaultImageWidth" value="full" />
      <input id="handlePlantuml" type="checkbox" />
      <input id="apiKey" type="password" value="sk-secret" />
      <input id="watermarkFree" type="checkbox" />`
    const s = readForm()
    expect('apiKey' in s).toBe(false)
  })
})

describe('watermarkFreeStatus', () => {
  it('free plan → needs a Pro plan (regardless of scope)', () => {
    expect(watermarkFreeStatus('free', ['share:write'])).toBe('Watermark-free needs a Pro plan')
  })

  it('Pro plan without share:write → flags the missing scope', () => {
    expect(watermarkFreeStatus('pro', ['render:write', 'export:write'])).toContain('Create share links')
  })

  it('Pro plan with share:write → ready', () => {
    expect(watermarkFreeStatus('pro', ['render:write', 'share:write'])).toBe('Watermark-free: ready')
  })

  it('premium with share:write → ready', () => {
    expect(watermarkFreeStatus('premium', ['share:write'])).toBe('Watermark-free: ready')
  })

  it('Pro plan but scopes undefined (older API) → stays silent, no false "missing scope"', () => {
    expect(watermarkFreeStatus('pro', undefined)).toBe('')
  })
})
