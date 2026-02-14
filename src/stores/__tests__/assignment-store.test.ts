import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@/shared/types/database'
import { useAssignmentStore } from '@/stores/assignment-store'

// Mock jsonStorage
const mockDb: Partial<Database> = {
  version: '1.0.0',
  fiscalYear: 2025,
  projects: [],
  members: [],
  assignments: [],
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

describe('useAssignmentStore', () => {
  beforeEach(() => {
    // Reset store state
    useAssignmentStore.setState({ assignments: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadAssignments', () => {
    it('loads assignments from storage', () => {
      const store = useAssignmentStore.getState()
      store.loadAssignments()
      expect(useAssignmentStore.getState().assignments).toEqual([])
    })
  })

  describe('upsertAssignment', () => {
    it('creates a new assignment', () => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.5 },
      })

      const assignments = useAssignmentStore.getState().assignments
      expect(assignments).toHaveLength(1)
      expect(assignments[0]?.projectId).toBe(
        '00000000-0000-0000-0000-000000000001',
      )
      expect(assignments[0]?.taskId).toBe(
        '00000000-0000-0000-0000-000000000002',
      )
      expect(assignments[0]?.memberId).toBe(
        '00000000-0000-0000-0000-000000000003',
      )
      expect(assignments[0]?.monthlyValues['2025-04']).toBe(0.5)
    })

    it('updates existing assignment with same project/task/member', () => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.3 },
      })

      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.7 },
      })

      const assignments = useAssignmentStore.getState().assignments
      expect(assignments).toHaveLength(1)
      expect(assignments[0]?.monthlyValues['2025-04']).toBe(0.7)
    })
  })

  describe('updateMonthlyValue', () => {
    it('updates a specific month value', () => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.3 },
      })

      const id = useAssignmentStore.getState().assignments[0]?.id ?? ''
      store.updateMonthlyValue(id, '2025-04', 0.5)

      const entry = useAssignmentStore.getState().assignments[0]
      expect(entry?.monthlyValues['2025-04']).toBe(0.5)
    })

    it('removes month key when value is 0', () => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.3, '2025-05': 0.2 },
      })

      const id = useAssignmentStore.getState().assignments[0]?.id ?? ''
      store.updateMonthlyValue(id, '2025-04', 0)

      const entry = useAssignmentStore.getState().assignments[0]
      expect(entry?.monthlyValues['2025-04']).toBeUndefined()
      expect(entry?.monthlyValues['2025-05']).toBe(0.2)
    })
  })

  describe('deleteAssignment', () => {
    it('removes assignment by id', () => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000002',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.5 },
      })

      const id = useAssignmentStore.getState().assignments[0]?.id ?? ''
      store.deleteAssignment(id)
      expect(useAssignmentStore.getState().assignments).toHaveLength(0)
    })
  })

  describe('deleteByTask', () => {
    it('removes all assignments for a task', () => {
      const store = useAssignmentStore.getState()
      const taskId = '00000000-0000-0000-0000-000000000002'

      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId,
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.3 },
      })
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId,
        memberId: '00000000-0000-0000-0000-000000000004',
        monthlyValues: { '2025-04': 0.2 },
      })
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000099',
        memberId: '00000000-0000-0000-0000-000000000003',
        monthlyValues: { '2025-04': 0.1 },
      })

      store.deleteByTask(taskId)
      const remaining = useAssignmentStore.getState().assignments
      expect(remaining).toHaveLength(1)
      expect(remaining[0]?.taskId).toBe('00000000-0000-0000-0000-000000000099')
    })
  })

  describe('selectors', () => {
    beforeEach(() => {
      const store = useAssignmentStore.getState()
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000010',
        memberId: '00000000-0000-0000-0000-000000000100',
        monthlyValues: { '2025-04': 0.3, '2025-05': 0.2 },
      })
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000001',
        taskId: '00000000-0000-0000-0000-000000000011',
        memberId: '00000000-0000-0000-0000-000000000100',
        monthlyValues: { '2025-04': 0.4 },
      })
      store.upsertAssignment({
        projectId: '00000000-0000-0000-0000-000000000002',
        taskId: '00000000-0000-0000-0000-000000000020',
        memberId: '00000000-0000-0000-0000-000000000100',
        monthlyValues: { '2025-04': 0.2 },
      })
    })

    it('getByProject returns assignments for a project', () => {
      const store = useAssignmentStore.getState()
      const result = store.getByProject('00000000-0000-0000-0000-000000000001')
      expect(result).toHaveLength(2)
    })

    it('getByTask returns assignments for a task', () => {
      const store = useAssignmentStore.getState()
      const result = store.getByTask('00000000-0000-0000-0000-000000000010')
      expect(result).toHaveLength(1)
    })

    it('getByMember returns all assignments for a member', () => {
      const store = useAssignmentStore.getState()
      const result = store.getByMember('00000000-0000-0000-0000-000000000100')
      expect(result).toHaveLength(3)
    })

    it('getMemberMonthlyTotal sums across all projects', () => {
      const store = useAssignmentStore.getState()
      const total = store.getMemberMonthlyTotal(
        '00000000-0000-0000-0000-000000000100',
        '2025-04',
      )
      expect(total).toBeCloseTo(0.9)
    })

    it('getMemberMonthlyBreakdown returns per-project details', () => {
      const store = useAssignmentStore.getState()
      const breakdown = store.getMemberMonthlyBreakdown(
        '00000000-0000-0000-0000-000000000100',
        '2025-04',
      )
      expect(breakdown).toHaveLength(3)
      const totalFromBreakdown = breakdown.reduce((s, b) => s + b.value, 0)
      expect(totalFromBreakdown).toBeCloseTo(0.9)
    })
  })
})
