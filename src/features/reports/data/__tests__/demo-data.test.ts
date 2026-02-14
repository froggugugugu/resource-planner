import { describe, expect, it } from 'vitest'
import { generateDemoData } from '@/features/reports/data/demo-data'
import { DatabaseSchema } from '@/shared/types/database'

describe('generateDemoData', () => {
  const result = generateDemoData(2025)
  const { database, wbsSettingsMap, scheduleSettingsMap } = result

  it('DatabaseSchema の Zod バリデーションを通過する', () => {
    const parsed = DatabaseSchema.safeParse(database)
    if (!parsed.success) {
      console.error(parsed.error.issues.slice(0, 5))
    }
    expect(parsed.success).toBe(true)
  })

  it('メンバー数が28名', () => {
    expect(database.members).toHaveLength(28)
  })

  it('ルートプロジェクト数が10件', () => {
    const roots = database.projects.filter((p) => p.level === 0)
    expect(roots).toHaveLength(10)
  })

  it('子タスクが存在する（level=1）', () => {
    const tasks = database.projects.filter((p) => p.level === 1)
    expect(tasks.length).toBeGreaterThanOrEqual(20)
  })

  it('サブタスクが存在する（level=2、各level-1に4〜6件）', () => {
    const level1Tasks = database.projects.filter((p) => p.level === 1)
    const level2Tasks = database.projects.filter((p) => p.level === 2)
    expect(level2Tasks.length).toBeGreaterThanOrEqual(level1Tasks.length * 4)

    for (const l1 of level1Tasks) {
      const children = level2Tasks.filter((p) => p.parentId === l1.id)
      expect(children.length).toBeGreaterThanOrEqual(4)
      expect(children.length).toBeLessThanOrEqual(6)
    }
  })

  it('技術タグカテゴリ数が17', () => {
    expect(database.techTagCategories).toHaveLength(17)
  })

  it('全メンバーの月次アサイン合計が1.0以下', () => {
    const assignments = database.assignments ?? []
    const monthTotals = new Map<string, number>()

    for (const a of assignments) {
      for (const [monthKey, value] of Object.entries(a.monthlyValues)) {
        const key = `${a.memberId}:${monthKey}`
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + value)
      }
    }

    for (const [, total] of monthTotals) {
      expect(total).toBeLessThanOrEqual(1.0 + 0.001) // 浮動小数点誤差許容
    }
  })

  it('全 member.techTagIds が実在する techTag を参照', () => {
    const tagIds = new Set((database.techTags ?? []).map((t) => t.id))
    for (const member of database.members) {
      for (const tagId of member.techTagIds ?? []) {
        expect(tagIds.has(tagId)).toBe(true)
      }
    }
  })

  it('全 assignment の projectId/taskId/memberId が実在', () => {
    const projectIds = new Set(database.projects.map((p) => p.id))
    const memberIds = new Set(database.members.map((m) => m.id))

    for (const a of database.assignments ?? []) {
      expect(projectIds.has(a.projectId)).toBe(true)
      expect(projectIds.has(a.taskId)).toBe(true)
      expect(memberIds.has(a.memberId)).toBe(true)
    }
  })

  it('スケジュールの日付形式が YYYY-MM-DD', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    for (const entry of database.scheduleEntries ?? []) {
      expect(entry.startDate).toMatch(dateRegex)
      expect(entry.endDate).toMatch(dateRegex)
    }
  })

  it('WBS設定が全ルートプロジェクトに存在', () => {
    const roots = database.projects.filter((p) => p.level === 0)
    for (const root of roots) {
      expect(wbsSettingsMap[root.id]).toBeDefined()
    }
  })

  it('スケジュール設定が全ルートプロジェクトに存在', () => {
    const roots = database.projects.filter((p) => p.level === 0)
    for (const root of roots) {
      expect(scheduleSettingsMap[root.id]).toBeDefined()
    }
  })

  it('工数エントリが存在する', () => {
    expect((database.efforts ?? []).length).toBeGreaterThan(0)
  })

  it('組織が2部門・6課', () => {
    expect(database.divisions).toHaveLength(2)
    expect(database.sections).toHaveLength(6)
  })

  it('アサインエントリが存在する', () => {
    expect((database.assignments ?? []).length).toBeGreaterThan(0)
  })

  it('工程依存関係が存在する', () => {
    expect((database.dependencies ?? []).length).toBeGreaterThan(0)
  })

  it('fiscalYear パラメータが反映される', () => {
    expect(database.fiscalYear).toBe(2025)
    const result2024 = generateDemoData(2024)
    expect(result2024.database.fiscalYear).toBe(2024)
  })
})
