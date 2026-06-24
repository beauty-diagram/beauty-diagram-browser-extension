import { describe, it, expect } from 'vitest'
import { readForm } from '../src/options'

describe('readForm', () => {
  it('collects settings from form fields', () => {
    document.body.innerHTML = `
      <select id="defaultTheme"><option value="atlas" selected>atlas</option></select>
      <input id="apiBase" value="https://api.beauty-diagram.com" />
      <input id="replaceRendered" type="checkbox" checked />
      <input id="defaultImageWidth" value="800px" />
      <input id="handlePlantuml" type="checkbox" checked />`
    expect(readForm()).toEqual({
      defaultTheme: 'atlas',
      apiBase: 'https://api.beauty-diagram.com',
      replaceRendered: true,
      defaultImageWidth: '800px',
      handlePlantuml: true,
    })
  })
})
