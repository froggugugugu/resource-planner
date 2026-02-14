import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonStorage } from '@/infrastructure/storage'
import type { Project } from '@/shared/types'
import type { Database } from '@/shared/types/database'
import { useProjectsStore } from '@/stores/projects-store'

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
const mockSave = vi.mocked(jsonStorage.save)

/** テスト用CreateProjectデータ */
const createProjectData = (overrides: Partial<Project> = {}) => ({
  code: 'P001',
  name: 'テストプロジェクト',
  parentId: null,
  level: 0 as const,
  status: 'not_started' as const,
  confidence: null,
  ...overrides,
})

describe('useProjectsStore', () => {
  beforeEach(() => {
    useProjectsStore.setState({ projects: [] })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addProject', () => {
    it('案件を追加できる（id, createdAt, updatedAt 自動生成）', () => {
      const data = createProjectData()
      const project = useProjectsStore.getState().addProject(data)

      expect(project.id).toBeDefined()
      expect(project.createdAt).toBeDefined()
      expect(project.updatedAt).toBeDefined()
      expect(project.code).toBe('P001')
      expect(project.name).toBe('テストプロジェクト')
      expect(project.parentId).toBeNull()
      expect(project.level).toBe(0)
      expect(project.status).toBe('not_started')
      expect(project.confidence).toBeNull()
      expect(useProjectsStore.getState().projects).toHaveLength(1)
    })

    it('親案件IDを設定できる', () => {
      const parent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '親案件' }))

      const child = useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '子案件',
          parentId: parent.id,
          level: 1,
        }),
      )

      expect(child.parentId).toBe(parent.id)
      expect(child.level).toBe(1)
      expect(useProjectsStore.getState().projects).toHaveLength(2)
    })

    it('jsonStorage.saveが呼ばれる', () => {
      useProjectsStore.getState().addProject(createProjectData())
      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: expect.arrayContaining([
            expect.objectContaining({ code: 'P001' }),
          ]),
        }),
      )
    })
  })

  describe('updateProject', () => {
    it('案件情報を更新できる', () => {
      const project = useProjectsStore
        .getState()
        .addProject(createProjectData())

      useProjectsStore.getState().updateProject({
        id: project.id,
        name: '更新後の名前',
        status: 'active',
      })

      const updated = useProjectsStore.getState().getProjectById(project.id)
      expect(updated?.name).toBe('更新後の名前')
      expect(updated?.status).toBe('active')
    })

    it('updatedAtが更新される', () => {
      const project = useProjectsStore
        .getState()
        .addProject(createProjectData())

      // createdAtと区別できるように少し前の時刻を手動で設定
      const pastDate = '2020-01-01T00:00:00.000Z'
      useProjectsStore.setState({
        projects: useProjectsStore
          .getState()
          .projects.map((p) =>
            p.id === project.id ? { ...p, updatedAt: pastDate } : p,
          ),
      })

      useProjectsStore.getState().updateProject({
        id: project.id,
        name: '更新テスト',
      })

      const updated = useProjectsStore.getState().getProjectById(project.id)
      expect(updated?.updatedAt).toBeDefined()
      expect(updated?.updatedAt).not.toBe(pastDate)
    })

    it('部分更新が可能（nameのみ更新）', () => {
      const project = useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P002',
          name: '元の名前',
          status: 'active',
          confidence: 'A',
        }),
      )

      useProjectsStore.getState().updateProject({
        id: project.id,
        name: '新しい名前',
      })

      const updated = useProjectsStore.getState().getProjectById(project.id)
      expect(updated?.name).toBe('新しい名前')
      expect(updated?.code).toBe('P002')
      expect(updated?.status).toBe('active')
      expect(updated?.confidence).toBe('A')
    })
  })

  describe('updateProjectsBatch', () => {
    it('複数案件を一括更新できる', () => {
      const p1 = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '案件1' }))
      const p2 = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P002', name: '案件2' }))

      useProjectsStore.getState().updateProjectsBatch([
        { id: p1.id, status: 'active' },
        { id: p2.id, status: 'completed' },
      ])

      const updated1 = useProjectsStore.getState().getProjectById(p1.id)
      const updated2 = useProjectsStore.getState().getProjectById(p2.id)
      expect(updated1?.status).toBe('active')
      expect(updated2?.status).toBe('completed')
    })

    it('更新対象でない案件に影響しない', () => {
      const p1 = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '案件1' }))
      const p2 = useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P002',
          name: '案件2',
          status: 'active',
        }),
      )

      useProjectsStore
        .getState()
        .updateProjectsBatch([{ id: p1.id, name: '更新済み案件1' }])

      const unchanged = useProjectsStore.getState().getProjectById(p2.id)
      expect(unchanged?.name).toBe('案件2')
      expect(unchanged?.status).toBe('active')
      expect(unchanged?.updatedAt).toBe(p2.updatedAt)
    })
  })

  describe('deleteProject', () => {
    it('案件を削除できる', () => {
      const project = useProjectsStore
        .getState()
        .addProject(createProjectData())
      expect(useProjectsStore.getState().projects).toHaveLength(1)

      useProjectsStore.getState().deleteProject(project.id)
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })

    it('子案件も再帰的に削除される（cascade）', () => {
      const parent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '親案件' }))
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '子案件1',
          parentId: parent.id,
          level: 1,
        }),
      )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-02',
          name: '子案件2',
          parentId: parent.id,
          level: 1,
        }),
      )
      expect(useProjectsStore.getState().projects).toHaveLength(3)

      useProjectsStore.getState().deleteProject(parent.id)
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })

    it('孫案件も削除される（3階層cascade）', () => {
      const grandparent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '祖父案件' }))
      const parent = useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '親案件',
          parentId: grandparent.id,
          level: 1,
        }),
      )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01-001',
          name: '孫案件',
          parentId: parent.id,
          level: 2,
        }),
      )
      expect(useProjectsStore.getState().projects).toHaveLength(3)

      useProjectsStore.getState().deleteProject(grandparent.id)
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })

    it('jsonStorage.saveが呼ばれる', () => {
      const project = useProjectsStore
        .getState()
        .addProject(createProjectData())
      mockSave.mockClear()

      useProjectsStore.getState().deleteProject(project.id)
      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [],
        }),
      )
    })
  })

  describe('selectors', () => {
    it('getProjectByIdで案件を取得できる', () => {
      const project = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: 'テスト案件' }))

      const found = useProjectsStore.getState().getProjectById(project.id)
      expect(found?.name).toBe('テスト案件')
      expect(found?.id).toBe(project.id)
    })

    it('getProjectByIdで存在しないIDはundefinedを返す', () => {
      const found = useProjectsStore.getState().getProjectById('nonexistent-id')
      expect(found).toBeUndefined()
    })

    it('getProjectsByLevelでレベル別案件一覧を取得できる', () => {
      useProjectsStore
        .getState()
        .addProject(
          createProjectData({ code: 'P001', name: '案件A', level: 0 }),
        )
      const parent = useProjectsStore
        .getState()
        .addProject(
          createProjectData({ code: 'P002', name: '案件B', level: 0 }),
        )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P002-01',
          name: '子案件',
          parentId: parent.id,
          level: 1,
        }),
      )

      const level0 = useProjectsStore.getState().getProjectsByLevel(0)
      const level1 = useProjectsStore.getState().getProjectsByLevel(1)
      expect(level0).toHaveLength(2)
      expect(level1).toHaveLength(1)
      expect(level1[0]?.name).toBe('子案件')
    })

    it('getProjectsByParentIdで子案件一覧を取得できる', () => {
      const parent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '親' }))
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '子1',
          parentId: parent.id,
          level: 1,
        }),
      )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-02',
          name: '子2',
          parentId: parent.id,
          level: 1,
        }),
      )
      useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P002', name: '別案件' }))

      const children = useProjectsStore
        .getState()
        .getProjectsByParentId(parent.id)
      expect(children).toHaveLength(2)
      expect(children.map((c) => c.name).sort()).toEqual(['子1', '子2'])
    })
  })

  describe('getProjectTree', () => {
    it('フラットな案件リストをツリー構造に変換できる', () => {
      const parent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '親案件' }))
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '子案件',
          parentId: parent.id,
          level: 1,
        }),
      )

      const tree = useProjectsStore.getState().getProjectTree()
      expect(tree).toHaveLength(1)
      expect(tree[0]?.name).toBe('親案件')
      expect(tree[0]?.children).toHaveLength(1)
      expect(tree[0]?.children[0]?.name).toBe('子案件')
      expect(tree[0]?.depth).toBe(0)
      expect(tree[0]?.children[0]?.depth).toBe(1)
    })

    it('空リストから空ツリーを返す', () => {
      const tree = useProjectsStore.getState().getProjectTree()
      expect(tree).toEqual([])
    })

    it('子がコード順にソートされる', () => {
      const parent = useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '親' }))
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-03',
          name: '子C',
          parentId: parent.id,
          level: 1,
        }),
      )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-01',
          name: '子A',
          parentId: parent.id,
          level: 1,
        }),
      )
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P001-02',
          name: '子B',
          parentId: parent.id,
          level: 1,
        }),
      )

      const tree = useProjectsStore.getState().getProjectTree()
      const childNames = tree[0]?.children.map((c) => c.name)
      expect(childNames).toEqual(['子A', '子B', '子C'])
    })

    it('orphan（parentIdが無効）はルートに含まれない', () => {
      useProjectsStore
        .getState()
        .addProject(createProjectData({ code: 'P001', name: '正常案件' }))
      useProjectsStore.getState().addProject(
        createProjectData({
          code: 'P002-01',
          name: '孤児案件',
          parentId: 'nonexistent-parent-id',
          level: 1,
        }),
      )

      const tree = useProjectsStore.getState().getProjectTree()
      expect(tree).toHaveLength(1)
      expect(tree[0]?.name).toBe('正常案件')
    })
  })

  describe('loadProjects', () => {
    it('jsonStorageからデータを読み込める', () => {
      const now = new Date().toISOString()
      mockLoad.mockReturnValueOnce({
        ...(mockDb as Database),
        projects: [
          {
            id: crypto.randomUUID(),
            code: 'P001',
            name: '読み込みテスト',
            parentId: null,
            level: 0,
            status: 'not_started',
            confidence: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      } as Database)

      useProjectsStore.getState().loadProjects()
      const projects = useProjectsStore.getState().projects
      expect(projects).toHaveLength(1)
      expect(projects[0]?.name).toBe('読み込みテスト')
      expect(projects[0]?.level).toBe(0)
    })

    it("旧文字列レベルがマイグレーションされる（'project'→0, 'major'→1）", () => {
      const now = new Date().toISOString()
      mockLoad.mockReturnValueOnce({
        ...(mockDb as Database),
        projects: [
          {
            id: crypto.randomUUID(),
            code: 'P001',
            name: 'プロジェクトレベル',
            parentId: null,
            level: 'project' as unknown as number,
            status: 'not_started',
            confidence: null,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: crypto.randomUUID(),
            code: 'P001-01',
            name: 'メジャーレベル',
            parentId: null,
            level: 'major' as unknown as number,
            status: 'not_started',
            confidence: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      } as Database)

      useProjectsStore.getState().loadProjects()
      const projects = useProjectsStore.getState().projects
      expect(projects).toHaveLength(2)
      expect(projects[0]?.level).toBe(0) // 'project' → 0
      expect(projects[1]?.level).toBe(1) // 'major' → 1
    })
  })
})
