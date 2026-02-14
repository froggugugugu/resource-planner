import { z } from 'zod'

/**
 * 案件フォームのバリデーションスキーマ
 */
export const projectFormSchema = z.object({
  code: z
    .string()
    .min(1, 'コードは必須です')
    .max(50, 'コードは50文字以内で入力してください'),
  name: z
    .string()
    .min(1, '名称は必須です')
    .max(200, '名称は200文字以内で入力してください'),
  description: z
    .string()
    .max(2000, '説明は2000文字以内で入力してください')
    .optional(),
  background: z
    .string()
    .max(2000, '背景は2000文字以内で入力してください')
    .optional(),
  purpose: z
    .string()
    .max(2000, '目的は2000文字以内で入力してください')
    .optional(),
  parentId: z.string().uuid().nullable(),
  level: z.number().int().min(0).max(5),
  status: z.enum(['not_started', 'active', 'completed']).default('not_started'),
  confidence: z.enum(['S', 'A', 'B', 'C']).nullable().default(null),
})
export type ProjectFormValues = z.infer<typeof projectFormSchema>

/**
 * 単価履歴エントリフォームスキーマ
 */
export const unitPriceEntryFormSchema = z.object({
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}$/, '有効な年月（YYYY-MM）を入力してください'),
  amount: z.number().min(0, '単価は0以上で入力してください'),
})

/**
 * 担当者フォームのバリデーションスキーマ
 */
export const memberFormSchema = z
  .object({
    name: z
      .string()
      .min(1, '氏名は必須です')
      .max(100, '氏名は100文字以内で入力してください'),
    sectionId: z.string().uuid().nullable().default(null),
    role: z.string().max(100, '役割は100文字以内で入力してください'),
    isActive: z.boolean(),
    techTagIds: z.array(z.string().uuid()).optional(),
    startDate: z.string().nullable().default(null),
    endDate: z.string().nullable().default(null),
    unitPriceHistory: z.array(unitPriceEntryFormSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate
      }
      return true
    },
    {
      message: '終了日は開始日以降の日付を指定してください',
      path: ['endDate'],
    },
  )
export type MemberFormValues = z.infer<typeof memberFormSchema>

/**
 * 技術タグフォームのバリデーションスキーマ
 */
export const techTagFormSchema = z.object({
  name: z
    .string()
    .min(1, 'タグ名は必須です')
    .max(50, 'タグ名は50文字以内で入力してください'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '有効なカラーコードを入力してください'),
  categoryId: z.string().uuid('カテゴリは必須です'),
  subCategoryId: z.string().uuid().nullable().default(null),
  note: z
    .string()
    .max(200, '備考は200文字以内で入力してください')
    .nullable()
    .default(null),
})
export type TechTagFormValues = z.infer<typeof techTagFormSchema>

export const techTagCategoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'カテゴリ名は必須です')
    .max(100, 'カテゴリ名は100文字以内で入力してください'),
})
export type TechTagCategoryFormValues = z.infer<
  typeof techTagCategoryFormSchema
>

export const techTagSubCategoryFormSchema = z.object({
  categoryId: z.string().uuid('カテゴリは必須です'),
  name: z
    .string()
    .min(1, 'サブカテゴリ名は必須です')
    .max(100, 'サブカテゴリ名は100文字以内で入力してください'),
})
export type TechTagSubCategoryFormValues = z.infer<
  typeof techTagSubCategoryFormSchema
>

/**
 * JSONインポートのバリデーション
 */
export function validateJsonImport(jsonString: string): {
  isValid: boolean
  error?: string
} {
  try {
    JSON.parse(jsonString)
    return { isValid: true }
  } catch {
    return { isValid: false, error: '無効なJSONフォーマットです' }
  }
}
