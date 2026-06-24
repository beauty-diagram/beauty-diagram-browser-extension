import { composeUrl } from './url-composer'
import type { SourceFormat } from './types'

export type RenderResult = { kind: 'img-url'; url: string } | { kind: 'svg'; markup: string }

export interface RenderInput {
  source: string
  sourceFormat: SourceFormat
  theme: string
  bg?: string
  renderMode?: 'img' | 'inline-svg'
}

export interface BackgroundFetchResult { ok: boolean; status: number; body: string }
export type FetchViaBackground = (url: string) => Promise<BackgroundFetchResult>

export interface RenderAdapter {
  render(input: RenderInput): Promise<RenderResult | null>
}

export interface ApiRenderAdapterDeps {
  apiBase: string
  fetchViaBackground: FetchViaBackground
}

/** v1 render path: anonymous /v1/beautify.svg. Returns null when the caller
 *  should leave the host's native render in place (over 5KB, or render failure). */
export class ApiRenderAdapter implements RenderAdapter {
  constructor(private deps: ApiRenderAdapterDeps) {}

  async render(input: RenderInput): Promise<RenderResult | null> {
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
    const url = `${composed.url}&onfail=status`

    if (input.renderMode === 'inline-svg') {
      const res = await this.deps.fetchViaBackground(url)
      if (!res.ok || res.status !== 200) return null
      return { kind: 'svg', markup: res.body }
    }
    return { kind: 'img-url', url }
  }
}
