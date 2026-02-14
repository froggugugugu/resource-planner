import { describe, expect, it } from 'vitest'
import {
  getFiscalYearMonths,
  getMemberAssignmentSummary,
  getMemberUtilizationRates,
  getProjectMonthlyAssignments,
  getSkillDistribution,
} from '@/features/dashboard/utils/dashboard-utils'
import type { AssignmentEntry } from '@/shared/types/assignment'
import type { Member } from '@/shared/types/member'
import type { TechTag } from '@/shared/types/tech-tag'
import type { TechTagCategory } from '@/shared/types/tech-tag-category'

// Helper to create assignment entries for tests
function createAssignment(
  projectId: string,
  memberId: string,
  monthlyValues: Record<string, number>,
): AssignmentEntry {
  return {
    id: crypto.randomUUID(),
    projectId,
    taskId: crypto.randomUUID(),
    memberId,
    monthlyValues,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Helper to create member entries for tests
function createMember(id: string, name: string, isActive = true): Member {
  return {
    id,
    name,
    department: 'Dev',
    sectionId: null,
    role: 'Engineer',
    isActive,
    techTagIds: [],
    startDate: '2025-04-01',
    endDate: null,
    unitPriceHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Helper to create member with overrides
function createFullMember(
  overrides: Partial<Member> & { id: string; name: string },
): Member {
  return {
    ...createMember(overrides.id, overrides.name),
    ...overrides,
  }
}

describe('getFiscalYearMonths', () => {
  it('generates 12 months from April to March for default fiscal year', () => {
    const months = getFiscalYearMonths(2025)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2025-04')
    expect(months[1]).toBe('2025-05')
    expect(months[2]).toBe('2025-06')
    expect(months[3]).toBe('2025-07')
    expect(months[4]).toBe('2025-08')
    expect(months[5]).toBe('2025-09')
    expect(months[6]).toBe('2025-10')
    expect(months[7]).toBe('2025-11')
    expect(months[8]).toBe('2025-12')
    expect(months[9]).toBe('2026-01')
    expect(months[10]).toBe('2026-02')
    expect(months[11]).toBe('2026-03')
  })

  it('handles year boundary correctly', () => {
    const months = getFiscalYearMonths(2024)
    expect(months[0]).toBe('2024-04')
    expect(months[11]).toBe('2025-03')
  })

  it('generates January to December for startMonth=1', () => {
    const months = getFiscalYearMonths(2025, 1)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2025-01')
    expect(months[11]).toBe('2025-12')
  })

  it('generates October to September for startMonth=10', () => {
    const months = getFiscalYearMonths(2025, 10)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2025-10')
    expect(months[1]).toBe('2025-11')
    expect(months[2]).toBe('2025-12')
    expect(months[3]).toBe('2026-01')
    expect(months[11]).toBe('2026-09')
  })
})

describe('getProjectMonthlyAssignments', () => {
  it('returns 12 entries with zero values when no assignments', () => {
    const result = getProjectMonthlyAssignments([], 2025)
    expect(result).toHaveLength(12)
    expect(result[0]).toEqual({ month: '2025-04' })
    expect(result[11]).toEqual({ month: '2026-03' })
  })

  it('aggregates assignments by projectId and month', () => {
    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2025-04': 0.3,
        '2025-05': 0.2,
      }),
      createAssignment('proj-1', 'mem-2', {
        '2025-04': 0.4,
      }),
      createAssignment('proj-2', 'mem-1', {
        '2025-04': 0.5,
      }),
    ]

    const result = getProjectMonthlyAssignments(assignments, 2025)

    // April: proj-1 = 0.3 + 0.4 = 0.7, proj-2 = 0.5
    const april = result.find((r) => r.month === '2025-04')
    expect(april?.['proj-1']).toBeCloseTo(0.7)
    expect(april?.['proj-2']).toBeCloseTo(0.5)

    // May: proj-1 = 0.2
    const may = result.find((r) => r.month === '2025-05')
    expect(may?.['proj-1']).toBeCloseTo(0.2)
    expect(may?.['proj-2']).toBeUndefined()
  })

  it('ignores assignment values outside the fiscal year range', () => {
    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2024-03': 0.5, // before fiscal year
        '2025-04': 0.3, // in fiscal year
        '2026-04': 0.8, // after fiscal year
      }),
    ]

    const result = getProjectMonthlyAssignments(assignments, 2025)
    const april = result.find((r) => r.month === '2025-04')
    expect(april?.['proj-1']).toBeCloseTo(0.3)

    // Values outside the fiscal year should not appear
    const march2024 = result.find((r) => r.month === '2024-03')
    expect(march2024).toBeUndefined()
    const april2026 = result.find((r) => r.month === '2026-04')
    expect(april2026).toBeUndefined()
  })

  it('handles multiple projects with overlapping months', () => {
    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2025-06': 0.5,
        '2025-07': 0.3,
      }),
      createAssignment('proj-2', 'mem-1', {
        '2025-06': 0.2,
        '2025-08': 0.4,
      }),
      createAssignment('proj-3', 'mem-2', {
        '2025-06': 0.1,
      }),
    ]

    const result = getProjectMonthlyAssignments(assignments, 2025)
    const june = result.find((r) => r.month === '2025-06')
    expect(june?.['proj-1']).toBeCloseTo(0.5)
    expect(june?.['proj-2']).toBeCloseTo(0.2)
    expect(june?.['proj-3']).toBeCloseTo(0.1)
  })

  it('respects custom fiscalYearStartMonth', () => {
    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2025-01': 0.3,
        '2025-12': 0.5,
      }),
    ]

    const result = getProjectMonthlyAssignments(assignments, 2025, 1)
    expect(result).toHaveLength(12)
    expect(result[0]?.month).toBe('2025-01')
    const jan = result.find((r) => r.month === '2025-01')
    expect(jan?.['proj-1']).toBeCloseTo(0.3)
    const dec = result.find((r) => r.month === '2025-12')
    expect(dec?.['proj-1']).toBeCloseTo(0.5)
  })
})

describe('getMemberAssignmentSummary', () => {
  it('returns empty array when no members', () => {
    const result = getMemberAssignmentSummary([], [], 2025)
    expect(result).toEqual([])
  })

  it('returns only active members with assignments in the fiscal year', () => {
    const members = [
      createMember('mem-1', 'Alice', true),
      createMember('mem-2', 'Bob', false), // inactive
      createMember('mem-3', 'Charlie', true), // active but no assignments
    ]

    const assignments = [
      createAssignment('proj-1', 'mem-1', { '2025-04': 0.5 }),
      createAssignment('proj-1', 'mem-2', { '2025-04': 0.3 }), // inactive member
    ]

    const result = getMemberAssignmentSummary(members, assignments, 2025)

    // Only Alice should be included (active + has assignments)
    expect(result).toHaveLength(1)
    expect(result[0]?.memberId).toBe('mem-1')
    expect(result[0]?.memberName).toBe('Alice')
  })

  it('aggregates monthly totals across multiple assignments', () => {
    const members = [createMember('mem-1', 'Alice')]

    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2025-04': 0.3,
        '2025-05': 0.2,
      }),
      createAssignment('proj-2', 'mem-1', {
        '2025-04': 0.4,
        '2025-06': 0.1,
      }),
    ]

    const result = getMemberAssignmentSummary(members, assignments, 2025)
    expect(result).toHaveLength(1)

    const alice = result[0]
    expect(alice).toBeDefined()
    expect(alice?.monthlyTotals['2025-04']).toBeCloseTo(0.7)
    expect(alice?.monthlyTotals['2025-05']).toBeCloseTo(0.2)
    expect(alice?.monthlyTotals['2025-06']).toBeCloseTo(0.1)
  })

  it('excludes assignment values outside the fiscal year', () => {
    const members = [createMember('mem-1', 'Alice')]

    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2024-03': 0.9, // before fiscal year
        '2025-04': 0.5, // in fiscal year
        '2026-04': 0.8, // after fiscal year
      }),
    ]

    const result = getMemberAssignmentSummary(members, assignments, 2025)
    expect(result).toHaveLength(1)

    const alice = result[0]
    expect(alice).toBeDefined()
    expect(alice?.monthlyTotals['2025-04']).toBeCloseTo(0.5)
    expect(alice?.monthlyTotals['2024-03']).toBeUndefined()
    expect(alice?.monthlyTotals['2026-04']).toBeUndefined()
  })

  it('handles multiple active members correctly', () => {
    const members = [
      createMember('mem-1', 'Alice'),
      createMember('mem-2', 'Bob'),
    ]

    const assignments = [
      createAssignment('proj-1', 'mem-1', { '2025-04': 0.5 }),
      createAssignment('proj-1', 'mem-2', { '2025-04': 0.8, '2025-05': 0.3 }),
    ]

    const result = getMemberAssignmentSummary(members, assignments, 2025)
    expect(result).toHaveLength(2)

    const alice = result.find((r) => r.memberId === 'mem-1')
    const bob = result.find((r) => r.memberId === 'mem-2')
    expect(alice?.monthlyTotals['2025-04']).toBeCloseTo(0.5)
    expect(bob?.monthlyTotals['2025-04']).toBeCloseTo(0.8)
    expect(bob?.monthlyTotals['2025-05']).toBeCloseTo(0.3)
  })

  it('respects custom fiscalYearStartMonth', () => {
    const members = [createMember('mem-1', 'Alice')]

    const assignments = [
      createAssignment('proj-1', 'mem-1', {
        '2025-01': 0.3,
        '2025-04': 0.5, // outside if startMonth=1 (Jan-Dec)
      }),
    ]

    const result = getMemberAssignmentSummary(members, assignments, 2025, 1)
    expect(result).toHaveLength(1)

    const alice = result[0]
    expect(alice).toBeDefined()
    expect(alice?.monthlyTotals['2025-01']).toBeCloseTo(0.3)
    expect(alice?.monthlyTotals['2025-04']).toBeCloseTo(0.5)
  })
})

describe('getMemberUtilizationRates', () => {
  it('メンバーなし → 空配列', () => {
    const result = getMemberUtilizationRates([], [], 2025, 4)
    expect(result).toEqual([])
  })

  it('アサインなし → rate=0', () => {
    const members = [createMember('m1', 'Alice')]
    const result = getMemberUtilizationRates(members, [], 2025, 4)
    expect(result).toHaveLength(1)
    expect(result[0]?.rate).toBe(0)
    expect(result[0]?.activeMonths).toBe(12)
  })

  it('月0.5平均アサイン → rate=0.5', () => {
    const members = [createMember('m1', 'Alice')]
    const monthlyValues: Record<string, number> = {}
    for (let i = 4; i <= 12; i++) {
      monthlyValues[`2025-${String(i).padStart(2, '0')}`] = 0.5
    }
    for (let i = 1; i <= 3; i++) {
      monthlyValues[`2026-${String(i).padStart(2, '0')}`] = 0.5
    }
    const assignments = [createAssignment('proj-1', 'm1', monthlyValues)]
    const result = getMemberUtilizationRates(members, assignments, 2025, 4)
    expect(result[0]?.rate).toBeCloseTo(0.5)
  })

  it('年度途中開始のメンバーの正しいrate計算', () => {
    const members = [
      createFullMember({ id: 'm1', name: 'Alice', startDate: '2025-10-01' }),
    ]
    const monthlyValues: Record<string, number> = {
      '2025-10': 0.5,
      '2025-11': 0.5,
      '2025-12': 0.5,
      '2026-01': 0.5,
      '2026-02': 0.5,
      '2026-03': 0.5,
    }
    const assignments = [createAssignment('proj-1', 'm1', monthlyValues)]
    const result = getMemberUtilizationRates(members, assignments, 2025, 4)
    expect(result[0]?.activeMonths).toBe(6)
    expect(result[0]?.rate).toBeCloseTo(0.5)
  })

  it('startDate=nullのメンバーは除外', () => {
    const members = [
      createFullMember({ id: 'm1', name: 'Alice', startDate: null }),
    ]
    const result = getMemberUtilizationRates(members, [], 2025, 4)
    expect(result).toEqual([])
  })

  it('isActive=falseのメンバーは除外', () => {
    const members = [createMember('m1', 'Alice', false)]
    const result = getMemberUtilizationRates(members, [], 2025, 4)
    expect(result).toEqual([])
  })

  it('複数プロジェクトのアサインが合算される', () => {
    const members = [createMember('m1', 'Alice')]
    const assignments = [
      createAssignment('p1', 'm1', { '2025-04': 0.3 }),
      createAssignment('p2', 'm1', { '2025-04': 0.4 }),
    ]
    const result = getMemberUtilizationRates(members, assignments, 2025, 4)
    expect(result[0]?.rate).toBeCloseTo(0.7 / 12)
  })
})

describe('getSkillDistribution', () => {
  const now = new Date().toISOString()

  const cat1: TechTagCategory = {
    id: 'cat1',
    name: 'プログラミング言語',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  const cat2: TechTagCategory = {
    id: 'cat2',
    name: 'クラウド',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  }

  const tag1: TechTag = {
    id: 'tag1',
    name: 'TypeScript',
    color: '#3b82f6',
    categoryId: 'cat1',
    subCategoryId: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  }
  const tag2: TechTag = {
    id: 'tag2',
    name: 'AWS',
    color: '#f59e0b',
    categoryId: 'cat2',
    subCategoryId: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  }
  const tag3: TechTag = {
    id: 'tag3',
    name: 'Python',
    color: '#3b82f6',
    categoryId: 'cat1',
    subCategoryId: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  }

  it('メンバーなし → 空配列', () => {
    const result = getSkillDistribution([], [tag1], [cat1])
    expect(result).toEqual([])
  })

  it('techTagIdsが空 → カテゴリ0件', () => {
    const members = [
      createFullMember({ id: 'm1', name: 'Alice', techTagIds: [] }),
    ]
    const result = getSkillDistribution(members, [tag1], [cat1])
    expect(result).toEqual([])
  })

  it('同カテゴリのタグを複数メンバーが持つ → ユニークメンバー数カウント', () => {
    const members = [
      createFullMember({
        id: 'm1',
        name: 'Alice',
        techTagIds: ['tag1', 'tag3'],
      }),
      createFullMember({ id: 'm2', name: 'Bob', techTagIds: ['tag1'] }),
    ]
    const result = getSkillDistribution(
      members,
      [tag1, tag2, tag3],
      [cat1, cat2],
    )
    const cat1Result = result.find((r) => r.categoryId === 'cat1')
    expect(cat1Result?.memberCount).toBe(2)
  })

  it('カテゴリのsortOrder順にソートされる', () => {
    const members = [
      createFullMember({
        id: 'm1',
        name: 'Alice',
        techTagIds: ['tag1', 'tag2'],
      }),
    ]
    const result = getSkillDistribution(members, [tag1, tag2], [cat2, cat1])
    expect(result[0]?.categoryName).toBe('プログラミング言語')
    expect(result[1]?.categoryName).toBe('クラウド')
  })

  it('該当メンバーがいないカテゴリは非表示', () => {
    const members = [
      createFullMember({ id: 'm1', name: 'Alice', techTagIds: ['tag1'] }),
    ]
    const result = getSkillDistribution(members, [tag1, tag2], [cat1, cat2])
    expect(result).toHaveLength(1)
    expect(result[0]?.categoryId).toBe('cat1')
  })

  it('CATEGORY_DEFAULT_COLORSから色が適用される', () => {
    const members = [
      createFullMember({ id: 'm1', name: 'Alice', techTagIds: ['tag1'] }),
    ]
    const result = getSkillDistribution(members, [tag1], [cat1])
    expect(result[0]?.color).toBe('#3b82f6')
  })

  it('非アクティブメンバーは除外される', () => {
    const members = [
      createFullMember({
        id: 'm1',
        name: 'Alice',
        techTagIds: ['tag1'],
        isActive: false,
      }),
    ]
    const result = getSkillDistribution(members, [tag1], [cat1])
    expect(result).toEqual([])
  })
})
