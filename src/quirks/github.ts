import type { SiteQuirks } from './index'

// GitHub renders mermaid into a cross-origin iframe; the raw source stays in the
// host DOM. See docs/github-dom-findings.md. We detect the <section> wrapper,
// recover source from data-plain / clipboard-copy / fallback pre, and let
// processHit replace the whole section (removing the iframe).

function recoverSource(node: Element): string | null {
  const target = node.querySelector('.js-render-enrichment-target')
  const plain = target?.getAttribute('data-plain')
  if (plain && plain.trim()) return plain
  const copy = node.querySelector('clipboard-copy[value]')
  const val = copy?.getAttribute('value')
  if (val && val.trim()) return val
  const pre = node.querySelector('pre[lang="mermaid"]')
  const text = pre?.textContent
  if (text && text.trim()) return text
  return null
}

export const githubQuirks: SiteQuirks = {
  match: ['github.com'],
  renderMode: 'inline-svg', // GitHub CSP blocks external <img src>; background-fetch + inline <svg> bypasses it
  detectRendered: (root) =>
    Array.from(root.querySelectorAll('.js-render-needs-enrichment[data-type="mermaid"]')),
  recoverSource,
  // no hideNativeRender: processHit replaces the whole <section>, removing the iframe
  // no spaNav: the observer already hooks turbo:load (avoids double-fire)
}
