// tests/background.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeSvg, contentScriptForOrigin } from '../src/background'

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

describe('contentScriptForOrigin', () => {
  it('builds a scripting injection spec for a granted origin tab', () => {
    const spec = contentScriptForOrigin(42)
    expect(spec.target).toEqual({ tabId: 42 })
    expect((spec as any).files).toContain('dist/content.js')
  })
})
