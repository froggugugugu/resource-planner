import { z } from 'zod'
import { AssignmentEntrySchema } from './assignment'
import { DivisionSchema } from './division'
import { EffortEntrySchema } from './effort'
import { MemberSchema } from './member'
import { ProjectSchema } from './project'
import { PhaseDependencySchema, ScheduleEntrySchema } from './schedule'
import { SectionSchema } from './section'
import { TechTagSchema } from './tech-tag'
import {
  TechTagCategorySchema,
  TechTagSubCategorySchema,
} from './tech-tag-category'
import { WbsSettingsSchema } from './wbs-settings'

/**
 * メタデータスキーマ
 */
export const MetadataSchema = z.object({
  lastModified: z.string().datetime(),
  createdBy: z.string(),
  version: z.string(),
})
export type Metadata = z.infer<typeof MetadataSchema>

/**
 * データベーススキーマ（JSON永続化用）
 */
export const DatabaseSchema = z.object({
  version: z.string(),
  fiscalYear: z.number().int().min(2000).max(2100),
  projects: z.array(ProjectSchema),
  members: z.array(MemberSchema),
  efforts: z.array(EffortEntrySchema).optional(),
  wbsSettings: WbsSettingsSchema.optional(),
  scheduleEntries: z.array(ScheduleEntrySchema).optional(),
  dependencies: z.array(PhaseDependencySchema).optional(),
  assignments: z.array(AssignmentEntrySchema).optional(),
  techTags: z.array(TechTagSchema).optional(),
  techTagCategories: z.array(TechTagCategorySchema).optional(),
  techTagSubCategories: z.array(TechTagSubCategorySchema).optional(),
  divisions: z.array(DivisionSchema).optional(),
  sections: z.array(SectionSchema).optional(),
  metadata: MetadataSchema,
})
export type Database = z.infer<typeof DatabaseSchema>

/**
 * 年度月（1-12）を実際の月（4月-翌3月）に変換
 * @param fiscalMonth 年度月（1〜12）
 * @param startMonth 年度開始月（デフォルト: 4 = 4月始まり）
 */
export function fiscalMonthToCalendarMonth(
  fiscalMonth: number,
  startMonth = 4,
): number {
  return ((fiscalMonth + startMonth - 2) % 12) + 1
}

/**
 * 実際の月を年度月に変換
 * @param calendarMonth 実際の月（1〜12）
 * @param startMonth 年度開始月（デフォルト: 4 = 4月始まり）
 */
export function calendarMonthToFiscalMonth(
  calendarMonth: number,
  startMonth = 4,
): number {
  return calendarMonth >= startMonth
    ? calendarMonth - startMonth + 1
    : calendarMonth + 12 - startMonth + 1
}

/**
 * 年度月のラベルを取得（4月, 5月, ...）
 * @param fiscalMonth 年度月（1〜12）
 * @param startMonth 年度開始月（デフォルト: 4 = 4月始まり）
 */
export function getFiscalMonthLabel(
  fiscalMonth: number,
  startMonth = 4,
): string {
  const calendarMonth = fiscalMonthToCalendarMonth(fiscalMonth, startMonth)
  return `${calendarMonth}月`
}
