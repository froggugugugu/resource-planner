import { describe, expect, it } from 'vitest'
import {
  calendarMonthToFiscalMonth,
  DatabaseSchema,
  fiscalMonthToCalendarMonth,
  getFiscalMonthLabel,
} from '@/shared/types/database'

describe('fiscalMonthToCalendarMonth', () => {
  it('should convert fiscal month 1 to April (4)', () => {
    expect(fiscalMonthToCalendarMonth(1)).toBe(4)
  })

  it('should convert fiscal month 9 to December (12)', () => {
    expect(fiscalMonthToCalendarMonth(9)).toBe(12)
  })

  it('should convert fiscal month 10 to January (1)', () => {
    expect(fiscalMonthToCalendarMonth(10)).toBe(1)
  })

  it('should convert fiscal month 12 to March (3)', () => {
    expect(fiscalMonthToCalendarMonth(12)).toBe(3)
  })
})

describe('calendarMonthToFiscalMonth', () => {
  it('should convert April (4) to fiscal month 1', () => {
    expect(calendarMonthToFiscalMonth(4)).toBe(1)
  })

  it('should convert March (3) to fiscal month 12', () => {
    expect(calendarMonthToFiscalMonth(3)).toBe(12)
  })

  it('should convert January (1) to fiscal month 10', () => {
    expect(calendarMonthToFiscalMonth(1)).toBe(10)
  })
})

describe('getFiscalMonthLabel', () => {
  it('should return 4月 for fiscal month 1', () => {
    expect(getFiscalMonthLabel(1)).toBe('4月')
  })

  it('should return 3月 for fiscal month 12', () => {
    expect(getFiscalMonthLabel(12)).toBe('3月')
  })
})

describe('fiscalMonthToCalendarMonth with custom startMonth', () => {
  it('startMonth=1 (1月始まり): fiscal month 1 → January (1)', () => {
    expect(fiscalMonthToCalendarMonth(1, 1)).toBe(1)
  })

  it('startMonth=1: fiscal month 12 → December (12)', () => {
    expect(fiscalMonthToCalendarMonth(12, 1)).toBe(12)
  })

  it('startMonth=10 (10月始まり): fiscal month 1 → October (10)', () => {
    expect(fiscalMonthToCalendarMonth(1, 10)).toBe(10)
  })

  it('startMonth=10: fiscal month 3 → December (12)', () => {
    expect(fiscalMonthToCalendarMonth(3, 10)).toBe(12)
  })

  it('startMonth=10: fiscal month 4 → January (1)', () => {
    expect(fiscalMonthToCalendarMonth(4, 10)).toBe(1)
  })

  it('startMonth=10: fiscal month 12 → September (9)', () => {
    expect(fiscalMonthToCalendarMonth(12, 10)).toBe(9)
  })
})

describe('calendarMonthToFiscalMonth with custom startMonth', () => {
  it('startMonth=1 (1月始まり): January (1) → fiscal month 1', () => {
    expect(calendarMonthToFiscalMonth(1, 1)).toBe(1)
  })

  it('startMonth=1: December (12) → fiscal month 12', () => {
    expect(calendarMonthToFiscalMonth(12, 1)).toBe(12)
  })

  it('startMonth=10 (10月始まり): October (10) → fiscal month 1', () => {
    expect(calendarMonthToFiscalMonth(10, 10)).toBe(1)
  })

  it('startMonth=10: September (9) → fiscal month 12', () => {
    expect(calendarMonthToFiscalMonth(9, 10)).toBe(12)
  })

  it('startMonth=10: January (1) → fiscal month 4', () => {
    expect(calendarMonthToFiscalMonth(1, 10)).toBe(4)
  })
})

describe('getFiscalMonthLabel with custom startMonth', () => {
  it('startMonth=1: fiscal month 1 → 1月', () => {
    expect(getFiscalMonthLabel(1, 1)).toBe('1月')
  })

  it('startMonth=10: fiscal month 1 → 10月', () => {
    expect(getFiscalMonthLabel(1, 10)).toBe('10月')
  })
})

describe('Project data migration (status/confidence defaults)', () => {
  const baseDatabase = {
    version: '1.0.0',
    fiscalYear: 2025,
    members: [],
    metadata: {
      lastModified: new Date().toISOString(),
      createdBy: 'system',
      version: '1.0.0',
    },
  }

  const baseProject = {
    id: crypto.randomUUID(),
    code: 'P001',
    name: 'テスト案件',
    parentId: null,
    level: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('should assign default status and confidence to projects without these fields', () => {
    const data = {
      ...baseDatabase,
      projects: [baseProject],
    }

    const parsed = DatabaseSchema.parse(data)
    expect(parsed.projects[0]?.status).toBe('not_started')
    expect(parsed.projects[0]?.confidence).toBeNull()
  })

  it('should preserve existing status and confidence values', () => {
    const data = {
      ...baseDatabase,
      projects: [{ ...baseProject, status: 'active', confidence: 'A' }],
    }

    const parsed = DatabaseSchema.parse(data)
    expect(parsed.projects[0]?.status).toBe('active')
    expect(parsed.projects[0]?.confidence).toBe('A')
  })

  it('should handle mixed data (some projects with fields, some without)', () => {
    const project2 = {
      ...baseProject,
      id: crypto.randomUUID(),
      code: 'P002',
      name: '既存案件',
      status: 'completed' as const,
      confidence: 'S' as const,
    }

    const data = {
      ...baseDatabase,
      projects: [baseProject, project2],
    }

    const parsed = DatabaseSchema.parse(data)
    // Project without fields gets defaults
    expect(parsed.projects[0]?.status).toBe('not_started')
    expect(parsed.projects[0]?.confidence).toBeNull()
    // Project with fields preserves values
    expect(parsed.projects[1]?.status).toBe('completed')
    expect(parsed.projects[1]?.confidence).toBe('S')
  })
})
