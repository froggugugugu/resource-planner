import { describe, expect, it } from 'vitest'
import { migrateMembers } from '@/infrastructure/storage/json-storage'
import { DatabaseSchema } from '@/shared/types/database'
import { DivisionSchema } from '@/shared/types/division'
import { MemberSchema, UnitPriceEntrySchema } from '@/shared/types/member'
import { SectionSchema } from '@/shared/types/section'

describe('DivisionSchema', () => {
  const validDivision = {
    id: crypto.randomUUID(),
    name: '開発本部',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('正しい部門データをバリデーションできる', () => {
    expect(() => DivisionSchema.parse(validDivision)).not.toThrow()
  })

  it('名前が空の場合にエラーになる', () => {
    expect(() => DivisionSchema.parse({ ...validDivision, name: '' })).toThrow()
  })

  it('名前が100文字を超える場合にエラーになる', () => {
    expect(() =>
      DivisionSchema.parse({ ...validDivision, name: 'a'.repeat(101) }),
    ).toThrow()
  })

  it('名前が100文字ちょうどの場合は成功する', () => {
    expect(() =>
      DivisionSchema.parse({ ...validDivision, name: 'a'.repeat(100) }),
    ).not.toThrow()
  })

  it('sortOrderが負の場合にエラーになる', () => {
    expect(() =>
      DivisionSchema.parse({ ...validDivision, sortOrder: -1 }),
    ).toThrow()
  })

  it('idがUUID形式でない場合にエラーになる', () => {
    expect(() =>
      DivisionSchema.parse({ ...validDivision, id: 'not-a-uuid' }),
    ).toThrow()
  })
})

describe('SectionSchema', () => {
  const validSection = {
    id: crypto.randomUUID(),
    divisionId: crypto.randomUUID(),
    name: '第1開発課',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('正しい課データをバリデーションできる', () => {
    expect(() => SectionSchema.parse(validSection)).not.toThrow()
  })

  it('名前が空の場合にエラーになる', () => {
    expect(() => SectionSchema.parse({ ...validSection, name: '' })).toThrow()
  })

  it('名前が100文字を超える場合にエラーになる', () => {
    expect(() =>
      SectionSchema.parse({ ...validSection, name: 'a'.repeat(101) }),
    ).toThrow()
  })

  it('divisionIdがない場合にエラーになる', () => {
    const { divisionId: _, ...withoutDivisionId } = validSection
    expect(() => SectionSchema.parse(withoutDivisionId)).toThrow()
  })

  it('divisionIdがUUID形式でない場合にエラーになる', () => {
    expect(() =>
      SectionSchema.parse({ ...validSection, divisionId: 'invalid' }),
    ).toThrow()
  })
})

describe('UnitPriceEntrySchema', () => {
  it('正しい単価エントリをバリデーションできる', () => {
    const entry = { effectiveFrom: '2025-04', amount: 100 }
    expect(() => UnitPriceEntrySchema.parse(entry)).not.toThrow()
  })

  it('effectiveFromがYYYY-MM形式でない場合にエラーになる', () => {
    expect(() =>
      UnitPriceEntrySchema.parse({ effectiveFrom: '2025-4', amount: 100 }),
    ).toThrow()
    expect(() =>
      UnitPriceEntrySchema.parse({
        effectiveFrom: '2025-04-01',
        amount: 100,
      }),
    ).toThrow()
    expect(() =>
      UnitPriceEntrySchema.parse({ effectiveFrom: 'invalid', amount: 100 }),
    ).toThrow()
  })

  it('amountが負の場合にエラーになる', () => {
    expect(() =>
      UnitPriceEntrySchema.parse({ effectiveFrom: '2025-04', amount: -1 }),
    ).toThrow()
  })

  it('amountが0の場合は成功する', () => {
    expect(() =>
      UnitPriceEntrySchema.parse({ effectiveFrom: '2025-04', amount: 0 }),
    ).not.toThrow()
  })

  it('amountが小数の場合も成功する', () => {
    const entry = { effectiveFrom: '2025-04', amount: 99.5 }
    expect(() => UnitPriceEntrySchema.parse(entry)).not.toThrow()
  })
})

describe('MemberSchema（新フィールド対応）', () => {
  const validMember = {
    id: crypto.randomUUID(),
    name: '田中太郎',
    sectionId: crypto.randomUUID(),
    role: 'エンジニア',
    isActive: true,
    startDate: '2025-04-01',
    endDate: null,
    unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('新フィールドを含む正しいメンバーデータをバリデーションできる', () => {
    expect(() => MemberSchema.parse(validMember)).not.toThrow()
  })

  it('sectionIdがnullの場合（未所属）も成功する', () => {
    expect(() =>
      MemberSchema.parse({ ...validMember, sectionId: null }),
    ).not.toThrow()
  })

  it('startDateがnullの場合も成功する', () => {
    expect(() =>
      MemberSchema.parse({ ...validMember, startDate: null }),
    ).not.toThrow()
  })

  it('endDateが設定されている場合も成功する', () => {
    expect(() =>
      MemberSchema.parse({ ...validMember, endDate: '2026-03-31' }),
    ).not.toThrow()
  })

  it('unitPriceHistoryが空配列の場合も成功する', () => {
    expect(() =>
      MemberSchema.parse({ ...validMember, unitPriceHistory: [] }),
    ).not.toThrow()
  })

  it('unitPriceHistoryに複数エントリがある場合も成功する', () => {
    const member = {
      ...validMember,
      unitPriceHistory: [
        { effectiveFrom: '2025-04', amount: 100 },
        { effectiveFrom: '2025-10', amount: 120 },
      ],
    }
    expect(() => MemberSchema.parse(member)).not.toThrow()
  })

  it('後方互換: departmentフィールドがあっても成功する', () => {
    expect(() =>
      MemberSchema.parse({ ...validMember, department: '開発部' }),
    ).not.toThrow()
  })

  it('後方互換: departmentがなくデフォルト空文字になる', () => {
    const parsed = MemberSchema.parse(validMember)
    expect(parsed.department).toBe('')
  })

  it('techTagIdsがオプションで受け付けられる', () => {
    const member = {
      ...validMember,
      techTagIds: [crypto.randomUUID(), crypto.randomUUID()],
    }
    expect(() => MemberSchema.parse(member)).not.toThrow()
  })
})

describe('migrateMembers', () => {
  it('既存メンバーデータに新フィールドのデフォルト値を付与する', () => {
    const data = {
      members: [
        {
          id: crypto.randomUUID(),
          name: '山田太郎',
          department: '開発部',
          role: 'エンジニア',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }

    const migrated = migrateMembers(data)
    const member = migrated.members[0]
    expect(member.sectionId).toBeNull()
    expect(member.startDate).toBeNull()
    expect(member.endDate).toBeNull()
    expect(member.unitPriceHistory).toEqual([])
    // department は保持される
    expect(member.department).toBe('開発部')
  })

  it('既に新フィールドがあるメンバーは上書きしない', () => {
    const sectionId = crypto.randomUUID()
    const data = {
      members: [
        {
          id: crypto.randomUUID(),
          name: '田中花子',
          department: '',
          role: 'PM',
          isActive: true,
          sectionId,
          startDate: '2025-04-01',
          endDate: null,
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }

    const migrated = migrateMembers(data)
    const member = migrated.members[0]
    expect(member.sectionId).toBe(sectionId)
    expect(member.startDate).toBe('2025-04-01')
    expect(member.unitPriceHistory).toEqual([
      { effectiveFrom: '2025-04', amount: 100 },
    ])
  })

  it('membersが配列でない場合はデータをそのまま返す', () => {
    const data = { members: 'not-an-array' }
    expect(migrateMembers(data)).toEqual(data)
  })

  it('membersフィールドがない場合はデータをそのまま返す', () => {
    const data = { projects: [] }
    expect(migrateMembers(data)).toEqual(data)
  })
})

describe('DatabaseSchema（divisions/sections対応）', () => {
  const baseDb = {
    version: '1.0.0',
    fiscalYear: 2025,
    projects: [],
    members: [],
    metadata: {
      lastModified: new Date().toISOString(),
      createdBy: 'system',
      version: '1.0.0',
    },
  }

  it('divisions/sectionsがない場合もバリデーションに成功する（後方互換）', () => {
    expect(() => DatabaseSchema.parse(baseDb)).not.toThrow()
  })

  it('空のdivisions/sectionsを受け付ける', () => {
    const db = { ...baseDb, divisions: [], sections: [] }
    expect(() => DatabaseSchema.parse(db)).not.toThrow()
  })

  it('正しいdivisions/sectionsデータを受け付ける', () => {
    const divisionId = crypto.randomUUID()
    const db = {
      ...baseDb,
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
          id: crypto.randomUUID(),
          divisionId,
          name: '第1課',
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    const parsed = DatabaseSchema.parse(db)
    expect(parsed.divisions).toHaveLength(1)
    expect(parsed.sections).toHaveLength(1)
  })
})
