import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useToast } from '@/shared/hooks/use-toast'
import type { Project } from '@/shared/types'
import { CONFIDENCE_OPTIONS, STATUS_OPTIONS } from '@/shared/types/project'
import { getThemeColor, type ThemeColor } from '@/shared/types/theme-color'
import { createDefaultWbsSettings } from '@/shared/types/wbs-settings'
import {
  useAppStore,
  useAssignmentStore,
  useEffortsStore,
  useProjectsStore,
  useScheduleStore,
  useWbsSettingsStore,
} from '@/stores'
import { ProjectDialog } from '../components/ProjectDialog'
import { computeEffortDisplayValues, formatEffort } from '../utils/effort-utils'

interface ProjectEffortSummary {
  total: number
  breakdown: {
    columnId: string
    displayName: string
    color?: ThemeColor
    value: number
  }[]
}

export function ProjectsPage() {
  const { toast } = useToast()
  const loadProjects = useProjectsStore((state) => state.loadProjects)
  const getProjectTree = useProjectsStore((state) => state.getProjectTree)
  const deleteProject = useProjectsStore((state) => state.deleteProject)
  const projects = useProjectsStore((state) => state.projects)

  const efforts = useEffortsStore((s) => s.efforts)
  const loadEfforts = useEffortsStore((s) => s.loadEfforts)
  const settingsMap = useWbsSettingsStore((s) => s.settingsMap)

  const assignments = useAssignmentStore((s) => s.assignments)
  const loadAssignments = useAssignmentStore((s) => s.loadAssignments)

  const scheduleEntries = useScheduleStore((s) => s.entries)
  const loadSchedule = useScheduleStore((s) => s.loadSchedule)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  useEffect(() => {
    loadProjects()
    loadEfforts()
    loadAssignments()
    loadSchedule()
  }, [loadProjects, loadEfforts, loadAssignments, loadSchedule])

  const majorProjects = useMemo(
    () =>
      projects
        .filter((p) => p.level === 0)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [projects],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: getProjectTree内部でprojectsを参照するため、projectsの変更をトリガーにする
  const fullTree = useMemo(() => getProjectTree(), [projects])

  // 案件ごとの総工数を計算
  const effortSummaries = useMemo(() => {
    const result = new Map<string, ProjectEffortSummary>()
    for (const rootNode of fullTree) {
      const settings = settingsMap[rootNode.id] ?? createDefaultWbsSettings()
      const enabledCols = settings.effortColumns
        .filter((c) => c.enabled)
        .sort((a, b) => a.order - b.order)
      const columnIds = enabledCols.map((c) => c.id)

      const displayValues = computeEffortDisplayValues(
        [rootNode],
        columnIds,
        efforts,
      )

      let total = 0
      const breakdown: ProjectEffortSummary['breakdown'] = []
      for (const col of enabledCols) {
        const value = displayValues.get(`${rootNode.id}:${col.id}`) ?? 0
        total += value
        breakdown.push({
          columnId: col.id,
          displayName: col.displayName,
          color: col.backgroundColor,
          value,
        })
      }
      result.set(rootNode.id, { total, breakdown })
    }
    return result
  }, [fullTree, efforts, settingsMap])

  // Project別の割当済工数（人月）を計算
  const assignedEfforts = useMemo(() => {
    const result = new Map<string, number>()
    for (const project of majorProjects) {
      const projectAssignments = assignments.filter(
        (a) => a.projectId === project.id,
      )
      let total = 0
      for (const a of projectAssignments) {
        for (const v of Object.values(a.monthlyValues)) {
          total += v
        }
      }
      result.set(project.id, total)
    }
    return result
  }, [majorProjects, assignments])

  // プロジェクトごとのスケジュール日付範囲（最古開始日・最新終了日）
  const scheduleDateRanges = useMemo(() => {
    const result = new Map<string, { startDate: string; endDate: string }>()
    for (const project of majorProjects) {
      const projectEntries = scheduleEntries.filter(
        (e) =>
          e.projectId === project.id &&
          e.startDate &&
          e.endDate &&
          e.startDate <= e.endDate,
      )
      if (projectEntries.length === 0) continue

      // biome-ignore lint/style/noNonNullAssertion: length > 0 checked above
      let minStart = projectEntries[0]!.startDate
      // biome-ignore lint/style/noNonNullAssertion: length > 0 checked above
      let maxEnd = projectEntries[0]!.endDate
      for (const entry of projectEntries) {
        if (entry.startDate < minStart) minStart = entry.startDate
        if (entry.endDate > maxEnd) maxEnd = entry.endDate
      }
      result.set(project.id, { startDate: minStart, endDate: maxEnd })
    }
    return result
  }, [majorProjects, scheduleEntries])

  const getChildCount = useCallback(
    (projectId: string) => {
      let count = 0
      const queue = [projectId]
      while (queue.length > 0) {
        const pid = queue.shift()
        if (!pid) continue
        for (const p of projects) {
          if (p.parentId === pid) {
            count++
            queue.push(p.id)
          }
        }
      }
      return count
    },
    [projects],
  )

  const handleAdd = useCallback(() => {
    setEditProject(null)
    setDialogOpen(true)
  }, [])

  const handleEdit = useCallback((project: Project) => {
    setEditProject(project)
    setDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id)
      toast({ title: 'プロジェクトを削除しました（関連WBSも削除されました）' })
    }
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }, [projectToDelete, deleteProject, toast])

  // 全案件の総合計工数（人日）
  const grandTotalDays = useMemo(() => {
    let sum = 0
    for (const s of effortSummaries.values()) {
      sum += s.total
    }
    return sum
  }, [effortSummaries])

  // 全案件の割当済・未割当合計（人月）
  const grandTotalAssigned = useMemo(() => {
    let sum = 0
    for (const v of assignedEfforts.values()) {
      sum += v
    }
    return sum
  }, [assignedEfforts])

  const grandTotalUnassigned = useMemo(
    () => grandTotalDays / 20 - grandTotalAssigned,
    [grandTotalDays, grandTotalAssigned],
  )

  const deleteChildCount = useMemo(() => {
    if (!projectToDelete) return 0
    return getChildCount(projectToDelete.id)
  }, [projectToDelete, getChildCount])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">プロジェクト</h1>
        <Button data-tour="projects-add" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          新規プロジェクト
        </Button>
      </div>

      <Card data-tour="projects-table">
        <CardHeader>
          <CardTitle>プロジェクト一覧（{majorProjects.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          {majorProjects.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              プロジェクトがありません。「新規プロジェクト」ボタンから追加してください。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">コード</th>
                    <th className="px-3 py-2 text-left font-medium">
                      プロジェクト名
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      ステータス
                    </th>
                    <th className="px-3 py-2 text-center font-medium">確度</th>
                    <th className="px-3 py-2 text-left font-medium">背景</th>
                    <th className="px-3 py-2 text-left font-medium">目的</th>
                    <th className="px-3 py-2 text-left font-medium">説明</th>
                    <th className="px-3 py-2 text-center font-medium">WBS数</th>
                    <th className="px-3 py-2 text-center font-medium">
                      開始日
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      終了日
                    </th>
                    <th className="px-3 py-2 text-right font-medium">総工数</th>
                    <th className="px-3 py-2 text-right font-medium">
                      割当済工数
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      未割当工数
                    </th>
                    <th className="w-24 px-3 py-2 text-center font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {majorProjects.map((project) => {
                    const summary = effortSummaries.get(project.id)
                    return (
                      <tr
                        key={project.id}
                        className={`group border-b border-border hover:bg-accent/30 ${project.status === 'completed' ? 'bg-gray-100/70 dark:bg-gray-800/50 text-muted-foreground' : ''}`}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {project.code}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {project.name}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {STATUS_OPTIONS.find(
                            (o) => o.value === project.status,
                          )?.label ?? '未着手'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {project.confidence
                            ? (CONFIDENCE_OPTIONS.find(
                                (o) => o.value === project.confidence,
                              )?.label ?? '-')
                            : '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                          {project.background || '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                          {project.purpose || '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                          {project.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {getChildCount(project.id)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs tabular-nums text-muted-foreground">
                          {scheduleDateRanges
                            .get(project.id)
                            ?.startDate.replace(/-/g, '/') ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs tabular-nums text-muted-foreground">
                          {scheduleDateRanges
                            .get(project.id)
                            ?.endDate.replace(/-/g, '/') ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <EffortCell summary={summary} />
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">
                          {(assignedEfforts.get(project.id) ?? 0).toFixed(2)}{' '}
                          人月
                        </td>
                        {(() => {
                          const assigned = assignedEfforts.get(project.id) ?? 0
                          const totalMonths = (summary?.total ?? 0) / 20
                          const unassigned = totalMonths - assigned
                          return (
                            <td
                              className={`px-3 py-2 text-right text-xs tabular-nums ${unassigned < 0 ? 'text-destructive' : ''}`}
                            >
                              {unassigned.toFixed(2)} 人月
                            </td>
                          )
                        })()}
                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(project)}
                              title="編集"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(project)}
                              title="削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={10} className="px-3 py-2 text-right text-sm">
                      全プロジェクト合計
                    </td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">
                      {(grandTotalDays / 20).toFixed(2)} 人月
                    </td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">
                      {grandTotalAssigned.toFixed(2)} 人月
                    </td>
                    <td
                      className={`px-3 py-2 text-right text-sm tabular-nums ${grandTotalUnassigned < 0 ? 'text-destructive' : ''}`}
                    >
                      {grandTotalUnassigned.toFixed(2)} 人月
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editProject}
        defaultLevel={0}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクトの削除</DialogTitle>
            <DialogDescription>
              「{projectToDelete?.name}」を削除しますか？
              {deleteChildCount > 0
                ? `関連するWBS（${deleteChildCount}件）と配分データもすべて削除されます。`
                : '関連する配分データも削除されます。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EffortCell({
  summary,
}: {
  summary: ProjectEffortSummary | undefined
}) {
  const theme = useAppStore((s) => s.theme)

  if (!summary || summary.total === 0) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  const totalMonths = (summary.total / 20).toFixed(2)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums hover:bg-accent transition-colors"
        >
          <span className="font-medium">{totalMonths}</span>
          <span className="text-muted-foreground">人月</span>
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          工数内訳（人日）
        </p>
        <table className="w-full text-xs">
          <tbody>
            {summary.breakdown.map((item) => (
              <tr
                key={item.columnId}
                className="border-b border-border/50 last:border-b-0"
              >
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-border/50"
                      style={{
                        backgroundColor: item.color
                          ? getThemeColor(item.color, theme)
                          : 'transparent',
                      }}
                    />
                    {item.displayName}
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatEffort(item.value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-medium">
              <td className="pt-1.5">合計</td>
              <td className="pt-1.5 text-right tabular-nums">
                {formatEffort(summary.total)}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({totalMonths})
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </PopoverContent>
    </Popover>
  )
}
