import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Combobox } from '@/shared/components/ui/combobox'
import { createDefaultWbsSettings } from '@/shared/types/wbs-settings'
import { computeEffortDisplayValues } from '@/shared/utils/effort-utils'
import {
  useAppStore,
  useAssignmentStore,
  useEffortsStore,
  useMembersStore,
  useProjectsStore,
  useScheduleStore,
  useTeamStore,
  useWbsSettingsStore,
} from '@/stores'
import { AssignmentTreeGrid } from '../components/AssignmentTreeGrid'
import { MemberProjectAssignmentGrid } from '../components/MemberProjectAssignmentGrid'
import { MemberSummaryGrid } from '../components/MemberSummaryGrid'
import {
  getMonthRangeFromSchedule,
  getScheduleMonthRange,
} from '../utils/assignment-utils'

export function AssignmentPage() {
  const fiscalYear = useAppStore((s) => s.fiscalYear)
  const fiscalYearStartMonth = useAppStore((s) => s.fiscalYearStartMonth)
  const projects = useProjectsStore((s) => s.projects)
  const loadProjects = useProjectsStore((s) => s.loadProjects)
  const getProjectTree = useProjectsStore((s) => s.getProjectTree)
  const members = useMembersStore((s) => s.members)
  const loadMembers = useMembersStore((s) => s.loadMembers)
  const assignments = useAssignmentStore((s) => s.assignments)
  const loadAssignments = useAssignmentStore((s) => s.loadAssignments)
  const entries = useScheduleStore((s) => s.entries)
  const loadSchedule = useScheduleStore((s) => s.loadSchedule)
  const efforts = useEffortsStore((s) => s.efforts)
  const loadEfforts = useEffortsStore((s) => s.loadEfforts)
  const settingsMap = useWbsSettingsStore((s) => s.settingsMap)
  const loadTeam = useTeamStore((s) => s.loadTeam)

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [summarySelectedMemberIds, setSummarySelectedMemberIds] = useState<
    Set<string>
  >(() => new Set())
  const [summaryFiscalYear, setSummaryFiscalYear] = useState(fiscalYear)

  const handleMemberSelectionChange = useCallback((ids: Set<string>) => {
    setSummarySelectedMemberIds(ids)
  }, [])

  const handleFiscalYearChange = useCallback((year: number) => {
    setSummaryFiscalYear(year)
  }, [])

  useEffect(() => {
    loadProjects()
    loadMembers()
    loadAssignments()
    loadSchedule()
    loadEfforts()
    loadTeam()
  }, [
    loadProjects,
    loadMembers,
    loadAssignments,
    loadSchedule,
    loadEfforts,
    loadTeam,
  ])

  const topLevelProjects = useMemo(
    () => projects.filter((p) => p.level === 0),
    [projects],
  )

  // Collect all descendant project IDs for the selected project
  const selectedProjectDescendantIds = useMemo(() => {
    if (!selectedProjectId) return new Set<string>()
    const ids = new Set<string>([selectedProjectId])
    for (const p of projects) {
      if (p.parentId && ids.has(p.parentId)) {
        ids.add(p.id)
      }
    }
    return ids
  }, [selectedProjectId, projects])

  // Editing grid: month columns derived from selected project's schedule entries (including descendants)
  const projectScheduleEntries = useMemo(
    () => entries.filter((e) => selectedProjectDescendantIds.has(e.projectId)),
    [entries, selectedProjectDescendantIds],
  )

  const editingMonthKeys = useMemo(
    () => getMonthRangeFromSchedule(projectScheduleEntries),
    [projectScheduleEntries],
  )

  // Summary grid: fiscal year 12-month range
  const summaryMonthKeys = useMemo(
    () => getScheduleMonthRange(fiscalYear, fiscalYearStartMonth),
    [fiscalYear, fiscalYearStartMonth],
  )

  // MemberProjectAssignmentGrid 用: サマリーグリッドの年度に連動
  const memberProjectMonthKeys = useMemo(
    () => getScheduleMonthRange(summaryFiscalYear, fiscalYearStartMonth),
    [summaryFiscalYear, fiscalYearStartMonth],
  )

  // 1名選択時のメンバー情報
  const singleSelectedMember = useMemo(() => {
    if (summarySelectedMemberIds.size !== 1) return null
    const memberId = [...summarySelectedMemberIds][0]
    return members.find((m) => m.id === memberId) ?? null
  }, [summarySelectedMemberIds, members])

  // biome-ignore lint/correctness/useExhaustiveDependencies: getProjectTree内部でprojectsを参照するため、projectsの変更をトリガーにする
  const fullTree = useMemo(() => getProjectTree(), [projects])

  const filteredTree = useMemo(() => {
    if (!selectedProjectId) return []
    return fullTree.filter((node) => node.id === selectedProjectId)
  }, [fullTree, selectedProjectId])

  // タスクごとのWBS工数小計（人日）を計算
  const wbsSettings = useMemo(
    () =>
      selectedProjectId
        ? (settingsMap[selectedProjectId] ?? createDefaultWbsSettings())
        : undefined,
    [settingsMap, selectedProjectId],
  )
  const taskEffortSubtotals = useMemo(() => {
    if (!wbsSettings) return new Map<string, number>()
    const enabledCols = wbsSettings.effortColumns
      .filter((c) => c.enabled)
      .sort((a, b) => a.order - b.order)
    const colIds = enabledCols.map((c) => c.id)
    if (colIds.length === 0 || filteredTree.length === 0)
      return new Map<string, number>()

    const displayValues = computeEffortDisplayValues(
      filteredTree,
      colIds,
      efforts,
    )
    const subtotals = new Map<string, number>()
    // 全ノードのIDを収集
    function collectIds(nodes: typeof filteredTree): string[] {
      const ids: string[] = []
      for (const n of nodes) {
        ids.push(n.id)
        ids.push(...collectIds(n.children))
      }
      return ids
    }
    for (const taskId of collectIds(filteredTree)) {
      let sum = 0
      for (const colId of colIds) {
        sum += displayValues.get(`${taskId}:${colId}`) ?? 0
      }
      subtotals.set(taskId, sum)
    }
    return subtotals
  }, [filteredTree, wbsSettings, efforts])

  const projectAssignments = useMemo(
    () => assignments.filter((a) => a.projectId === selectedProjectId),
    [assignments, selectedProjectId],
  )

  // Check if selected project has schedule entries
  const hasScheduleEntries = useMemo(() => {
    if (!selectedProjectId) return false
    return entries.some((e) => e.projectId === selectedProjectId)
  }, [entries, selectedProjectId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">アサイン</h1>
          <p className="text-sm text-muted-foreground">
            プロジェクトごとのタスク別担当者アサインと月次配分（人月）を管理します。1担当者あたりのアサイン上限は1.00人月/月です。
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {fiscalYear}年度（{fiscalYear}年{fiscalYearStartMonth}月〜
          {fiscalYearStartMonth === 1 ? fiscalYear : fiscalYear + 1}年
          {fiscalYearStartMonth === 1 ? 12 : fiscalYearStartMonth - 1}
          月）
        </span>
      </div>

      {/* Member summary (cross-project, full fiscal year) */}
      <div data-tour="assignment-member-summary">
        <MemberSummaryGrid
          monthColumns={summaryMonthKeys}
          assignments={assignments}
          members={members}
          projects={projects}
          fiscalYear={fiscalYear}
          fiscalYearStartMonth={fiscalYearStartMonth}
          onMemberSelectionChange={handleMemberSelectionChange}
          onFiscalYearChange={handleFiscalYearChange}
        />
      </div>

      {/* Member-Project Assignment Grid: サマリーで1名選択時のみ表示 */}
      {singleSelectedMember && (
        <div>
          <MemberProjectAssignmentGrid
            memberId={singleSelectedMember.id}
            memberName={singleSelectedMember.name}
            monthColumns={memberProjectMonthKeys}
            assignments={assignments}
            projects={projects}
          />
        </div>
      )}

      {/* Project selector */}
      <div
        data-tour="assignment-project-selector"
        className="flex items-center gap-4"
      >
        <span className="text-sm font-medium">対象プロジェクト</span>
        <Combobox
          value={selectedProjectId}
          onValueChange={setSelectedProjectId}
          options={topLevelProjects.map((p) => ({
            value: p.id,
            label: `${p.code} - ${p.name}（${p.confidence ?? '未設定'}）`,
          }))}
          placeholder="プロジェクトを選択してください"
          searchPlaceholder="プロジェクトを検索..."
          className="w-[480px]"
        />
      </div>

      {/* Assignment grid */}
      {!selectedProjectId && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          プロジェクトを選択してください
        </div>
      )}

      {selectedProjectId && !hasScheduleEntries && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          このプロジェクトにはスケジュールが設定されていません。先にスケジュール画面でスケジュールを設定してください。
        </div>
      )}

      {selectedProjectId && hasScheduleEntries && filteredTree.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          選択したプロジェクトにタスクがありません。先にWBSでタスクを追加してください。
        </div>
      )}

      {selectedProjectId && hasScheduleEntries && filteredTree.length > 0 && (
        <Card data-tour="assignment-grid">
          <CardHeader>
            <CardTitle>
              タスク別アサイン -{' '}
              {topLevelProjects.find((p) => p.id === selectedProjectId)?.name ??
                ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentTreeGrid
              projectId={selectedProjectId}
              tree={filteredTree}
              assignments={projectAssignments}
              members={members}
              monthKeys={editingMonthKeys}
              taskEffortSubtotals={taskEffortSubtotals}
              scheduleEntries={entries}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
