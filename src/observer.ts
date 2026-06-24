type Scan = () => void

/** Start watching the page for diagrams: an immediate scan, a debounced
 *  MutationObserver for async/lazy content, and history hooks for SPA navs
 *  (GitHub Turbo / Atlassian). Returns a stop() that removes everything. */
export function startObserver(scan: Scan, opts?: { debounceMs?: number }): () => void {
  if (!document.body) return () => {}

  const debounceMs = opts?.debounceMs ?? 150
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(scan, debounceMs)
  }

  scan() // immediate

  const mo = new MutationObserver(debounced)
  mo.observe(document.body, { childList: true, subtree: true })

  const onNav = () => scan()
  const origPush = history.pushState
  const origReplace = history.replaceState
  history.pushState = function (...args) { const r = origPush.apply(this, args as Parameters<typeof history.pushState>); onNav(); return r }
  history.replaceState = function (...args) { const r = origReplace.apply(this, args as Parameters<typeof history.replaceState>); onNav(); return r }
  window.addEventListener('popstate', onNav)
  // GitHub Turbo
  document.addEventListener('turbo:load', onNav)

  return () => {
    if (timer) clearTimeout(timer)
    mo.disconnect()
    history.pushState = origPush
    history.replaceState = origReplace
    window.removeEventListener('popstate', onNav)
    document.removeEventListener('turbo:load', onNav)
  }
}
