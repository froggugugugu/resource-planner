import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type { CreateMember, Member, UpdateMember } from '@/shared/types'
import { extractRoles } from '@/shared/types'

interface MembersState {
  members: Member[]
  // Actions
  loadMembers: () => void
  addMember: (
    data: Omit<CreateMember, 'department'> & { department?: string },
  ) => Member
  updateMember: (data: UpdateMember) => void
  deleteMember: (id: string) => void
  // Selectors
  getMemberById: (id: string) => Member | undefined
  getActiveMembers: () => Member[]
  getRoles: () => string[]
  getMembersBySection: (sectionId: string) => Member[]
  getUnaffiliatedMembers: () => Member[]
  getMembersActiveInFiscalYear: (
    fiscalYear: number,
    startMonth: number,
  ) => Member[]
}

export const useMembersStore = create<MembersState>()((set, get) => ({
  members: [],

  loadMembers: () => {
    const db = jsonStorage.load()
    set({ members: db.members })
  },

  addMember: (data) => {
    const now = new Date().toISOString()
    const newMember: Member = {
      department: '',
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newMembers = [...state.members, newMember]
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, members: newMembers })
      return { members: newMembers }
    })

    return newMember
  },

  updateMember: (data) => {
    set((state) => {
      const newMembers = state.members.map((m) =>
        m.id === data.id
          ? { ...m, ...data, updatedAt: new Date().toISOString() }
          : m,
      )
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, members: newMembers })
      return { members: newMembers }
    })
  },

  deleteMember: (id) => {
    set((state) => {
      const newMembers = state.members.filter((m) => m.id !== id)
      const db = jsonStorage.load()
      jsonStorage.save({
        ...db,
        members: newMembers,
      })
      return { members: newMembers }
    })
  },

  getMemberById: (id) => {
    return get().members.find((m) => m.id === id)
  },

  getActiveMembers: () => {
    return get().members.filter((m) => m.isActive)
  },

  getRoles: () => {
    return extractRoles(get().members)
  },

  getMembersBySection: (sectionId) => {
    return get().members.filter((m) => m.sectionId === sectionId)
  },

  getUnaffiliatedMembers: () => {
    return get().members.filter((m) => m.sectionId === null)
  },

  getMembersActiveInFiscalYear: (fiscalYear, startMonth) => {
    // 年度の開始月・終了月を算出
    const fyStartYear = fiscalYear
    const fyStartMonth = startMonth
    const fyEndYear = fyStartMonth === 1 ? fiscalYear : fiscalYear + 1
    const fyEndMonth =
      fyStartMonth === 1 ? 12 : ((fyStartMonth - 2 + 12) % 12) + 1
    const fyStart = `${fyStartYear}-${String(fyStartMonth).padStart(2, '0')}`
    const fyEnd = `${fyEndYear}-${String(fyEndMonth).padStart(2, '0')}`

    return get().members.filter((m) => {
      // startDateがnullの場合は非表示
      if (!m.startDate) return false

      const memberStart = m.startDate.substring(0, 7) // "YYYY-MM"
      const memberEnd = m.endDate ? m.endDate.substring(0, 7) : '9999-12'

      // 期間の重なり判定: memberStart <= fyEnd && memberEnd >= fyStart
      return memberStart <= fyEnd && memberEnd >= fyStart
    })
  },
}))
