// src/messages.ts
export interface FetchSvgRequest { type: 'bd-fetch-svg'; url: string }
export interface FetchSvgResponse { ok: boolean; status: number; body: string }
export type BdMessage = FetchSvgRequest
