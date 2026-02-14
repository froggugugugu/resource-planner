import { describe, expect, it } from 'vitest'
import {
  createDefaultPhaseSettings,
  DependencyTypeSchema,
  PhaseDefinitionSchema,
  PhaseDependencySchema,
  PhaseSettingsSchema,
  ScheduleEntrySchema,
} from '@/shared/types/schedule'

describe('PhaseDefinitionSchema', () => {
  it('should validate a valid phase definition', () => {
    const result = PhaseDefinitionSchema.safeParse({
      phaseKey: 'phase-1',
      name: '基本設計',
      color: '#4A90D9',
      enabled: true,
      sortOrder: 0,
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const result = PhaseDefinitionSchema.safeParse({
      phaseKey: 'phase-1',
      name: '',
      color: '#4A90D9',
      enabled: true,
      sortOrder: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should reject name exceeding 50 characters', () => {
    const result = PhaseDefinitionSchema.safeParse({
      phaseKey: 'phase-1',
      name: 'a'.repeat(51),
      color: '#4A90D9',
      enabled: true,
      sortOrder: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('PhaseSettingsSchema', () => {
  it('should validate default settings', () => {
    const settings = createDefaultPhaseSettings()
    const result = PhaseSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })

  it('should reject more than 10 phases', () => {
    const phases = Array.from({ length: 11 }, (_, i) => ({
      phaseKey: `phase-${i + 1}`,
      name: `工程${i + 1}`,
      color: '#000000',
      enabled: true,
      sortOrder: i,
    }))
    const result = PhaseSettingsSchema.safeParse({
      phases,
      lastModified: new Date().toISOString(),
    })
    expect(result.success).toBe(false)
  })
})

describe('ScheduleEntrySchema', () => {
  it('should validate a valid entry', () => {
    const result = ScheduleEntrySchema.safeParse({
      id: crypto.randomUUID(),
      projectId: crypto.randomUUID(),
      phaseKey: 'phase-1',
      startDate: '2025-04-01',
      endDate: '2025-06-30',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing projectId', () => {
    const result = ScheduleEntrySchema.safeParse({
      id: crypto.randomUUID(),
      phaseKey: 'phase-1',
      startDate: '2025-04-01',
      endDate: '2025-06-30',
    })
    expect(result.success).toBe(false)
  })
})

describe('PhaseDependencySchema', () => {
  it('should validate a valid dependency', () => {
    const result = PhaseDependencySchema.safeParse({
      id: crypto.randomUUID(),
      projectId: crypto.randomUUID(),
      fromPhaseKey: 'phase-1',
      toPhaseKey: 'phase-2',
      dependencyType: 'FS',
    })
    expect(result.success).toBe(true)
  })

  it('should validate all dependency types', () => {
    for (const type of ['FS', 'SS', 'FF', 'SF']) {
      const result = DependencyTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('should reject invalid dependency type', () => {
    const result = DependencyTypeSchema.safeParse('XX')
    expect(result.success).toBe(false)
  })
})

describe('createDefaultPhaseSettings', () => {
  it('should create 10 phases', () => {
    const settings = createDefaultPhaseSettings()
    expect(settings.phases).toHaveLength(10)
  })

  it('should have first 5 phases enabled', () => {
    const settings = createDefaultPhaseSettings()
    const enabledCount = settings.phases.filter((p) => p.enabled).length
    expect(enabledCount).toBe(5)
  })

  it('should have unique phase keys', () => {
    const settings = createDefaultPhaseSettings()
    const keys = settings.phases.map((p) => p.phaseKey)
    expect(new Set(keys).size).toBe(10)
  })

  it('should have sequential sort orders', () => {
    const settings = createDefaultPhaseSettings()
    const orders = settings.phases.map((p) => p.sortOrder)
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
