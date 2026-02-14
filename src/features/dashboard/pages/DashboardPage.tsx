import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Combobox } from '@/shared/components/ui/combobox'
import { filterMembersByOrganization } from '@/shared/utils/member-filter'
import {
  useAppStore,
  useAssignmentStore,
  useMembersStore,
  useProjectsStore,
  useTeamStore,
  useTechTagsStore,
} from '@/stores'
import { BudgetComparisonChart } from '../components/BudgetComparisonChart'
import { MemberAssignmentChart } from '../components/MemberAssignmentChart'
import { ProjectAssignmentChart } from '../components/ProjectAssignmentChart'
import { SkillDistributionChart } from '../components/SkillDistributionChart'
import { UtilizationRateChart } from '../components/UtilizationRateChart'

export function DashboardPage() {
  const globalFiscalYear = useAppStore((s) => s.fiscalYear)
  const fiscalYearStartMonth = useAppStore((s) => s.fiscalYearStartMonth)
  const projects = useProjectsStore((s) => s.projects)
  const loadProjects = useProjectsStore((s) => s.loadProjects)
  const members = useMembersStore((s) => s.members)
  const loadMembers = useMembersStore((s) => s.loadMembers)
  const assignments = useAssignmentStore((s) => s.assignments)
  const loadAssignments = useAssignmentStore((s) => s.loadAssignments)
  const divisions = useTeamStore((s) => s.divisions)
  const sections = useTeamStore((s) => s.sections)
  const loadTeam = useTeamStore((s) => s.loadTeam)
  const techTags = useTechTagsStore((s) => s.techTags)
  const techTagCategories = useTechTagsStore((s) => s.techTagCategories)
  const loadTechTags = useTechTagsStore((s) => s.loadTechTags)

  const [selectedFiscalYear, setSelectedFiscalYear] = useState(globalFiscalYear)
  const [selectedDivisionId, setSelectedDivisionId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')

  useEffect(() => {
    loadProjects()
    loadMembers()
    loadAssignments()
    loadTeam()
    loadTechTags()
  }, [loadProjects, loadMembers, loadAssignments, loadTeam, loadTechTags])

  const handleDivisionChange = useCallback((divisionId: string) => {
    setSelectedDivisionId(divisionId)
    setSelectedSectionId('')
  }, [])

  const sortedDivisions = useMemo(
    () => [...divisions].sort((a, b) => a.sortOrder - b.sortOrder),
    [divisions],
  )

  const availableSections = useMemo(
    () =>
      selectedDivisionId && selectedDivisionId !== '__unaffiliated__'
        ? [...sections]
            .filter((s) => s.divisionId === selectedDivisionId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [sections, selectedDivisionId],
  )

  const filteredMembers = useMemo(
    () =>
      filterMembersByOrganization(
        members,
        sections,
        selectedDivisionId,
        selectedSectionId,
      ),
    [members, sections, selectedDivisionId, selectedSectionId],
  )

  // Fiscal year options: current year +/- 2 years
  const fiscalYearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = globalFiscalYear - 2; y <= globalFiscalYear + 2; y++) {
      years.push(y)
    }
    return years
  }, [globalFiscalYear])

  return (
    <div className="space-y-4">
      {/* Header with fiscal year selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div data-tour="dashboard-fiscal-year">
          <Combobox
            value={String(selectedFiscalYear)}
            onValueChange={(v) => setSelectedFiscalYear(Number(v))}
            options={fiscalYearOptions.map((year) => ({
              value: String(year),
              label: `${year}年度`,
            }))}
            searchPlaceholder="年度を検索..."
            className="w-[160px]"
          />
        </div>
      </div>

      {/* Project Assignment Chart */}
      <Card data-tour="dashboard-project-chart">
        <CardHeader>
          <CardTitle>プロジェクト別アサイン</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectAssignmentChart
            assignments={assignments}
            projects={projects}
            fiscalYear={selectedFiscalYear}
            fiscalYearStartMonth={fiscalYearStartMonth}
          />
        </CardContent>
      </Card>

      {/* Budget Comparison Chart */}
      <Card data-tour="dashboard-budget-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            売上予算 vs 見込売上
            <span className="text-xs font-normal text-muted-foreground">
              （部門別）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#3b82f6]" />
              売上予算
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />
              見込売上
            </span>
          </div>
          <BudgetComparisonChart
            divisions={divisions}
            sections={sections}
            members={members}
            assignments={assignments}
            fiscalYear={selectedFiscalYear}
            fiscalYearStartMonth={fiscalYearStartMonth}
          />
        </CardContent>
      </Card>

      {/* Member Assignment Chart */}
      <Card data-tour="dashboard-member-chart">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>メンバー別アサイン</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">部門:</span>
              <select
                value={selectedDivisionId}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">全て</option>
                {sortedDivisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value="__unaffiliated__">未所属</option>
              </select>
              {availableSections.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">課:</span>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">全て</option>
                    {availableSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MemberAssignmentChart
            members={filteredMembers}
            assignments={assignments}
            fiscalYear={selectedFiscalYear}
            fiscalYearStartMonth={fiscalYearStartMonth}
          />
        </CardContent>
      </Card>

      {/* Utilization Rate Chart */}
      <Card data-tour="dashboard-utilization-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            アサイン充足率
            <span className="text-xs font-normal text-muted-foreground">
              （年間平均、部門・課フィルタ連動）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#3b82f6]" />
              〜50%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#eab308]" />
              50〜89%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />
              90〜100%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#ef4444]" />
              100%超
            </span>
          </div>
          <UtilizationRateChart
            members={filteredMembers}
            assignments={assignments}
            fiscalYear={selectedFiscalYear}
            fiscalYearStartMonth={fiscalYearStartMonth}
          />
        </CardContent>
      </Card>

      {/* Skill Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            スキルマップ概況
            <span className="text-xs font-normal text-muted-foreground">
              （カテゴリ別メンバー数、部門・課フィルタ連動）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkillDistributionChart
            members={filteredMembers}
            techTags={techTags}
            techTagCategories={techTagCategories}
          />
        </CardContent>
      </Card>
    </div>
  )
}
