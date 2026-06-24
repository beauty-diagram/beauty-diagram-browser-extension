// src/toggle.ts (temporary minimal stub — replaced fully in Task 1.5)
export interface BarOptions {
  mount: HTMLElement
  source: string
  sourceFormat: 'mermaid' | 'plantuml'
  theme: string
  editorWebBase?: string
}
export function buildBar(_opts: BarOptions): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'bd-bar'
  return bar
}
