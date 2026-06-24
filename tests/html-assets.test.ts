import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

// Regression guard: a redesign once dropped the <script> from popup.html, so the
// bundle never loaded and every control was inert. These assert the HTML pages
// actually reference their built scripts, and the manifest points at real files.
describe('html ↔ script wiring', () => {
  it('popup.html loads dist/popup.js', () => {
    expect(read('popup.html')).toContain('src="dist/popup.js"')
  })

  it('options.html loads dist/options.js', () => {
    expect(read('options.html')).toContain('src="dist/options.js"')
  })

  it('manifest wires popup, options and the background worker', () => {
    const m = JSON.parse(read('manifest.json'))
    expect(m.action.default_popup).toBe('popup.html')
    expect(m.options_page).toBe('options.html')
    expect(m.background.service_worker).toBe('dist/background.js')
    expect(m.content_scripts[0].js).toContain('dist/content.js')
  })
})
