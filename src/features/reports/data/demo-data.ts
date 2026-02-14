/**
 * デモデータ生成メイン関数
 *
 * 全エンティティを整合性を保って一括生成する。
 */
import {
  CATEGORY_DEFAULT_COLORS,
  MASTER_DATA,
} from '@/shared/data/tech-tag-master'
import type {
  AssignmentEntry,
  Database,
  Division,
  EffortEntry,
  Member,
  PhaseDependency,
  PhaseSettings,
  Project,
  ScheduleEntry,
  Section,
  TechTag,
  TechTagCategory,
  TechTagSubCategory,
} from '@/shared/types'
import { createDefaultPhaseSettings } from '@/shared/types/schedule'
import {
  DEFAULT_EFFORT_COLUMN_COLORS,
  type WbsSettings,
} from '@/shared/types/wbs-settings'
import { DEMO_DIVISIONS, DEMO_MEMBERS, DEMO_SECTIONS } from './demo-members'
import { DEMO_PROJECTS } from './demo-projects'

export interface DemoDataResult {
  database: Database
  wbsSettingsMap: Record<string, WbsSettings>
  scheduleSettingsMap: Record<string, PhaseSettings>
}

/**
 * デモデータを生成
 * @param fiscalYear 対象年度（デフォルト: 2025）
 */
export function generateDemoData(fiscalYear = 2025): DemoDataResult {
  const now = new Date().toISOString()

  // ── 1. 技術タグ（MASTER_DATA からシード） ──
  const techTagCategories: TechTagCategory[] = []
  const techTagSubCategories: TechTagSubCategory[] = []
  const techTags: TechTag[] = []
  const tagLookup = new Map<string, string>() // tagName → tagId

  for (const [ci, masterCat] of MASTER_DATA.entries()) {
    const catId = crypto.randomUUID()
    techTagCategories.push({
      id: catId,
      name: masterCat.name,
      sortOrder: ci,
      createdAt: now,
      updatedAt: now,
    })

    const defaultColor = CATEGORY_DEFAULT_COLORS[masterCat.name] ?? '#6b7280'

    for (const [si, masterSub] of masterCat.subCategories.entries()) {
      const subId = crypto.randomUUID()
      techTagSubCategories.push({
        id: subId,
        categoryId: catId,
        name: masterSub.name,
        sortOrder: si,
        createdAt: now,
        updatedAt: now,
      })

      for (const masterTag of masterSub.tags) {
        const tagId = crypto.randomUUID()
        techTags.push({
          id: tagId,
          name: masterTag.name,
          color: defaultColor,
          categoryId: catId,
          subCategoryId: subId,
          note: masterTag.note ?? null,
          createdAt: now,
          updatedAt: now,
        })
        tagLookup.set(masterTag.name, tagId)
      }
    }
  }

  // ── 2. 組織 ──
  const divisionLookup = new Map<string, string>()
  const divisions: Division[] = DEMO_DIVISIONS.map((d, i) => {
    const id = crypto.randomUUID()
    divisionLookup.set(d.key, id)
    return {
      id,
      name: d.name,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }
  })

  const sectionLookup = new Map<string, string>()
  const sections: Section[] = DEMO_SECTIONS.map((s, i) => {
    const id = crypto.randomUUID()
    sectionLookup.set(s.key, id)
    const divisionId = divisionLookup.get(s.divisionKey)
    if (!divisionId) throw new Error(`Division not found: ${s.divisionKey}`)
    return {
      id,
      divisionId,
      name: s.name,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }
  })

  // ── 3. メンバー ──
  const members: Member[] = DEMO_MEMBERS.map((m) => {
    const sectionId = sectionLookup.get(m.sectionKey)
    if (!sectionId) throw new Error(`Section not found: ${m.sectionKey}`)

    const techTagIds = m.tagNames
      .map((name) => tagLookup.get(name))
      .filter((id): id is string => id !== undefined)

    return {
      id: crypto.randomUUID(),
      name: m.name,
      department: '',
      sectionId,
      role: m.role,
      isActive: true,
      techTagIds,
      startDate: `${fiscalYear}-04-01`,
      endDate: null,
      unitPriceHistory: [
        { effectiveFrom: `${fiscalYear}-04`, amount: m.unitPrice },
      ],
      createdAt: now,
      updatedAt: now,
    }
  })

  // ── 4. 案件（level-0 → level-1 → level-2） ──
  const projects: Project[] = []
  const projectTaskIds = new Map<string, string[]>() // projectCode → leaf taskIds
  const projectIdByCode = new Map<string, string>()

  for (const def of DEMO_PROJECTS) {
    const projectId = crypto.randomUUID()
    projectIdByCode.set(def.code, projectId)

    projects.push({
      id: projectId,
      code: def.code,
      name: def.name,
      description: def.description,
      parentId: null,
      level: 0,
      status: def.status,
      confidence: def.confidence,
      createdAt: now,
      updatedAt: now,
    })

    const leafTaskIds: string[] = []
    for (const task of def.tasks) {
      const taskId = crypto.randomUUID()
      projects.push({
        id: taskId,
        code: `${def.code}-${task.codeSuffix}`,
        name: task.name,
        parentId: projectId,
        level: 1,
        status: def.status,
        confidence: def.confidence,
        createdAt: now,
        updatedAt: now,
      })

      // level-2 サブタスク
      for (const subTask of task.subTasks) {
        const subTaskId = crypto.randomUUID()
        leafTaskIds.push(subTaskId)
        projects.push({
          id: subTaskId,
          code: `${def.code}-${task.codeSuffix}-${subTask.codeSuffix}`,
          name: subTask.name,
          parentId: taskId,
          level: 2,
          status: def.status,
          confidence: def.confidence,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    projectTaskIds.set(def.code, leafTaskIds)
  }

  // ── 5. WBS設定 ──
  const wbsSettingsMap: Record<string, WbsSettings> = {}

  for (const def of DEMO_PROJECTS) {
    const projectId = projectIdByCode.get(def.code)
    if (!projectId) continue

    const effortColumns = Array.from({ length: 10 }, (_, i) => {
      const col = def.wbsColumns[i]
      return {
        id: `effort-${i + 1}`,
        displayName: col?.displayName ?? `工数${i + 1}`,
        enabled: i < def.wbsColumns.length,
        order: i,
        backgroundColor: DEFAULT_EFFORT_COLUMN_COLORS[i],
        ...(col
          ? {
              techTagIds: col.tagNames
                .map((n) => tagLookup.get(n))
                .filter((id): id is string => id !== undefined),
            }
          : {}),
      }
    })

    wbsSettingsMap[projectId] = {
      effortColumns,
      lastModified: now,
    }
  }

  // ── 6. 工数 ──
  const efforts: EffortEntry[] = []

  for (const def of DEMO_PROJECTS) {
    const taskIds = projectTaskIds.get(def.code) ?? []
    const enabledCount = def.wbsColumns.length

    for (const taskId of taskIds) {
      for (let ci = 0; ci < enabledCount; ci++) {
        // タスクと列に応じた妥当な工数値（1.0〜15.0人月）
        const base = 2.0 + ((taskId.charCodeAt(0) + ci * 7) % 13)
        efforts.push({
          id: crypto.randomUUID(),
          projectId: taskId,
          columnId: `effort-${ci + 1}`,
          value: Math.round(base * 10) / 10,
        })
      }
    }
  }

  // ── 7. スケジュール設定（デフォルト5工程） ──
  const scheduleSettingsMap: Record<string, PhaseSettings> = {}

  for (const def of DEMO_PROJECTS) {
    const projectId = projectIdByCode.get(def.code)
    if (!projectId) continue
    scheduleSettingsMap[projectId] = createDefaultPhaseSettings()
  }

  // ── 8. スケジュールエントリ ──
  const scheduleEntries: ScheduleEntry[] = []

  for (const def of DEMO_PROJECTS) {
    const projectId = projectIdByCode.get(def.code)
    if (!projectId) continue

    const totalMonths = def.endFiscalMonth - def.startFiscalMonth + 1
    const phases = 5
    const monthsPerPhase = Math.max(1, Math.floor(totalMonths / phases))

    for (let p = 0; p < phases; p++) {
      const phaseStartFM = def.startFiscalMonth + p * monthsPerPhase
      const phaseEndFM =
        p < phases - 1
          ? def.startFiscalMonth + (p + 1) * monthsPerPhase - 1
          : def.endFiscalMonth

      if (phaseStartFM > 12 || phaseEndFM > 12) continue

      const pStartCal = fiscalMonthToCalendarMonth(phaseStartFM)
      const pStartYear = phaseStartFM <= 9 ? fiscalYear : fiscalYear + 1
      const pEndCal = fiscalMonthToCalendarMonth(phaseEndFM)
      const pEndYear = phaseEndFM <= 9 ? fiscalYear : fiscalYear + 1

      scheduleEntries.push({
        id: crypto.randomUUID(),
        projectId,
        phaseKey: `phase-${p + 1}`,
        startDate: `${pStartYear}-${String(pStartCal).padStart(2, '0')}-01`,
        endDate: lastDayOfMonth(pEndYear, pEndCal),
      })
    }
  }

  // ── 9. 工程依存関係（FS チェーン） ──
  const dependencies: PhaseDependency[] = []

  for (const def of DEMO_PROJECTS) {
    const projectId = projectIdByCode.get(def.code)
    if (!projectId) continue

    // 生成されたスケジュールエントリのフェーズキーを取得
    const projectEntries = scheduleEntries.filter(
      (e) => e.projectId === projectId,
    )
    const phaseKeys = projectEntries.map((e) => e.phaseKey).sort()

    for (let i = 0; i < phaseKeys.length - 1; i++) {
      const fromKey = phaseKeys[i]
      const toKey = phaseKeys[i + 1]
      if (!fromKey || !toKey) continue
      dependencies.push({
        id: crypto.randomUUID(),
        projectId,
        fromPhaseKey: fromKey,
        toPhaseKey: toKey,
        dependencyType: 'FS',
      })
    }
  }

  // ── 10. アサイン ──
  const assignments: AssignmentEntry[] = []
  // メンバーの月別合計を追跡
  const memberMonthTotals = new Map<string, number>() // `${memberId}:${monthKey}` → total

  function getMemberMonthTotal(memberId: string, monthKey: string): number {
    return memberMonthTotals.get(`${memberId}:${monthKey}`) ?? 0
  }

  function addMemberMonthValue(
    memberId: string,
    monthKey: string,
    value: number,
  ) {
    const key = `${memberId}:${monthKey}`
    memberMonthTotals.set(key, (memberMonthTotals.get(key) ?? 0) + value)
  }

  for (const def of DEMO_PROJECTS) {
    const projectId = projectIdByCode.get(def.code)
    const taskIds = projectTaskIds.get(def.code)
    if (!projectId || !taskIds) continue

    // WBS列のtechTagIdsを取得
    const wbsSettings = wbsSettingsMap[projectId]
    const enabledColumns =
      wbsSettings?.effortColumns.filter((c) => c.enabled) ?? []
    const projectTagIds = new Set(
      enabledColumns.flatMap((c) => c.techTagIds ?? []),
    )

    // メンバーをスコアリング
    const scoredMembers = members.map((m) => {
      const memberTagIds = new Set(m.techTagIds ?? [])
      let score = 0
      for (const tagId of projectTagIds) {
        if (memberTagIds.has(tagId)) score++
      }
      return { member: m, score }
    })
    scoredMembers.sort((a, b) => b.score - a.score)

    // スコア > 0 のメンバーを候補として取得
    const candidates = scoredMembers.filter((s) => s.score > 0)

    // アクティブ月のmonthKeyリストを生成
    const activeMonths: string[] = []
    for (let fm = def.startFiscalMonth; fm <= def.endFiscalMonth; fm++) {
      const cal = fiscalMonthToCalendarMonth(fm)
      const year = fm <= 9 ? fiscalYear : fiscalYear + 1
      activeMonths.push(`${year}-${String(cal).padStart(2, '0')}`)
    }

    // 各タスクに2〜4名アサイン
    for (let ti = 0; ti < taskIds.length; ti++) {
      const taskId = taskIds[ti]
      if (!taskId) continue
      const assignCount = Math.min(candidates.length, 2 + (ti % 3))

      // タスクごとに候補をローテーション（同じメンバーが全タスクに集中しないように）
      const offset = ti * 2
      for (let ai = 0; ai < assignCount; ai++) {
        const candidate = candidates[(offset + ai) % candidates.length]
        if (!candidate) continue

        const memberId = candidate.member.id
        const monthlyValues: Record<string, number> = {}

        // 各月にアサイン値を設定
        const assignValue = ai === 0 ? 0.3 : ai === 1 ? 0.2 : 0.1
        for (const monthKey of activeMonths) {
          const currentTotal = getMemberMonthTotal(memberId, monthKey)
          const available = Math.round((1.0 - currentTotal) * 10) / 10
          if (available >= 0.1) {
            const value = Math.min(assignValue, available)
            // 0.1刻みに丸める
            const rounded = Math.round(value * 10) / 10
            if (rounded > 0) {
              monthlyValues[monthKey] = rounded
              addMemberMonthValue(memberId, monthKey, rounded)
            }
          }
        }

        if (Object.keys(monthlyValues).length > 0) {
          assignments.push({
            id: crypto.randomUUID(),
            projectId,
            taskId,
            memberId,
            monthlyValues,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }
  }

  // ── Database構築 ──
  const database: Database = {
    version: '1.0.0',
    fiscalYear,
    projects,
    members,
    efforts,
    scheduleEntries,
    dependencies,
    assignments,
    techTags,
    techTagCategories,
    techTagSubCategories,
    divisions,
    sections,
    metadata: {
      lastModified: now,
      createdBy: 'demo-data-generator',
      version: '1.0.0',
    },
  }

  return { database, wbsSettingsMap, scheduleSettingsMap }
}

/** 年度月(1=4月, 12=3月)をカレンダー月(1〜12)に変換 */
function fiscalMonthToCalendarMonth(fiscalMonth: number): number {
  return ((fiscalMonth + 2) % 12) + 1
}

/** 指定年月の最終日を YYYY-MM-DD で返す */
function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
