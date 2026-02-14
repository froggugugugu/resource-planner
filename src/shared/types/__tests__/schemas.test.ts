import { describe, expect, it } from 'vitest'
import { MemberSchema, ProjectSchema } from '@/shared/types'

describe('ProjectSchema', () => {
  it('should validate a correct project', () => {
    const project = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'システム開発',
      parentId: null,
      level: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => ProjectSchema.parse(project)).not.toThrow()
  })

  it('should reject empty name', () => {
    const project = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: '',
      parentId: null,
      level: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => ProjectSchema.parse(project)).toThrow()
  })

  it('should accept valid parentId', () => {
    const parentId = crypto.randomUUID()
    const project = {
      id: crypto.randomUUID(),
      code: 'P001-01',
      name: 'サブ案件',
      parentId,
      level: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => ProjectSchema.parse(project)).not.toThrow()
  })

  it('should assign default values for status and confidence when missing', () => {
    const project = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'テスト案件',
      parentId: null,
      level: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const parsed = ProjectSchema.parse(project)
    expect(parsed.status).toBe('not_started')
    expect(parsed.confidence).toBeNull()
  })

  it('should accept all valid status values', () => {
    const base = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'テスト案件',
      parentId: null,
      level: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    for (const status of ['not_started', 'active', 'completed'] as const) {
      const parsed = ProjectSchema.parse({ ...base, status })
      expect(parsed.status).toBe(status)
    }
  })

  it('should reject invalid status value', () => {
    const project = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'テスト案件',
      parentId: null,
      level: 0,
      status: 'invalid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => ProjectSchema.parse(project)).toThrow()
  })

  it('should accept all valid confidence values including null', () => {
    const base = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'テスト案件',
      parentId: null,
      level: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    for (const confidence of ['S', 'A', 'B', 'C', null] as const) {
      const parsed = ProjectSchema.parse({ ...base, confidence })
      expect(parsed.confidence).toBe(confidence)
    }
  })

  it('should reject invalid confidence value', () => {
    const project = {
      id: crypto.randomUUID(),
      code: 'P001',
      name: 'テスト案件',
      parentId: null,
      level: 0,
      confidence: 'D',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => ProjectSchema.parse(project)).toThrow()
  })
})

describe('MemberSchema', () => {
  it('should validate a correct member', () => {
    const member = {
      id: crypto.randomUUID(),
      name: '山田太郎',
      department: '開発部',
      sectionId: null,
      role: 'エンジニア',
      isActive: true,
      startDate: null,
      endDate: null,
      unitPriceHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => MemberSchema.parse(member)).not.toThrow()
  })

  it('should reject empty name', () => {
    const member = {
      id: crypto.randomUUID(),
      name: '',
      department: '開発部',
      sectionId: null,
      role: 'エンジニア',
      isActive: true,
      startDate: null,
      endDate: null,
      unitPriceHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(() => MemberSchema.parse(member)).toThrow()
  })
})
