import { composeUrl } from './url-composer'
import type { SourceFormat } from './types'

export type RenderResult = { kind: 'img-url'; url: string } | { kind: 'svg'; markup: string }

export interface RenderInput {
  source: string
  sourceFormat: SourceFormat
  theme: string
  bg?: string
  renderMode?: 'img' | 'inline-svg'
  /** When true (and mintShare is configured), mint a share token and use the
   *  watermark-free /v1/share/<token>.svg URL. Falls back to anonymous path on
   *  mint failure so rendering is never broken by an API issue. */
  shareMode?: boolean
}

export interface BackgroundFetchResult { ok: boolean; status: number; body: string }
export type FetchViaBackground = (url: string) => Promise<BackgroundFetchResult>

export interface RenderAdapter {
  render(input: RenderInput): Promise<RenderResult | null>
}

export interface ApiRenderAdapterDeps {
  apiBase: string
  fetchViaBackground: FetchViaBackground
  /** Optional: called when shareMode=true. Should return {token} on success or null on failure. */
  mintShare?: (input: { source: string; sourceFormat: SourceFormat; theme: string }) => Promise<{ token: string } | null>
}

/** v1 render path. When shareMode is true and mintShare resolves a token, uses the
 *  watermark-free /v1/share/<token>.svg URL. Otherwise falls back to anonymous
 *  /v1/beautify.svg. Returns null when the caller should leave the host's native
 *  render in place (over 5KB, or render failure). */
export class ApiRenderAdapter implements RenderAdapter {
  constructor(private deps: ApiRenderAdapterDeps) {}

  async render(input: RenderInput): Promise<RenderResult | null> {
    let baseUrl: string | null = null

    // --- Share path (opt-in, falls back to anonymous on any failure) ---
    if (input.shareMode && this.deps.mintShare) {
      const minted = await this.deps.mintShare({
        source: input.source,
        sourceFormat: input.sourceFormat,
        theme: input.theme,
      })
      if (minted) {
        baseUrl = `${this.deps.apiBase}/v1/share/${minted.token}.svg`
      }
    }

    // --- Anonymous path (default or fallback) ---
    if (!baseUrl) {
      const composed = composeUrl({
        source: input.source,
        theme: input.theme,
        sourceFormat: input.sourceFormat,
        mode: 'anonymous',
        apiBase: this.deps.apiBase,
        bg: input.bg,
      })
      if (composed.kind !== 'anonymous') return null // over-size-cap → fall back to native
      // Extension is a controlled consumer: ask the server to 422 on parse failure
      // (no SVG body) so we can detect it and revert to native instead of showing a placeholder.
      baseUrl = `${composed.url}&onfail=status`
    }

    // --- img vs inline-svg branching (same for both paths) ---
    if (input.renderMode === 'inline-svg') {
      const res = await this.deps.fetchViaBackground(baseUrl)
      if (!res.ok || res.status !== 200) return null
      return { kind: 'svg', markup: res.body }
    }
    return { kind: 'img-url', url: baseUrl }
  }
}
