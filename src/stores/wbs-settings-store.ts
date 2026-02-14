import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeColor } from '@/shared/types/theme-color'
import { migrateToThemeColor } from '@/shared/types/theme-color'
import type { WbsSettings } from '@/shared/types/wbs-settings'
import { createDefaultWbsSettings } from '@/shared/types/wbs-settings'

interface WbsSettingsState {
  settingsMap: Record<string, WbsSettings>
  // Selector
  getSettings: (projectId: string) => WbsSettings
  // Actions（全てprojectIdを第一引数に追加）
  updateColumnName: (
    projectId: string,
    columnId: string,
    displayName: string,
  ) => void
  toggleColumnEnabled: (projectId: string, columnId: string) => void
  moveColumn: (
    projectId: string,
    columnId: string,
    direction: 'up' | 'down',
  ) => void
  updateColumnBackgroundColor: (
    projectId: string,
    columnId: string,
    color: ThemeColor,
  ) => void
  updateColumnTechTags: (
    projectId: string,
    columnId: string,
    techTagIds: string[],
  ) => void
  updateLevelColor: (
    projectId: string,
    level: number,
    color: ThemeColor,
  ) => void
  replaceSettingsMap: (newMap: Record<string, WbsSettings>) => void
}

/**
 * 指定projectIdの設定を取得。存在しなければデフォルト設定を返す（読み取り時は保存しない）
 */
function resolveSettings(
  settingsMap: Record<string, WbsSettings>,
  projectId: string,
): WbsSettings {
  return settingsMap[projectId] ?? createDefaultWbsSettings()
}

/**
 * 指定projectIdの設定を取得し、存在しなければデフォルト設定を作成してから返す（書き込み用）
 */
function ensureSettings(
  settingsMap: Record<string, WbsSettings>,
  projectId: string,
): WbsSettings {
  if (settingsMap[projectId]) return settingsMap[projectId]
  return createDefaultWbsSettings()
}

export const useWbsSettingsStore = create<WbsSettingsState>()(
  persist(
    (set, get) => ({
      settingsMap: {},

      getSettings: (projectId: string) => {
        return resolveSettings(get().settingsMap, projectId)
      },

      updateColumnName: (projectId, columnId, displayName) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                effortColumns: settings.effortColumns.map((col) =>
                  col.id === columnId ? { ...col, displayName } : col,
                ),
              },
            },
          }
        })
      },

      toggleColumnEnabled: (projectId, columnId) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                effortColumns: settings.effortColumns.map((col) =>
                  col.id === columnId ? { ...col, enabled: !col.enabled } : col,
                ),
              },
            },
          }
        })
      },

      moveColumn: (projectId, columnId, direction) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          const columns = [...settings.effortColumns].sort(
            (a, b) => a.order - b.order,
          )
          const idx = columns.findIndex((c) => c.id === columnId)
          if (idx === -1) return state
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= columns.length) return state

          const swapOrder = columns[swapIdx]?.order ?? 0
          const idxOrder = columns[idx]?.order ?? 0
          const newColumns = columns.map((col, i) => {
            if (i === idx) return { ...col, order: swapOrder }
            if (i === swapIdx) return { ...col, order: idxOrder }
            return col
          })

          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                effortColumns: newColumns,
              },
            },
          }
        })
      },

      updateColumnBackgroundColor: (projectId, columnId, color) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          // 単一string値を受け取った場合はThemeColorオブジェクトに変換
          const themeColor = color ? migrateToThemeColor(color) : undefined
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                effortColumns: settings.effortColumns.map((col) =>
                  col.id === columnId
                    ? { ...col, backgroundColor: themeColor }
                    : col,
                ),
              },
            },
          }
        })
      },

      updateColumnTechTags: (projectId, columnId, techTagIds) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                effortColumns: settings.effortColumns.map((col) =>
                  col.id === columnId
                    ? {
                        ...col,
                        techTagIds:
                          techTagIds.length > 0 ? techTagIds : undefined,
                      }
                    : col,
                ),
              },
            },
          }
        })
      },

      updateLevelColor: (projectId, level, color) => {
        set((state) => {
          // Only allow levels in the valid range (0–5) to avoid storing invalid colors
          if (level < 0 || level > 5) {
            return state
          }

          const settings = ensureSettings(state.settingsMap, projectId)
          // 単一string値を受け取った場合はThemeColorオブジェクトに変換
          const themeColor = migrateToThemeColor(color)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                levelColors: {
                  ...(settings.levelColors ?? {}),
                  [String(level)]: themeColor,
                },
              },
            },
          }
        })
      },
      replaceSettingsMap: (newMap) => {
        set({ settingsMap: newMap })
      },
    }),
    {
      name: 'wbs-settings-storage',
    },
  ),
)
