// Platforms where mermaid commonly appears and auto-running is appropriate.
// Single source of truth: the manifest content_scripts matches must mirror DEFAULT_SITE_MATCHES
// (guarded by a test), and popup.isAutoSite uses isDefaultSite().
export const DEFAULT_SITE_HOSTS = [
  'github.com',
  'gitlab.com',
  '*.atlassian.net',
  'dev.to',
  'stackoverflow.com',
  '*.stackexchange.com',
  'linear.app',
  '*.hashnode.dev',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'www.perplexity.ai',
]

export const DEFAULT_SITE_MATCHES = DEFAULT_SITE_HOSTS.map((h) => `https://${h}/*`)

function hostMatches(host: string, glob: string): boolean {
  if (glob.startsWith('*.')) return host === glob.slice(2) || host.endsWith(glob.slice(1))
  return host === glob
}

/** Is this host one of the statically auto-injected default sites? */
export function isDefaultSite(host: string): boolean {
  return DEFAULT_SITE_HOSTS.some((g) => hostMatches(host, g))
}
