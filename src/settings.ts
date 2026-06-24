// src/settings.ts
import { DEFAULT_API_BASE } from './constants'

export interface Settings {
  defaultTheme: string
  apiBase: string
  replaceRendered: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  defaultTheme: 'classic',
  apiBase: DEFAULT_API_BASE,
  replaceRendered: true,
}

export function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => resolve(stored as Settings))
  })
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => chrome.storage.sync.set(patch, () => resolve()))
}

export function isSiteEnabled(origin: string): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.storage.local.get([`bd:site:${origin}`], (r) => {
      const v = r[`bd:site:${origin}`]
      resolve(v === undefined ? true : v === true)
    }))
}

export function setSiteEnabled(origin: string, enabled: boolean): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [`bd:site:${origin}`]: enabled }, () => resolve()))
}
