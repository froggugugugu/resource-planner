import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type {
  AssignmentEntry,
  CreateAssignmentEntry,
} from '@/shared/types/assignment'

interface AssignmentState {
  assignments: AssignmentEntry[]

  // Actions
  loadAssignments: () => void
  upsertAssignment: (data: CreateAssignmentEntry) => void
  updateMonthlyValue: (id: string, monthKey: string, value: number) => void
  deleteAssignment: (id: string) => void
  deleteByTask: (taskId: string) => void

  // Selectors
  getByProject: (projectId: string) => AssignmentEntry[]
  getByTask: (taskId: string) => AssignmentEntry[]
  getByMember: (memberId: string) => AssignmentEntry[]
  getMemberMonthlyTotal: (memberId: string, monthKey: string) => number
  getMemberMonthlyBreakdown: (
    memberId: string,
    monthKey: string,
  ) => { projectId: string; taskId: string; value: number }[]
}

function saveAssignments(assignments: AssignmentEntry[]) {
  const db = jsonStorage.load()
  jsonStorage.save({ ...db, assignments })
}

export const useAssignmentStore = create<AssignmentState>()((set, get) => ({
  assignments: [],

  loadAssignments: () => {
    const db = jsonStorage.load()
    set({ assignments: db.assignments ?? [] })
  },

  upsertAssignment: (data) => {
    set((state) => {
      const existing = state.assignments.find(
        (a) =>
          a.projectId === data.projectId &&
          a.taskId === data.taskId &&
          a.memberId === data.memberId,
      )

      const now = new Date().toISOString()
      let newAssignments: AssignmentEntry[]

      if (existing) {
        newAssignments = state.assignments.map((a) =>
          a.id === existing.id
            ? { ...a, monthlyValues: data.monthlyValues, updatedAt: now }
            : a,
        )
      } else {
        const newEntry: AssignmentEntry = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }
        newAssignments = [...state.assignments, newEntry]
      }

      saveAssignments(newAssignments)
      return { assignments: newAssignments }
    })
  },

  updateMonthlyValue: (id, monthKey, value) => {
    set((state) => {
      const now = new Date().toISOString()
      const newAssignments = state.assignments.map((a) => {
        if (a.id !== id) return a
        const newMonthlyValues = { ...a.monthlyValues }
        if (value === 0) {
          delete newMonthlyValues[monthKey]
        } else {
          newMonthlyValues[monthKey] = value
        }
        return { ...a, monthlyValues: newMonthlyValues, updatedAt: now }
      })

      saveAssignments(newAssignments)
      return { assignments: newAssignments }
    })
  },

  deleteAssignment: (id) => {
    set((state) => {
      const newAssignments = state.assignments.filter((a) => a.id !== id)
      saveAssignments(newAssignments)
      return { assignments: newAssignments }
    })
  },

  deleteByTask: (taskId) => {
    set((state) => {
      const newAssignments = state.assignments.filter(
        (a) => a.taskId !== taskId,
      )
      saveAssignments(newAssignments)
      return { assignments: newAssignments }
    })
  },

  getByProject: (projectId) => {
    return get().assignments.filter((a) => a.projectId === projectId)
  },

  getByTask: (taskId) => {
    return get().assignments.filter((a) => a.taskId === taskId)
  },

  getByMember: (memberId) => {
    return get().assignments.filter((a) => a.memberId === memberId)
  },

  getMemberMonthlyTotal: (memberId, monthKey) => {
    return get()
      .assignments.filter((a) => a.memberId === memberId)
      .reduce((sum, a) => sum + (a.monthlyValues[monthKey] ?? 0), 0)
  },

  getMemberMonthlyBreakdown: (memberId, monthKey) => {
    return get()
      .assignments.filter(
        (a) => a.memberId === memberId && a.monthlyValues[monthKey] != null,
      )
      .map((a) => ({
        projectId: a.projectId,
        taskId: a.taskId,
        value: a.monthlyValues[monthKey] ?? 0,
      }))
  },
}))
