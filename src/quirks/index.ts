// src/quirks/index.ts (minimal stub — github quirk added in Task 2.2)
export interface SiteQuirks {
  match: string[]
  renderMode?: 'img' | 'inline-svg'
  recoverSource?: (renderNode: Element) => string | null
  hideNativeRender?: (renderNode: Element) => void
  spaNav?: (onNavigate: () => void) => void
}

const QUIRKS: SiteQuirks[] = []

function hostMatches(host: string, glob: string): boolean {
  if (glob.startsWith('*.')) return host === glob.slice(2) || host.endsWith(glob.slice(1))
  return host === glob
}

export function matchQuirks(host: string): SiteQuirks | null {
  return QUIRKS.find((q) => q.match.some((m) => hostMatches(host, m))) ?? null
}
