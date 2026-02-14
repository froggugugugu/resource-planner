import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type { CreateEffortEntry, EffortEntry } from '@/shared/types/effort'

interface EffortsState {
  efforts: EffortEntry[]
  // Actions
  loadEfforts: () => void
  upsertEffort: (data: CreateEffortEntry) => void
  deleteEffort: (projectId: string, columnId: string) => void
  deleteByProject: (projectId: string) => void
  // Selectors
  getByProject: (projectId: string) => EffortEntry[]
  getByProjectAndColumn: (
    projectId: string,
    columnId: string,
  ) => EffortEntry | undefined
}

function saveEfforts(efforts: EffortEntry[]) {
  const db = jsonStorage.load()
  jsonStorage.save({ ...db, efforts })
}

export const useEffortsStore = create<EffortsState>()((set, get) => ({
  efforts: [],

  loadEfforts: () => {
    const db = jsonStorage.load()
    set({ efforts: db.efforts ?? [] })
  },

  upsertEffort: (data) => {
    set((state) => {
      const existing = state.efforts.find(
        (e) => e.projectId === data.projectId && e.columnId === data.columnId,
      )
      let newEfforts: EffortEntry[]
      if (existing) {
        newEfforts = state.efforts.map((e) =>
          e.id === existing.id ? { ...e, value: data.value } : e,
        )
      } else {
        const newEntry: EffortEntry = {
          ...data,
          id: crypto.randomUUID(),
        }
        newEfforts = [...state.efforts, newEntry]
      }
      saveEfforts(newEfforts)
      return { efforts: newEfforts }
    })
  },

  deleteEffort: (projectId, columnId) => {
    set((state) => {
      const newEfforts = state.efforts.filter(
        (e) => !(e.projectId === projectId && e.columnId === columnId),
      )
      saveEfforts(newEfforts)
      return { efforts: newEfforts }
    })
  },

  deleteByProject: (projectId) => {
    set((state) => {
      const newEfforts = state.efforts.filter((e) => e.projectId !== projectId)
      saveEfforts(newEfforts)
      return { efforts: newEfforts }
    })
  },

  getByProject: (projectId) => {
    return get().efforts.filter((e) => e.projectId === projectId)
  },

  getByProjectAndColumn: (projectId, columnId) => {
    return get().efforts.find(
      (e) => e.projectId === projectId && e.columnId === columnId,
    )
  },
}))
