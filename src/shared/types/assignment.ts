import { z } from 'zod'

/**
 * アサインエントリスキーマ（プロジェクト×タスク×メンバーごとに1レコード）
 * monthlyValues: "YYYY-MM" キーで月次アサイン値を保持
 */
export const AssignmentEntrySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  memberId: z.string().uuid(),
  monthlyValues: z.record(z.string(), z.number().min(0).max(1)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type AssignmentEntry = z.infer<typeof AssignmentEntrySchema>

/**
 * アサインエントリ作成用スキーマ（IDと日時は自動生成）
 */
export const CreateAssignmentEntrySchema = AssignmentEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateAssignmentEntry = z.infer<typeof CreateAssignmentEntrySchema>
