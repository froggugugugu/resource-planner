import { describe, expect, it } from 'vitest'
import {
  memberFormSchema,
  projectFormSchema,
  techTagFormSchema,
  unitPriceEntryFormSchema,
  validateJsonImport,
} from '@/infrastructure/validation/schemas'

const validProject = {
  code: 'P001',
  name: 'テスト案件',
  parentId: null,
  level: 0,
  status: 'not_started' as const,
  confidence: null,
}

const validMember = {
  name: '田中太郎',
  sectionId: null,
  role: 'エンジニア',
  isActive: true,
  startDate: null,
  endDate: null,
}

describe('projectFormSchema', () => {
  it('正しいデータでバリデーション成功', () => {
    const result = projectFormSchema.safeParse(validProject)
    expect(result.success).toBe(true)
  })

  it('code必須（空文字でエラー）', () => {
    const result = projectFormSchema.safeParse({ ...validProject, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('コードは必須です')
    }
  })

  it('codeが50文字超でエラー', () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      code: 'A'.repeat(51),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'コードは50文字以内で入力してください',
      )
    }
  })

  it('name必須（空文字でエラー）', () => {
    const result = projectFormSchema.safeParse({ ...validProject, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('名称は必須です')
    }
  })

  it('nameが200文字超でエラー', () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      name: 'あ'.repeat(201),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        '名称は200文字以内で入力してください',
      )
    }
  })

  it('description任意（undefinedでも成功）', () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      description: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('descriptionが2000文字超でエラー', () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      description: 'あ'.repeat(2001),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        '説明は2000文字以内で入力してください',
      )
    }
  })

  it('background/purposeが2000文字超でエラー', () => {
    const bgResult = projectFormSchema.safeParse({
      ...validProject,
      background: 'あ'.repeat(2001),
    })
    expect(bgResult.success).toBe(false)
    if (!bgResult.success) {
      expect(bgResult.error.issues[0]?.message).toBe(
        '背景は2000文字以内で入力してください',
      )
    }

    const purposeResult = projectFormSchema.safeParse({
      ...validProject,
      purpose: 'あ'.repeat(2001),
    })
    expect(purposeResult.success).toBe(false)
    if (!purposeResult.success) {
      expect(purposeResult.error.issues[0]?.message).toBe(
        '目的は2000文字以内で入力してください',
      )
    }
  })

  it('levelが0〜5の整数のみ（6でエラー、-1でエラー）', () => {
    const result6 = projectFormSchema.safeParse({
      ...validProject,
      level: 6,
    })
    expect(result6.success).toBe(false)

    const resultNeg = projectFormSchema.safeParse({
      ...validProject,
      level: -1,
    })
    expect(resultNeg.success).toBe(false)

    for (const level of [0, 1, 2, 3, 4, 5]) {
      const result = projectFormSchema.safeParse({ ...validProject, level })
      expect(result.success).toBe(true)
    }
  })

  it('statusデフォルト値がnot_started', () => {
    const { status: _, ...withoutStatus } = validProject
    const result = projectFormSchema.safeParse(withoutStatus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('not_started')
    }
  })

  it('confidenceのデフォルト値がnull', () => {
    const { confidence: _, ...withoutConfidence } = validProject
    const result = projectFormSchema.safeParse(withoutConfidence)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.confidence).toBeNull()
    }
  })
})

describe('memberFormSchema', () => {
  it('正しいデータでバリデーション成功', () => {
    const result = memberFormSchema.safeParse(validMember)
    expect(result.success).toBe(true)
  })

  it('name必須（空文字でエラー）', () => {
    const result = memberFormSchema.safeParse({ ...validMember, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameIssue?.message).toBe('氏名は必須です')
    }
  })

  it('nameが100文字超でエラー', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      name: 'あ'.repeat(101),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameIssue?.message).toBe('氏名は100文字以内で入力してください')
    }
  })

  it('sectionIdがnullで成功（未所属）', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      sectionId: null,
    })
    expect(result.success).toBe(true)
  })

  it('startDate/endDateがnullで成功', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      startDate: null,
      endDate: null,
    })
    expect(result.success).toBe(true)
  })

  it('endDateがstartDate以降であればrefine通過', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    })
    expect(result.success).toBe(true)

    const sameDay = memberFormSchema.safeParse({
      ...validMember,
      startDate: '2025-04-01',
      endDate: '2025-04-01',
    })
    expect(sameDay.success).toBe(true)
  })

  it('endDateがstartDateより前の場合refineエラー', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      startDate: '2025-06-01',
      endDate: '2025-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endDateIssue = result.error.issues.find((i) =>
        i.path.includes('endDate'),
      )
      expect(endDateIssue?.message).toBe(
        '終了日は開始日以降の日付を指定してください',
      )
    }
  })

  it('startDateのみ設定の場合refine通過', () => {
    const result = memberFormSchema.safeParse({
      ...validMember,
      startDate: '2025-04-01',
      endDate: null,
    })
    expect(result.success).toBe(true)
  })

  it('unitPriceHistoryのデフォルトが空配列', () => {
    const result = memberFormSchema.safeParse(validMember)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitPriceHistory).toEqual([])
    }
  })
})

describe('unitPriceEntryFormSchema', () => {
  it('正しいデータ（YYYY-MM、正の数）で成功', () => {
    const result = unitPriceEntryFormSchema.safeParse({
      effectiveFrom: '2025-04',
      amount: 80,
    })
    expect(result.success).toBe(true)
  })

  it('effectiveFromがYYYY-MM形式でない場合エラー', () => {
    const result = unitPriceEntryFormSchema.safeParse({
      effectiveFrom: '2025/04',
      amount: 80,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        '有効な年月（YYYY-MM）を入力してください',
      )
    }

    const result2 = unitPriceEntryFormSchema.safeParse({
      effectiveFrom: '202504',
      amount: 80,
    })
    expect(result2.success).toBe(false)
  })

  it('amountが負の場合エラー', () => {
    const result = unitPriceEntryFormSchema.safeParse({
      effectiveFrom: '2025-04',
      amount: -1,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        '単価は0以上で入力してください',
      )
    }
  })
})

describe('techTagFormSchema', () => {
  const validTechTag = {
    name: 'React',
    color: '#3b82f6',
    categoryId: crypto.randomUUID(),
    subCategoryId: null,
    note: null,
  }

  it('正しいデータで成功', () => {
    const result = techTagFormSchema.safeParse(validTechTag)
    expect(result.success).toBe(true)
  })

  it('name必須（空文字でエラー）', () => {
    const result = techTagFormSchema.safeParse({
      ...validTechTag,
      name: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('タグ名は必須です')
    }
  })

  it('nameが50文字超でエラー', () => {
    const result = techTagFormSchema.safeParse({
      ...validTechTag,
      name: 'A'.repeat(51),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'タグ名は50文字以内で入力してください',
      )
    }
  })

  it('colorが#RRGGBB形式でない場合エラー', () => {
    const invalid = ['red', '#fff', '#GGGGGG', '3b82f6', '#3b82f6ff']
    for (const color of invalid) {
      const result = techTagFormSchema.safeParse({ ...validTechTag, color })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          '有効なカラーコードを入力してください',
        )
      }
    }
  })

  it('categoryId必須', () => {
    const { categoryId: _, ...withoutCategory } = validTechTag
    const result = techTagFormSchema.safeParse(withoutCategory)
    expect(result.success).toBe(false)
  })
})

describe('validateJsonImport', () => {
  it('有効なJSONで{isValid: true}を返す', () => {
    const result = validateJsonImport('{"key": "value"}')
    expect(result).toEqual({ isValid: true })

    const arrayResult = validateJsonImport('[1, 2, 3]')
    expect(arrayResult).toEqual({ isValid: true })
  })

  it('無効なJSONで{isValid: false, error: ...}を返す', () => {
    const result = validateJsonImport('invalid json')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('無効なJSONフォーマットです')

    const result2 = validateJsonImport('{key: value}')
    expect(result2.isValid).toBe(false)
    expect(result2.error).toBe('無効なJSONフォーマットです')
  })
})
