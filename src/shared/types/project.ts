import { z } from 'zod'

/**
 * 案件レベル（数値: 0=案件, 1-5=階層レベル）
 * 最大5階層まで対応
 */
export const MAX_PROJECT_LEVEL = 5
export const ProjectLevelSchema = z.number().int().min(0).max(MAX_PROJECT_LEVEL)
export type ProjectLevel = number

/**
 * 案件レベルの日本語ラベル
 */
export const PROJECT_LEVEL_LABELS: Record<number, string> = {
  0: 'プロジェクト',
  1: 'レベル1',
  2: 'レベル2',
  3: 'レベル3',
  4: 'レベル4',
  5: 'レベル5',
}

/**
 * 旧レベル文字列から数値への変換（データマイグレーション用）
 */
export function migrateProjectLevel(level: string | number): number {
  if (typeof level === 'number') return level
  const map: Record<string, number> = {
    project: 0,
    major: 1,
    middle: 2,
    minor: 3,
  }
  return map[level] ?? 0
}

/**
 * 案件ステータス選択肢
 */
export const STATUS_OPTIONS = [
  { value: 'not_started', label: '未着手' },
  { value: 'active', label: '進行中' },
  { value: 'completed', label: '完了' },
] as const

/**
 * 案件確度選択肢（判断基準の説明付き）
 */
export const CONFIDENCE_OPTIONS = [
  { value: 'S', label: '確定（S）', description: '受注確定。契約締結済み' },
  {
    value: 'A',
    label: '高（A）',
    description: '予算確保済み、決裁者合意あり、時期確定、最終調整中',
  },
  {
    value: 'B',
    label: '中（B）',
    description: '課題は明確だが、予算調整中、または競合と比較中',
  },
  {
    value: 'C',
    label: '低（C）',
    description: '情報収集段階。課題がふわっとしており、時期も未定',
  },
] as const

/**
 * 案件スキーマ
 */
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  background: z.string().max(2000).optional(),
  purpose: z.string().max(2000).optional(),
  parentId: z.string().uuid().nullable(),
  level: ProjectLevelSchema,
  status: z.enum(['not_started', 'active', 'completed']).default('not_started'),
  confidence: z.enum(['S', 'A', 'B', 'C']).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Project = z.infer<typeof ProjectSchema>

/**
 * 案件作成用スキーマ（IDと日時は自動生成）
 */
export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateProject = z.infer<typeof CreateProjectSchema>

/**
 * 案件更新用スキーマ
 */
export const UpdateProjectSchema = ProjectSchema.partial().required({
  id: true,
})
export type UpdateProject = z.infer<typeof UpdateProjectSchema>

/**
 * 案件ツリーノード（UI表示用）
 */
export interface ProjectTreeNode extends Project {
  children: ProjectTreeNode[]
  depth: number
}
