import type { AppConfig } from './types.ts'

const STORAGE_KEY = 'taxBracketsMarbleVisualConfig'
const STAGE_WIDTH_KEY = 'taxBracketsMarbleVisualStageWidthPercent'

export function loadStoredConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppConfig
  } catch {
    return null
  }
}

export function saveStoredConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearStoredConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function loadStoredStageWidthPercent(): number | null {
  try {
    const raw = localStorage.getItem(STAGE_WIDTH_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveStoredStageWidthPercent(percent: number): void {
  localStorage.setItem(STAGE_WIDTH_KEY, String(percent))
}

export function clearStoredStageWidthPercent(): void {
  localStorage.removeItem(STAGE_WIDTH_KEY)
}
