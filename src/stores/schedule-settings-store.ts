import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PhaseSettings } from '@/shared/types/schedule'
import { createDefaultPhaseSettings } from '@/shared/types/schedule'
import type { ThemeColor } from '@/shared/types/theme-color'
import { migrateToThemeColor } from '@/shared/types/theme-color'

interface ScheduleSettingsState {
  settingsMap: Record<string, PhaseSettings>

  getSettings: (projectId: string) => PhaseSettings
  updatePhaseName: (projectId: string, phaseKey: string, name: string) => void
  updatePhaseColor: (
    projectId: string,
    phaseKey: string,
    color: ThemeColor,
  ) => void
  togglePhaseEnabled: (projectId: string, phaseKey: string) => void
  reorderPhase: (projectId: string, fromKey: string, toKey: string) => void
  replaceSettingsMap: (newMap: Record<string, PhaseSettings>) => void
}

function ensureSettings(
  settingsMap: Record<string, PhaseSettings>,
  projectId: string,
): PhaseSettings {
  return settingsMap[projectId] ?? createDefaultPhaseSettings()
}

export const useScheduleSettingsStore = create<ScheduleSettingsState>()(
  persist(
    (set, get) => ({
      settingsMap: {},

      getSettings: (projectId: string) => {
        return get().settingsMap[projectId] ?? createDefaultPhaseSettings()
      },

      updatePhaseName: (projectId, phaseKey, name) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                phases: settings.phases.map((p) =>
                  p.phaseKey === phaseKey ? { ...p, name } : p,
                ),
              },
            },
          }
        })
      },

      updatePhaseColor: (projectId, phaseKey, color) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          // 単一string値を受け取った場合はThemeColorオブジェクトに変換
          const themeColor = migrateToThemeColor(color)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                phases: settings.phases.map((p) =>
                  p.phaseKey === phaseKey ? { ...p, color: themeColor } : p,
                ),
              },
            },
          }
        })
      },

      togglePhaseEnabled: (projectId, phaseKey) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                phases: settings.phases.map((p) =>
                  p.phaseKey === phaseKey ? { ...p, enabled: !p.enabled } : p,
                ),
              },
            },
          }
        })
      },

      reorderPhase: (projectId, fromKey, toKey) => {
        set((state) => {
          const settings = ensureSettings(state.settingsMap, projectId)
          const sorted = [...settings.phases].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          )
          const fromIdx = sorted.findIndex((p) => p.phaseKey === fromKey)
          const toIdx = sorted.findIndex((p) => p.phaseKey === toKey)

          if (fromIdx === -1 || toIdx === -1) return state

          const fromOrder = sorted[fromIdx]?.sortOrder ?? 0
          const toOrder = sorted[toIdx]?.sortOrder ?? 0

          return {
            settingsMap: {
              ...state.settingsMap,
              [projectId]: {
                ...settings,
                lastModified: new Date().toISOString(),
                phases: settings.phases.map((p) => {
                  if (p.phaseKey === fromKey)
                    return { ...p, sortOrder: toOrder }
                  if (p.phaseKey === toKey)
                    return { ...p, sortOrder: fromOrder }
                  return p
                }),
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
      name: 'schedule-settings-storage',
    },
  ),
)
