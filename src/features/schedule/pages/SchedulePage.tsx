import { Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import type { DependencyType } from '@/shared/types/schedule'
import { createDefaultPhaseSettings } from '@/shared/types/schedule'
import {
  useProjectsStore,
  useScheduleSettingsStore,
  useScheduleStore,
} from '@/stores'
import { ScheduleGantt } from '../components/ScheduleGantt'

export function SchedulePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const projects = useProjectsStore((s) => s.projects)
  const loadProjects = useProjectsStore((s) => s.loadProjects)
  const settingsMap = useScheduleSettingsStore((s) => s.settingsMap)
  const reorderPhase = useScheduleSettingsStore((s) => s.reorderPhase)
  const loadSchedule = useScheduleStore((s) => s.loadSchedule)
  const entries = useScheduleStore((s) => s.entries)
  const dependencies = useScheduleStore((s) => s.dependencies)
  const upsertEntry = useScheduleStore((s) => s.upsertEntry)
  const addDependency = useScheduleStore((s) => s.addDependency)
  const deleteDependency = useScheduleStore((s) => s.deleteDependency)

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () =>
      (location.state as { selectedProjectId?: string } | null)
        ?.selectedProjectId ?? '',
  )

  // Load data on mount
  useEffect(() => {
    loadProjects()
    loadSchedule()
  }, [loadProjects, loadSchedule])

  // Filter to top-level projects only (level === 0)
  const topLevelProjects = useMemo(
    () => projects.filter((p) => p.level === 0),
    [projects],
  )

  // 案件別の工程設定
  const settings = useMemo(
    () =>
      selectedProjectId
        ? (settingsMap[selectedProjectId] ?? createDefaultPhaseSettings())
        : createDefaultPhaseSettings(),
    [settingsMap, selectedProjectId],
  )

  // Enabled phases sorted by sortOrder
  const enabledPhases = useMemo(
    () =>
      [...settings.phases]
        .filter((p) => p.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [settings.phases],
  )

  // Entries and dependencies for selected project
  const projectEntries = useMemo(
    () => entries.filter((e) => e.projectId === selectedProjectId),
    [entries, selectedProjectId],
  )

  const projectDependencies = useMemo(
    () => dependencies.filter((d) => d.projectId === selectedProjectId),
    [dependencies, selectedProjectId],
  )

  // 日付変更ハンドラー
  const handleDateChange = useCallback(
    (phaseKey: string, startDate: string, endDate: string) => {
      if (!selectedProjectId) return
      if (startDate && endDate && startDate <= endDate) {
        upsertEntry(selectedProjectId, phaseKey, startDate, endDate)
      }
    },
    [selectedProjectId, upsertEntry],
  )

  // 行並び替えハンドラー
  const handleReorder = useCallback(
    (fromKey: string, toKey: string) => {
      if (!selectedProjectId) return
      reorderPhase(selectedProjectId, fromKey, toKey)
    },
    [selectedProjectId, reorderPhase],
  )

  // 依存関係追加ハンドラー
  const handleAddDependency = useCallback(
    (fromPhaseKey: string, toPhaseKey: string, type: DependencyType) => {
      if (!selectedProjectId) return
      addDependency(selectedProjectId, fromPhaseKey, toPhaseKey, type)
    },
    [selectedProjectId, addDependency],
  )

  // エントリ作成ハンドラー（ダブルクリック時）
  const handleCreateEntry = useCallback(
    (phaseKey: string, startDate: string, endDate: string) => {
      if (!selectedProjectId) return
      upsertEntry(selectedProjectId, phaseKey, startDate, endDate)
    },
    [selectedProjectId, upsertEntry],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">スケジュール</h1>
          <p className="text-sm text-muted-foreground">
            プロジェクトごとの工程スケジュールをガントチャートで管理します。
            タイムライン上のダブルクリック、または開始日・終了日セルのダブルクリックで工程バーを新規作成できます。
          </p>
        </div>
        <Button
          data-tour="schedule-settings"
          variant="ghost"
          size="icon"
          disabled={!selectedProjectId}
          onClick={() => navigate(`/schedule-settings/${selectedProjectId}`)}
          title="工程設定"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Project selector */}
      <div
        data-tour="schedule-project-selector"
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

      {!selectedProjectId && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          プロジェクトを選択してください
        </div>
      )}

      {selectedProjectId && enabledPhases.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          有効な工程がありません。工程設定画面で工程を有効にしてください。
        </div>
      )}

      {selectedProjectId && enabledPhases.length > 0 && (
        <div data-tour="schedule-gantt">
          <ScheduleGantt
            phases={enabledPhases}
            entries={projectEntries}
            dependencies={projectDependencies}
            onDateChange={handleDateChange}
            onReorder={handleReorder}
            onAddDependency={handleAddDependency}
            onDeleteDependency={deleteDependency}
            onCreateEntry={handleCreateEntry}
          />
        </div>
      )}
    </div>
  )
}
