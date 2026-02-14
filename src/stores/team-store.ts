import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type { Division } from '@/shared/types/division'
import type { Section } from '@/shared/types/section'
import { useMembersStore } from './members-store'

interface TeamState {
  divisions: Division[]
  sections: Section[]

  // Actions
  loadTeam: () => void
  addDivision: (name: string) => Division
  updateDivision: (id: string, name: string) => void
  deleteDivision: (id: string) => void

  addSection: (divisionId: string, name: string) => Section
  updateSection: (id: string, name: string) => void
  deleteSection: (id: string) => void

  // Selectors
  getSectionsByDivision: (divisionId: string) => Section[]
  getDivisionById: (id: string) => Division | undefined
  getSectionById: (id: string) => Section | undefined
}

export const useTeamStore = create<TeamState>()((set, get) => ({
  divisions: [],
  sections: [],

  loadTeam: () => {
    const db = jsonStorage.load()
    set({
      divisions: db.divisions ?? [],
      sections: db.sections ?? [],
    })
  },

  addDivision: (name) => {
    const now = new Date().toISOString()
    const maxSortOrder = get().divisions.reduce(
      (max, d) => Math.max(max, d.sortOrder),
      -1,
    )
    const newDivision: Division = {
      id: crypto.randomUUID(),
      name,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newDivisions = [...state.divisions, newDivision]
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, divisions: newDivisions })
      return { divisions: newDivisions }
    })

    return newDivision
  },

  updateDivision: (id, name) => {
    set((state) => {
      const newDivisions = state.divisions.map((d) =>
        d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d,
      )
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, divisions: newDivisions })
      return { divisions: newDivisions }
    })
  },

  deleteDivision: (id) => {
    const childSectionIds = get()
      .sections.filter((s) => s.divisionId === id)
      .map((s) => s.id)

    set((state) => {
      const newDivisions = state.divisions.filter((d) => d.id !== id)
      const newSections = state.sections.filter((s) => s.divisionId !== id)
      const db = jsonStorage.load()
      jsonStorage.save({
        ...db,
        divisions: newDivisions,
        sections: newSections,
      })
      return { divisions: newDivisions, sections: newSections }
    })

    // メンバーのsectionIdをnullに更新
    if (childSectionIds.length > 0) {
      const membersStore = useMembersStore.getState()
      const affectedMembers = membersStore.members.filter(
        (m) => m.sectionId && childSectionIds.includes(m.sectionId),
      )
      for (const member of affectedMembers) {
        membersStore.updateMember({ id: member.id, sectionId: null })
      }
    }
  },

  addSection: (divisionId, name) => {
    const now = new Date().toISOString()
    const siblingSections = get().sections.filter(
      (s) => s.divisionId === divisionId,
    )
    const maxSortOrder = siblingSections.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      -1,
    )
    const newSection: Section = {
      id: crypto.randomUUID(),
      divisionId,
      name,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newSections = [...state.sections, newSection]
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, sections: newSections })
      return { sections: newSections }
    })

    return newSection
  },

  updateSection: (id, name) => {
    set((state) => {
      const newSections = state.sections.map((s) =>
        s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s,
      )
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, sections: newSections })
      return { sections: newSections }
    })
  },

  deleteSection: (id) => {
    set((state) => {
      const newSections = state.sections.filter((s) => s.id !== id)
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, sections: newSections })
      return { sections: newSections }
    })

    // メンバーのsectionIdをnullに更新
    const membersStore = useMembersStore.getState()
    const affectedMembers = membersStore.members.filter(
      (m) => m.sectionId === id,
    )
    for (const member of affectedMembers) {
      membersStore.updateMember({ id: member.id, sectionId: null })
    }
  },

  getSectionsByDivision: (divisionId) => {
    return get().sections.filter((s) => s.divisionId === divisionId)
  },

  getDivisionById: (id) => {
    return get().divisions.find((d) => d.id === id)
  },

  getSectionById: (id) => {
    return get().sections.find((s) => s.id === id)
  },
}))
