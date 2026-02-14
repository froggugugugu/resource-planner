import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type {
  DependencyType,
  PhaseDependency,
  ScheduleEntry,
} from '@/shared/types/schedule'

interface ScheduleState {
  entries: ScheduleEntry[]
  dependencies: PhaseDependency[]

  // Entry operations
  loadSchedule: () => void
  upsertEntry: (
    projectId: string,
    phaseKey: string,
    startDate: string,
    endDate: string,
  ) => void
  deleteEntry: (projectId: string, phaseKey: string) => void
  deleteByProject: (projectId: string) => void

  // Dependency operations
  addDependency: (
    projectId: string,
    from: string,
    to: string,
    type: DependencyType,
  ) => void
  deleteDependency: (id: string) => void

  // Selectors (return new arrays to avoid Zustand mutation issues)
  getEntriesByProject: (projectId: string) => ScheduleEntry[]
  getDependenciesByProject: (projectId: string) => PhaseDependency[]
}

function saveSchedule(
  entries: ScheduleEntry[],
  dependencies: PhaseDependency[],
) {
  const db = jsonStorage.load()
  jsonStorage.save({ ...db, scheduleEntries: entries, dependencies })
}

export const useScheduleStore = create<ScheduleState>()((set, get) => ({
  entries: [],
  dependencies: [],

  loadSchedule: () => {
    const db = jsonStorage.load()
    set({
      entries: db.scheduleEntries ?? [],
      dependencies: db.dependencies ?? [],
    })
  },

  upsertEntry: (projectId, phaseKey, startDate, endDate) => {
    console.log('📦 [Store] upsertEntry:', {
      projectId,
      phaseKey,
      startDate,
      endDate,
    })
    set((state) => {
      const existing = state.entries.find(
        (e) => e.projectId === projectId && e.phaseKey === phaseKey,
      )

      console.log('  └ existing:', existing)

      let newEntries: ScheduleEntry[]
      if (existing) {
        console.log('  └ 既存エントリを更新')
        newEntries = state.entries.map((e) =>
          e.id === existing.id ? { ...e, startDate, endDate } : e,
        )
      } else {
        console.log('  └ 新規エントリを作成')
        newEntries = [
          ...state.entries,
          {
            id: crypto.randomUUID(),
            projectId,
            phaseKey,
            startDate,
            endDate,
          },
        ]
      }

      console.log('  └ newEntries:', newEntries)
      saveSchedule(newEntries, state.dependencies)
      console.log('  └ saveSchedule 完了')
      return { entries: newEntries }
    })
    console.log('  └ set 完了')
  },

  deleteEntry: (projectId, phaseKey) => {
    set((state) => {
      const newEntries = state.entries.filter(
        (e) => !(e.projectId === projectId && e.phaseKey === phaseKey),
      )
      saveSchedule(newEntries, state.dependencies)
      return { entries: newEntries }
    })
  },

  deleteByProject: (projectId) => {
    set((state) => {
      const newEntries = state.entries.filter((e) => e.projectId !== projectId)
      const newDeps = state.dependencies.filter(
        (d) => d.projectId !== projectId,
      )
      saveSchedule(newEntries, newDeps)
      return { entries: newEntries, dependencies: newDeps }
    })
  },

  addDependency: (projectId, fromPhaseKey, toPhaseKey, type) => {
    set((state) => {
      // Prevent duplicates (projectId × fromPhaseKey × toPhaseKey)
      const exists = state.dependencies.some(
        (d) =>
          d.projectId === projectId &&
          d.fromPhaseKey === fromPhaseKey &&
          d.toPhaseKey === toPhaseKey,
      )
      if (exists) return state

      const newDeps = [
        ...state.dependencies,
        {
          id: crypto.randomUUID(),
          projectId,
          fromPhaseKey,
          toPhaseKey,
          dependencyType: type,
        },
      ]

      saveSchedule(state.entries, newDeps)
      return { dependencies: newDeps }
    })
  },

  deleteDependency: (id) => {
    set((state) => {
      const newDeps = state.dependencies.filter((d) => d.id !== id)
      saveSchedule(state.entries, newDeps)
      return { dependencies: newDeps }
    })
  },

  getEntriesByProject: (projectId) => {
    return get().entries.filter((e) => e.projectId === projectId)
  },

  getDependenciesByProject: (projectId) => {
    return get().dependencies.filter((d) => d.projectId === projectId)
  },
}))
