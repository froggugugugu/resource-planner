import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonStorage } from '@/infrastructure/storage'
import type { Database } from '@/shared/types/database'
import { useMembersStore } from '@/stores/members-store'
import { useTeamStore } from '@/stores/team-store'

const mockDb: Partial<Database> = {
  version: '1.0.0',
  fiscalYear: 2025,
  projects: [],
  members: [],
  divisions: [],
  sections: [],
  metadata: {
    lastModified: new Date().toISOString(),
    createdBy: 'test',
    version: '1.0.0',
  },
}

vi.mock('@/infrastructure/storage', () => ({
  jsonStorage: {
    load: vi.fn(() => ({ ...mockDb })),
    save: vi.fn(),
  },
}))

const mockLoad = vi.mocked(jsonStorage.load)

describe('useTeamStore', () => {
  beforeEach(() => {
    useTeamStore.setState({ divisions: [], sections: [] })
    useMembersStore.setState({ members: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Division CRUD', () => {
    it('部門を追加できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      expect(division.name).toBe('開発本部')
      expect(division.id).toBeDefined()
      expect(division.sortOrder).toBe(0)
      expect(useTeamStore.getState().divisions).toHaveLength(1)
    })

    it('部門追加時にsortOrderが自動設定される', () => {
      useTeamStore.getState().addDivision('開発本部')
      const second = useTeamStore.getState().addDivision('営業本部')
      expect(second.sortOrder).toBe(1)
    })

    it('部門名を更新できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      useTeamStore.getState().updateDivision(division.id, 'テクノロジー本部')
      const updated = useTeamStore
        .getState()
        .divisions.find((d) => d.id === division.id)
      expect(updated?.name).toBe('テクノロジー本部')
    })

    it('部門を削除できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      useTeamStore.getState().deleteDivision(division.id)
      expect(useTeamStore.getState().divisions).toHaveLength(0)
    })

    it('部門削除時に子課も削除される', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      useTeamStore.getState().addSection(division.id, '第1課')
      useTeamStore.getState().addSection(division.id, '第2課')
      expect(useTeamStore.getState().sections).toHaveLength(2)

      useTeamStore.getState().deleteDivision(division.id)
      expect(useTeamStore.getState().sections).toHaveLength(0)
    })

    it('部門削除時に所属メンバーのsectionIdがnullになる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')

      // メンバーを追加
      useMembersStore.setState({
        members: [
          {
            id: 'm1',
            name: '田中太郎',
            department: '',
            sectionId: section.id,
            role: 'エンジニア',
            isActive: true,
            startDate: null,
            endDate: null,
            unitPriceHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'm2',
            name: '鈴木花子',
            department: '',
            sectionId: null,
            role: 'PM',
            isActive: true,
            startDate: null,
            endDate: null,
            unitPriceHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })

      useTeamStore.getState().deleteDivision(division.id)

      const members = useMembersStore.getState().members
      expect(members[0]?.sectionId).toBeNull()
      expect(members[1]?.sectionId).toBeNull() // 元々null
    })
  })

  describe('Section CRUD', () => {
    it('課を追加できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')
      expect(section.name).toBe('第1課')
      expect(section.divisionId).toBe(division.id)
      expect(section.sortOrder).toBe(0)
      expect(useTeamStore.getState().sections).toHaveLength(1)
    })

    it('同一部門内の課追加時にsortOrderが自動設定される', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      useTeamStore.getState().addSection(division.id, '第1課')
      const second = useTeamStore.getState().addSection(division.id, '第2課')
      expect(second.sortOrder).toBe(1)
    })

    it('課名を更新できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')
      useTeamStore.getState().updateSection(section.id, 'Web開発課')
      const updated = useTeamStore
        .getState()
        .sections.find((s) => s.id === section.id)
      expect(updated?.name).toBe('Web開発課')
    })

    it('課を削除できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')
      useTeamStore.getState().deleteSection(section.id)
      expect(useTeamStore.getState().sections).toHaveLength(0)
    })

    it('課削除時に所属メンバーのsectionIdがnullになる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')

      useMembersStore.setState({
        members: [
          {
            id: 'm1',
            name: '田中太郎',
            department: '',
            sectionId: section.id,
            role: 'エンジニア',
            isActive: true,
            startDate: null,
            endDate: null,
            unitPriceHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })

      useTeamStore.getState().deleteSection(section.id)
      expect(useMembersStore.getState().members[0]?.sectionId).toBeNull()
    })
  })

  describe('Selectors', () => {
    it('getSectionsByDivisionで部門の課一覧を取得できる', () => {
      const div1 = useTeamStore.getState().addDivision('開発本部')
      const div2 = useTeamStore.getState().addDivision('営業本部')
      useTeamStore.getState().addSection(div1.id, '第1課')
      useTeamStore.getState().addSection(div1.id, '第2課')
      useTeamStore.getState().addSection(div2.id, '営業1課')

      const sections = useTeamStore.getState().getSectionsByDivision(div1.id)
      expect(sections).toHaveLength(2)
      expect(sections.every((s) => s.divisionId === div1.id)).toBe(true)
    })

    it('getDivisionByIdで部門を取得できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const found = useTeamStore.getState().getDivisionById(division.id)
      expect(found?.name).toBe('開発本部')
    })

    it('getDivisionByIdで存在しないIDはundefinedを返す', () => {
      const found = useTeamStore.getState().getDivisionById('nonexistent')
      expect(found).toBeUndefined()
    })

    it('getSectionByIdで課を取得できる', () => {
      const division = useTeamStore.getState().addDivision('開発本部')
      const section = useTeamStore.getState().addSection(division.id, '第1課')
      const found = useTeamStore.getState().getSectionById(section.id)
      expect(found?.name).toBe('第1課')
    })

    it('getSectionByIdで存在しないIDはundefinedを返す', () => {
      const found = useTeamStore.getState().getSectionById('nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('members-store新セレクタ', () => {
    const baseMember = {
      department: '',
      role: 'エンジニア',
      isActive: true,
      unitPriceHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('getMembersBySectionで課のメンバー一覧を取得できる', () => {
      const sectionId = crypto.randomUUID()
      useMembersStore.setState({
        members: [
          {
            ...baseMember,
            id: 'm1',
            name: '田中太郎',
            sectionId,
            startDate: null,
            endDate: null,
          },
          {
            ...baseMember,
            id: 'm2',
            name: '鈴木花子',
            sectionId: crypto.randomUUID(),
            startDate: null,
            endDate: null,
          },
          {
            ...baseMember,
            id: 'm3',
            name: '佐藤一郎',
            sectionId,
            startDate: null,
            endDate: null,
          },
        ],
      })

      const members = useMembersStore.getState().getMembersBySection(sectionId)
      expect(members).toHaveLength(2)
      expect(members.map((m) => m.name)).toEqual(['田中太郎', '佐藤一郎'])
    })

    it('getUnaffiliatedMembersで未所属メンバーを取得できる', () => {
      useMembersStore.setState({
        members: [
          {
            ...baseMember,
            id: 'm1',
            name: '田中太郎',
            sectionId: crypto.randomUUID(),
            startDate: null,
            endDate: null,
          },
          {
            ...baseMember,
            id: 'm2',
            name: '山田次郎',
            sectionId: null,
            startDate: null,
            endDate: null,
          },
        ],
      })

      const unaffiliated = useMembersStore.getState().getUnaffiliatedMembers()
      expect(unaffiliated).toHaveLength(1)
      expect(unaffiliated[0]?.name).toBe('山田次郎')
    })

    it('getMembersActiveInFiscalYearでFY2025（4月始まり）の在籍メンバーを取得できる', () => {
      useMembersStore.setState({
        members: [
          {
            ...baseMember,
            id: 'a',
            name: 'メンバーA',
            sectionId: null,
            startDate: '2025-02-11',
            endDate: null,
          },
          {
            ...baseMember,
            id: 'b',
            name: 'メンバーB',
            sectionId: null,
            startDate: '2025-05-11',
            endDate: '2026-02-11',
          },
          {
            ...baseMember,
            id: 'c',
            name: 'メンバーC',
            sectionId: null,
            startDate: '2026-04-01',
            endDate: null,
          },
          {
            ...baseMember,
            id: 'd',
            name: 'メンバーD',
            sectionId: null,
            startDate: null,
            endDate: null,
          },
        ],
      })

      // FY2025 = 2025/04 - 2026/03
      const active = useMembersStore
        .getState()
        .getMembersActiveInFiscalYear(2025, 4)
      expect(active.map((m) => m.name).sort()).toEqual([
        'メンバーA',
        'メンバーB',
      ])
    })

    it('getMembersActiveInFiscalYearでFY2024の在籍メンバーを取得できる', () => {
      useMembersStore.setState({
        members: [
          {
            ...baseMember,
            id: 'a',
            name: 'メンバーA',
            sectionId: null,
            startDate: '2025-02-11',
            endDate: null,
          },
          {
            ...baseMember,
            id: 'b',
            name: 'メンバーB',
            sectionId: null,
            startDate: '2025-05-11',
            endDate: '2026-02-11',
          },
        ],
      })

      // FY2024 = 2024/04 - 2025/03
      const active = useMembersStore
        .getState()
        .getMembersActiveInFiscalYear(2024, 4)
      // メンバーA: startDate 2025-02 <= 2025-03 && endDate 9999 >= 2024-04 → true
      // メンバーB: startDate 2025-05 <= 2025-03 → false
      expect(active).toHaveLength(1)
      expect(active[0]?.name).toBe('メンバーA')
    })

    it('endDateが年度終了月と一致するメンバーも対象になる', () => {
      useMembersStore.setState({
        members: [
          {
            ...baseMember,
            id: 'a',
            name: 'メンバーA',
            sectionId: null,
            startDate: '2024-04-01',
            endDate: '2025-03-31',
          },
        ],
      })

      // FY2024 = 2024/04 - 2025/03
      const active = useMembersStore
        .getState()
        .getMembersActiveInFiscalYear(2024, 4)
      expect(active).toHaveLength(1)
    })
  })

  describe('loadTeam', () => {
    it('jsonStorageからデータを読み込める', () => {
      const divisionId = crypto.randomUUID()
      const sectionId = crypto.randomUUID()
      mockLoad.mockReturnValueOnce({
        ...(mockDb as Database),
        divisions: [
          {
            id: divisionId,
            name: '開発本部',
            sortOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        sections: [
          {
            id: sectionId,
            divisionId,
            name: '第1課',
            sortOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      } as Database)

      useTeamStore.getState().loadTeam()
      expect(useTeamStore.getState().divisions).toHaveLength(1)
      expect(useTeamStore.getState().sections).toHaveLength(1)
    })
  })
})
