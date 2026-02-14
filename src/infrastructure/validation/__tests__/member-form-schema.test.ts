import { describe, expect, it } from 'vitest'
import { memberFormSchema } from '../schemas'

describe('memberFormSchema', () => {
  describe('startDate と endDate のバリデーション', () => {
    it('終了日が開始日以降の場合は成功する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        unitPriceHistory: [],
      })

      expect(result.success).toBe(true)
    })

    it('終了日と開始日が同じ日付の場合は成功する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: '2025-04-01',
        endDate: '2025-04-01',
        unitPriceHistory: [],
      })

      expect(result.success).toBe(true)
    })

    it('終了日が開始日より前の場合は失敗する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: '2025-04-30',
        endDate: '2025-04-01',
        unitPriceHistory: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          '終了日は開始日以降の日付を指定してください',
        )
        expect(result.error.issues[0]?.path).toEqual(['endDate'])
      }
    })

    it('開始日のみ設定されている場合は成功する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: '2025-04-01',
        endDate: null,
        unitPriceHistory: [],
      })

      expect(result.success).toBe(true)
    })

    it('終了日のみ設定されている場合は成功する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: null,
        endDate: '2025-04-30',
        unitPriceHistory: [],
      })

      expect(result.success).toBe(true)
    })

    it('開始日・終了日が両方nullの場合は成功する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: null,
        endDate: null,
        unitPriceHistory: [],
      })

      expect(result.success).toBe(true)
    })
  })

  describe('必須フィールドのバリデーション', () => {
    it('氏名が空文字の場合は失敗する', () => {
      const result = memberFormSchema.safeParse({
        name: '',
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: null,
        endDate: null,
        unitPriceHistory: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['name'])
      }
    })

    it('氏名が100文字を超える場合は失敗する', () => {
      const result = memberFormSchema.safeParse({
        name: 'あ'.repeat(101),
        sectionId: null,
        role: 'エンジニア',
        isActive: true,
        startDate: null,
        endDate: null,
        unitPriceHistory: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['name'])
      }
    })

    it('役割が100文字を超える場合は失敗する', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        sectionId: null,
        role: 'あ'.repeat(101),
        isActive: true,
        startDate: null,
        endDate: null,
        unitPriceHistory: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['role'])
      }
    })
  })

  describe('デフォルト値', () => {
    it('sectionIdのデフォルトはnull', () => {
      const result = memberFormSchema.safeParse({
        name: '田中太郎',
        role: 'エンジニア',
        isActive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sectionId).toBe(null)
        expect(result.data.startDate).toBe(null)
        expect(result.data.endDate).toBe(null)
        expect(result.data.unitPriceHistory).toEqual([])
      }
    })
  })
})
