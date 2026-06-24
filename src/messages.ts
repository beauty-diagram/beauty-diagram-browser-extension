// src/messages.ts
import type { SourceFormat } from './types'

export interface FetchSvgRequest { type: 'bd-fetch-svg'; url: string }
export interface FetchSvgResponse { ok: boolean; status: number; body: string }

export interface MintShareRequest {
  type: 'bd-mint-share'
  source: string
  sourceFormat: SourceFormat
  theme: string
}
export interface MintShareResponse { ok: boolean; token?: string; error?: string }

export interface VerifyKeyRequest { type: 'bd-verify-key' }
export interface VerifyKeyResponse {
  ok: boolean
  plan?: string
  used?: number
  limit?: number | null
  error?: string
}

export type BdMessage = FetchSvgRequest | MintShareRequest | VerifyKeyRequest
