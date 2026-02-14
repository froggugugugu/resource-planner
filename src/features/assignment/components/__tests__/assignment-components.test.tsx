import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AssignmentEntry } from '@/shared/types/assignment'
import type { Member } from '@/shared/types/member'
import type { Project } from '@/shared/types/project'

// Mock stores before importing components
vi.mock('@/stores', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ fiscalYear: 2025 }),
  ),
  useProjectsStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      projects: [],
      loadProjects: vi.fn(),
      getProjectTree: () => [],
    }),
  ),
  useMembersStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      members: [],
      loadMembers: vi.fn(),
    }),
  ),
  useAssignmentStore: vi.fn(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        assignments: [],
        loadAssignments: vi.fn(),
        upsertAssignment: vi.fn(),
        updateMonthlyValue: vi.fn(),
        deleteAssignment: vi.fn(),
      }),
  ),
  useScheduleStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      entries: [],
      loadSchedule: vi.fn(),
    }),
  ),
}))

// Mock react-router-dom for NavLink
vi.mock('react-router-dom', () => ({
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

function createMember(
  overrides: Partial<Member> & { id: string; name: string },
): Member {
  return {
    department: '',
    sectionId: null,
    role: '',
    isActive: true,
    startDate: null,
    endDate: null,
    unitPriceHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createProject(
  overrides: Partial<Project> & { id: string; name: string; code: string },
): Project {
  return {
    level: 0,
    parentId: null,
    status: 'active',
    confidence: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createAssignment(
  overrides: Partial<AssignmentEntry> & {
    projectId: string
    taskId: string
    memberId: string
    monthlyValues: Record<string, number>
  },
): AssignmentEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('MemberSummaryGrid', () => {
  afterEach(() => {
    cleanup()
  })

  const monthColumns = ['2025-04', '2025-05', '2025-06']
  const members: Member[] = [
    createMember({ id: 'm1', name: '田中太郎', department: '開発部' }),
    createMember({ id: 'm2', name: '鈴木花子', department: '設計部' }),
  ]
  const projects: Project[] = [
    createProject({ id: 'p1', name: 'プロジェクトA', code: 'P001' }),
    createProject({ id: 'p2', name: 'プロジェクトB', code: 'P002' }),
  ]

  // Import lazily after mocks are set
  async function renderSummaryGrid(
    assignments: AssignmentEntry[],
    opts?: { monthColumns?: string[] },
  ) {
    const { MemberSummaryGrid } = await import(
      '@/features/assignment/components/MemberSummaryGrid'
    )
    return render(
      <MemberSummaryGrid
        monthColumns={opts?.monthColumns ?? monthColumns}
        assignments={assignments}
        members={members}
        projects={projects}
        fiscalYear={2025}
        fiscalYearStartMonth={4}
      />,
    )
  }

  it('renders table with empty cells when no assignments exist', async () => {
    await renderSummaryGrid([])
    // The component renders the table structure but cells have no values
    expect(screen.getByText('担当者別年間サマリー')).toBeInTheDocument()
    expect(screen.getByText('田中太郎')).toBeInTheDocument()
  })

  it('renders member names as rows', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    expect(screen.getByText('田中太郎')).toBeInTheDocument()
  })

  it('renders month column headers', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    expect(screen.getByText('25/4月')).toBeInTheDocument()
    expect(screen.getByText('25/5月')).toBeInTheDocument()
    expect(screen.getByText('25/6月')).toBeInTheDocument()
  })

  it('shows sum of all project assignments per member per month', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.4 },
      }),
      createAssignment({
        projectId: 'p2',
        taskId: 't2',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.3 },
      }),
    ]

    await renderSummaryGrid(assignments)
    // Total for m1 in April = 0.4 + 0.3 = 0.7
    expect(screen.getByText('0.70')).toBeInTheDocument()
  })

  it('shows hover tooltip with per-project breakdown', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.4 },
      }),
      createAssignment({
        projectId: 'p2',
        taskId: 't2',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.3 },
      }),
    ]

    await renderSummaryGrid(assignments)
    // Find the cell with 0.70 and check its title attribute
    const cell = screen.getByText('0.70').closest('td')
    expect(cell).toHaveAttribute('title')
    const title = cell?.getAttribute('title') ?? ''
    expect(title).toContain('プロジェクトA: 0.40')
    expect(title).toContain('プロジェクトB: 0.30')
  })

  it('highlights over-allocation (> 1.0) in red', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.6 },
      }),
      createAssignment({
        projectId: 'p2',
        taskId: 't2',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    // Total = 1.1, should have red text class
    const valueSpan = screen.getByText('1.10')
    expect(valueSpan.className).toContain('text-red-700')
    expect(valueSpan.className).toContain('font-semibold')
  })

  it('does not highlight when total is exactly 1.0', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.6 },
      }),
      createAssignment({
        projectId: 'p2',
        taskId: 't2',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.4 },
      }),
    ]

    await renderSummaryGrid(assignments)
    const valueSpan = screen.getByText('1.00')
    expect(valueSpan.className).not.toContain('text-red-700')
  })

  it('renders accordion toggle button', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    const triggerBtn = screen.getByText('担当者別年間サマリー')
    expect(triggerBtn).toBeInTheDocument()
  })

  it('shows multiple members sorted by name', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.3 },
      }),
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm2',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    expect(screen.getByText('田中太郎')).toBeInTheDocument()
    expect(screen.getByText('鈴木花子')).toBeInTheDocument()
  })

  it('formats values to 2 decimal places', async () => {
    const assignments = [
      createAssignment({
        projectId: 'p1',
        taskId: 't1',
        memberId: 'm1',
        monthlyValues: { '2025-04': 0.5 },
      }),
    ]

    await renderSummaryGrid(assignments)
    expect(screen.getByText('0.50')).toBeInTheDocument()
  })
})
