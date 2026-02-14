import { z } from 'zod'

/**
 * 単価履歴エントリスキーマ
 */
export const UnitPriceEntrySchema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/), // "YYYY-MM" 形式
  amount: z.number().min(0), // 月額単価（万円）
})
export type UnitPriceEntry = z.infer<typeof UnitPriceEntrySchema>

/**
 * 担当者スキーマ
 */
export const MemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  department: z.string().max(100).optional().default(''), // 後方互換（Phase 3で削除予定）
  sectionId: z.string().uuid().nullable(), // 課ID（null = 未所属）
  role: z.string().max(100),
  isActive: z.boolean(),
  techTagIds: z.array(z.string().uuid()).optional(), // 紐付けた技術タグIDリスト
  startDate: z.string().nullable(), // 開始日 "YYYY-MM-DD"（null = 未設定）
  endDate: z.string().nullable(), // 終了日 "YYYY-MM-DD"（null = 現在も在籍）
  unitPriceHistory: z.array(UnitPriceEntrySchema), // 単価履歴（空配列可）
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Member = z.infer<typeof MemberSchema>

/**
 * 担当者作成用スキーマ（IDと日時は自動生成）
 */
export const CreateMemberSchema = MemberSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateMember = z.infer<typeof CreateMemberSchema>

/**
 * 担当者更新用スキーマ
 */
export const UpdateMemberSchema = MemberSchema.partial().required({ id: true })
export type UpdateMember = z.infer<typeof UpdateMemberSchema>

/**
 * 役割マスタ（ユニークな役割名のリスト）
 */
export function extractRoles(members: Member[]): string[] {
  const roles = new Set<string>()
  for (const member of members) {
    if (member.role) {
      roles.add(member.role)
    }
  }
  return Array.from(roles).sort()
}
