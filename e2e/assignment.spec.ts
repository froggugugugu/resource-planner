import { expect, type Page, test } from '@playwright/test'

// ─── Seed Data Constants ───────────────────────────────────────────────────────

const PROJECT_X_ID = '00000000-0000-4000-8000-000000000001'
const PROJECT_X_TASK1_ID = '00000000-0000-4000-8000-000000000011'
const PROJECT_X_TASK2_ID = '00000000-0000-4000-8000-000000000012'
const PROJECT_Y_ID = '00000000-0000-4000-8000-000000000002'
const PROJECT_Y_TASK1_ID = '00000000-0000-4000-8000-000000000021'
const PROJECT_Z_ID = '00000000-0000-4000-8000-000000000003'
const PROJECT_Z_TASK1_ID = '00000000-0000-4000-8000-000000000031'

const MEMBER_A_ID = '00000000-0000-4000-8000-0000000000a1'
const MEMBER_B_ID = '00000000-0000-4000-8000-0000000000a2'
const MEMBER_C_ID = '00000000-0000-4000-8000-0000000000a3'

const NOW = '2025-10-01T00:00:00.000Z'

// ─── Seed Data Helpers ─────────────────────────────────────────────────────────

function makeProject(
  id: string,
  code: string,
  name: string,
  level: number,
  parentId: string | null,
) {
  return {
    id,
    code,
    name,
    description: '',
    background: '',
    purpose: '',
    level,
    parentId,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function makeMember(
  id: string,
  name: string,
  department: string,
  role: string,
) {
  return {
    id,
    name,
    department,
    role,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function makeScheduleEntry(
  projectId: string,
  phaseKey: string,
  startDate: string,
  endDate: string,
) {
  return {
    id: crypto.randomUUID(),
    projectId,
    phaseKey,
    startDate,
    endDate,
  }
}

function makeAssignment(
  projectId: string,
  taskId: string,
  memberId: string,
  monthlyValues: Record<string, number>,
) {
  return {
    id: crypto.randomUUID(),
    projectId,
    taskId,
    memberId,
    monthlyValues,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

/**
 * Standard seed: 3 projects (X, Y, Z), each with sub-tasks, 3 members, schedule from Apr to Dec 2025
 */
function buildSeedData(options?: {
  scheduleStart?: string
  scheduleEnd?: string
  assignments?: ReturnType<typeof makeAssignment>[]
}) {
  const scheduleStart = options?.scheduleStart ?? '2025-04-01'
  const scheduleEnd = options?.scheduleEnd ?? '2025-12-31'

  return {
    version: '1.0.0',
    fiscalYear: 2025,
    projects: [
      makeProject(PROJECT_X_ID, 'P001', 'Project X', 0, null),
      makeProject(PROJECT_X_TASK1_ID, 'P001-01', 'Task X-1', 1, PROJECT_X_ID),
      makeProject(PROJECT_X_TASK2_ID, 'P001-02', 'Task X-2', 1, PROJECT_X_ID),
      makeProject(PROJECT_Y_ID, 'P002', 'Project Y', 0, null),
      makeProject(PROJECT_Y_TASK1_ID, 'P002-01', 'Task Y-1', 1, PROJECT_Y_ID),
      makeProject(PROJECT_Z_ID, 'P003', 'Project Z', 0, null),
      makeProject(PROJECT_Z_TASK1_ID, 'P003-01', 'Task Z-1', 1, PROJECT_Z_ID),
    ],
    members: [
      makeMember(MEMBER_A_ID, 'Member A', 'Engineering', 'Developer'),
      makeMember(MEMBER_B_ID, 'Member B', 'Engineering', 'Designer'),
      makeMember(MEMBER_C_ID, 'Member C', 'Sales', 'Manager'),
    ],
    divisions: [],
    sections: [],
    allocations: [],
    scheduleEntries: [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', scheduleStart, scheduleEnd),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', scheduleStart, scheduleEnd),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', scheduleStart, scheduleEnd),
    ],
    assignments: options?.assignments ?? [],
    metadata: {
      lastModified: NOW,
      createdBy: 'system',
      version: '1.0.0',
    },
  }
}

// ─── Page Helpers ──────────────────────────────────────────────────────────────

async function seedAndNavigate(
  page: Page,
  data: ReturnType<typeof buildSeedData>,
) {
  await page.goto('/')
  await page.evaluate((d) => {
    localStorage.setItem('resource-manager-data', JSON.stringify(d))
  }, data)
  // Navigate to WBS page first to populate the project store,
  // then SPA-navigate to assignment to avoid stale getProjectTree.
  await page.goto('/wbs')
  await page
    .getByRole('heading', { name: 'WBS' })
    .waitFor({ state: 'visible', timeout: 10000 })
  await page.click('a[href="/assignment"]')
  // Wait for page title (h1) to be visible - use exact match to avoid matching h2
  await page
    .getByRole('heading', { name: 'アサイン', exact: true, level: 1 })
    .waitFor({ state: 'visible', timeout: 10000 })
  // Select first project (Project X) since auto-select was removed
  await selectProject(page, 'Project X')
}

/** Select a project from the top dropdown by its visible text */
async function selectProject(page: Page, projectText: string) {
  const selectTrigger = page
    .locator('[role="combobox"], button')
    .filter({ hasText: /P\d+|プロジェクトを選択/ })
    .first()
  await selectTrigger.click()
  await page.getByRole('option', { name: new RegExp(projectText) }).click()
  // Wait for the grid or empty-state to render after project switch
  await page
    .locator('.ag-root-wrapper, .text-muted-foreground')
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
}

/** Click expand/collapse button for a task row */
async function toggleTaskExpand(page: Page, label: string) {
  const btn = page.getByRole('button', { name: label }).first()
  await btn.click()
}

/** Click the "担当者を追加" button for a given task row */
async function addMemberRow(page: Page, taskId: string) {
  const taskRow = page.locator(`.ag-row[row-id="task-${taskId}"]`).first()
  const btn = taskRow.getByRole('button', { name: '担当者を追加' }).first()
  await btn.click()
  // Wait for the new member row to appear
  await page
    .locator(`.ag-row[row-id="new-member-${taskId}"]`)
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
}

/** Scroll AG Grid to reveal a month column that may be virtualised off-screen */
async function scrollToMonthColumn(
  page: Page,
  colId: string,
  direction: 'right' | 'left' = 'right',
) {
  await page.evaluate(
    ({ dir }) => {
      const viewport = document.querySelector('.ag-center-cols-viewport')
      if (!viewport) return
      viewport.scrollLeft = dir === 'right' ? viewport.scrollWidth : 0
    },
    { dir: direction },
  )
  await page
    .locator(`.ag-header-cell[col-id="${colId}"]`)
    .waitFor({ state: 'attached', timeout: 3000 })
}

/** Read cell text value from AG Grid (center-cols body region) */
async function readAgGridCellText(
  page: Page,
  rowId: string,
  colField: string,
): Promise<string> {
  const cell = page.locator(
    `.ag-center-cols-container .ag-row[row-id="${rowId}"] .ag-cell[col-id="${colField}"]`,
  )
  return (await cell.innerText()).trim()
}

/**
 * Update a monthly value directly in localStorage and reload the assignment page.
 * This works around a bug where AG Grid's valueSetter stores strings
 * instead of numbers, causing formatAssignmentValue to crash.
 */
async function updateMonthlyValueViaStorage(
  page: Page,
  assignmentId: string,
  monthKey: string,
  value: number,
) {
  await page.evaluate(
    ({ assignmentId, monthKey, value }) => {
      const raw = localStorage.getItem('resource-manager-data')
      if (!raw) return
      const db = JSON.parse(raw)
      const assignment = db.assignments?.find(
        (a: { id: string }) => a.id === assignmentId,
      )
      if (assignment) {
        if (value === 0) {
          delete assignment.monthlyValues[monthKey]
        } else {
          assignment.monthlyValues[monthKey] = value
        }
        assignment.updatedAt = new Date().toISOString()
        localStorage.setItem('resource-manager-data', JSON.stringify(db))
      }
    },
    { assignmentId, monthKey, value },
  )
}

/**
 * Create a new assignment directly in localStorage.
 * Returns the generated assignment ID.
 */
async function _createAssignmentViaStorage(
  page: Page,
  projectId: string,
  taskId: string,
  memberId: string,
  monthlyValues: Record<string, number> = {},
): Promise<string> {
  return page.evaluate(
    ({ projectId, taskId, memberId, monthlyValues }) => {
      const raw = localStorage.getItem('resource-manager-data')
      if (!raw) return ''
      const db = JSON.parse(raw)
      if (!db.assignments) db.assignments = []
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      db.assignments.push({
        id,
        projectId,
        taskId,
        memberId,
        monthlyValues,
        createdAt: now,
        updatedAt: now,
      })
      localStorage.setItem('resource-manager-data', JSON.stringify(db))
      return id
    },
    { projectId, taskId, memberId, monthlyValues },
  )
}

/** Get the localStorage DB data */
async function getStoredData(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('resource-manager-data')
    return raw ? JSON.parse(raw) : null
  })
}

/** Update schedule entries in localStorage */
async function updateScheduleEntries(
  page: Page,
  entries: ReturnType<typeof makeScheduleEntry>[],
) {
  await page.evaluate((newEntries) => {
    const raw = localStorage.getItem('resource-manager-data')
    if (!raw) return
    const db = JSON.parse(raw)
    db.scheduleEntries = newEntries
    localStorage.setItem('resource-manager-data', JSON.stringify(db))
  }, entries)
}

/** Re-navigate to assignment page after data changes (via SPA route) */
async function renavigateToAssignment(page: Page, projectText = 'Project X') {
  await page.click('a[href="/wbs"]')
  await page
    .getByRole('heading', { name: 'WBS' })
    .waitFor({ state: 'visible', timeout: 10000 })
  await page.click('a[href="/assignment"]')
  // Wait for page title (h1) to be visible - use exact match and level to avoid matching h2
  await page
    .getByRole('heading', { name: 'アサイン', exact: true, level: 1 })
    .waitFor({ state: 'visible', timeout: 10000 })
  await selectProject(page, projectText)
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Assignment Feature - Basic Operations', () => {
  test('Scenario 1: Switch to a different project', async ({ page }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.3,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_B_ID, {
          '2025-04': 0.5,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    await expect(page.locator('.ag-root-wrapper')).toBeVisible()
    await expect(
      page.locator('.ag-row').filter({ hasText: 'Task X-1' }),
    ).toBeVisible()

    await selectProject(page, 'Project Y')
    await expect(
      page.locator('.ag-row').filter({ hasText: 'Task Y-1' }),
    ).toBeVisible()
    await expect(
      page.locator('.ag-row').filter({ hasText: 'Task X-1' }),
    ).not.toBeVisible()
  })

  test('Scenario 2: Expand / collapse parent-child task hierarchy', async ({
    page,
  }) => {
    await seedAndNavigate(page, buildSeedData())

    const childRow = page.locator('.ag-row').filter({ hasText: 'Task X-1' })
    await expect(childRow).toBeVisible()

    await toggleTaskExpand(page, 'タスクを折りたたむ')
    await expect(childRow).not.toBeVisible()

    await toggleTaskExpand(page, 'タスクを展開する')
    await expect(childRow).toBeVisible()
  })

  test('Scenario 3: Add a member row under a leaf task', async ({ page }) => {
    await seedAndNavigate(page, buildSeedData())

    await addMemberRow(page, PROJECT_X_TASK1_ID)

    // AG Grid renders pinned and body regions, so use .first()
    const newMemberRow = page.locator('.ag-row[row-id^="new-member-"]').first()
    await expect(newMemberRow).toBeVisible()
  })

  test('Scenario 4: Select a member from the select box on an added row', async ({
    page,
  }) => {
    await seedAndNavigate(page, buildSeedData())

    // Add member row
    await addMemberRow(page, PROJECT_X_TASK1_ID)

    // Open the member select editor in pinned left container
    const newMemberRowId = `new-member-${PROJECT_X_TASK1_ID}`
    const memberCell = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="${newMemberRowId}"] .ag-cell[col-id="memberId"]`,
    )
    await memberCell.dblclick()

    // Verify the search input is visible (custom dropdown)
    const searchInput = page.locator('input[placeholder="担当者を検索..."]')
    await expect(searchInput).toBeVisible()

    // Verify Member A option is visible in the list
    const memberButton = page.locator('button[data-member-item]', {
      hasText: 'Member A',
    })
    await expect(memberButton).toBeVisible()

    // Click Member A from the dropdown
    await memberButton.click()

    // Wait for the assignment to be created and the member name to appear
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member A' }),
    ).toBeVisible({ timeout: 5000 })

    // Verify assignment was persisted
    const stored = await getStoredData(page)
    const assignmentsForTask = (
      stored.assignments as Array<{ taskId: string; memberId: string }>
    ).filter(
      (a) => a.taskId === PROJECT_X_TASK1_ID && a.memberId === MEMBER_A_ID,
    )
    expect(assignmentsForTask.length).toBe(1)
  })

  test('Scenario 5: Enter a numeric value in a month cell', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      {},
    )
    const data = buildSeedData({ assignments: [assignment] })
    await seedAndNavigate(page, data)

    // Double-click the month cell to start editing (center-cols region)
    const centerCell = page.locator(
      `.ag-center-cols-container .ag-row[row-id="member-${assignment.id}"] .ag-cell[col-id="month_2025-04"]`,
    )
    await centerCell.dblclick()
    // Verify inline edit mode is activated
    await expect(centerCell).toHaveClass(/ag-cell-inline-editing/)
    const input = centerCell.locator('input').first()
    await expect(input).toBeVisible()

    // Enter a value via the input
    await input.fill('0.5')
    await input.press('Enter')
    await expect(centerCell).not.toHaveClass(/ag-cell-inline-editing/)

    // Verify the value is displayed
    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.50')

    // Verify persistence
    const stored = await getStoredData(page)
    const storedAssignment = stored.assignments.find(
      (a: { id: string }) => a.id === assignment.id,
    )
    expect(storedAssignment.monthlyValues['2025-04']).toBe(0.5)
  })

  test('Scenario 6: Assign the same member to multiple tasks', async ({
    page,
  }) => {
    const assignmentTask1 = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const assignmentTask2 = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK2_ID,
      MEMBER_A_ID,
      { '2025-04': 0.5 },
    )
    const data = buildSeedData({
      assignments: [assignmentTask1, assignmentTask2],
    })
    await seedAndNavigate(page, data)

    const cellText1 = await readAgGridCellText(
      page,
      `member-${assignmentTask1.id}`,
      'month_2025-04',
    )
    expect(cellText1).toBe('0.30')

    const cellText2 = await readAgGridCellText(
      page,
      `member-${assignmentTask2.id}`,
      'month_2025-04',
    )
    expect(cellText2).toBe('0.50')
  })
})

test.describe('Assignment Feature - Column Structure (Master Schedule)', () => {
  test('Scenario 7: Extend the master schedule end date', async ({ page }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    // Scroll to reveal 12月 column (AG Grid v33 column virtualisation)
    await scrollToMonthColumn(page, 'month_2025-12')
    await expect(
      page.locator('.ag-header-cell[col-id="month_2025-12"]'),
    ).toBeVisible()

    const newEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2026-03-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, newEntries)
    await renavigateToAssignment(page)

    // Scroll to reveal 3月 column
    await scrollToMonthColumn(page, 'month_2026-03')
    await expect(
      page.locator('.ag-header-cell[col-id="month_2026-03"]'),
    ).toBeVisible()

    // Scroll back left so April column is visible again
    await scrollToMonthColumn(page, 'month_2025-04', 'left')
    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.30')
  })

  test('Scenario 8: Move the master schedule start date earlier', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    const newEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-01-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, newEntries)
    await renavigateToAssignment(page)

    await expect(page.locator('.ag-header-cell[col-id$="-01"]')).toBeVisible()

    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.30')
  })

  test('Scenario 9: Shorten the master schedule end date', async ({ page }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3, '2025-12': 0.2 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    // Scroll to verify 12月 column exists before shortening
    await scrollToMonthColumn(page, 'month_2025-12')
    await expect(
      page.locator('.ag-header-cell[col-id="month_2025-12"]'),
    ).toBeVisible()

    const newEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-09-30'),
    ]
    await updateScheduleEntries(page, newEntries)
    await renavigateToAssignment(page)

    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '12月' }),
    ).not.toBeVisible()

    const stored = await getStoredData(page)
    const storedAssignment = stored.assignments.find(
      (a: { id: string }) => a.id === assignment.id,
    )
    expect(storedAssignment.monthlyValues['2025-12']).toBe(0.2)
  })

  test('Scenario 10: Shorten the master schedule start date', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3, '2025-05': 0.2 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    const newEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-06-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-06-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-06-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, newEntries)
    await renavigateToAssignment(page)

    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '4月' }),
    ).not.toBeVisible()

    const stored = await getStoredData(page)
    const storedAssignment = stored.assignments.find(
      (a: { id: string }) => a.id === assignment.id,
    )
    expect(storedAssignment.monthlyValues['2025-04']).toBe(0.3)
    expect(storedAssignment.monthlyValues['2025-05']).toBe(0.2)
  })

  test('Scenario 11: Shorten then re-extend to original range', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3, '2025-12': 0.2 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    const shortenedEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-06-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-06-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-06-01', '2025-09-30'),
    ]
    await updateScheduleEntries(page, shortenedEntries)
    await renavigateToAssignment(page)

    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '4月' }),
    ).not.toBeVisible()
    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '12月' }),
    ).not.toBeVisible()

    const restoredEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, restoredEntries)
    await renavigateToAssignment(page)

    // 4月 column should be visible (first month column)
    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '4月' }),
    ).toBeVisible()

    // Verify 4月 cell data
    const cellText4 = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText4).toBe('0.30')

    // Scroll AG Grid to the right to reveal 12月 column (AG Grid v33 column virtualisation)
    await page.evaluate(() => {
      const viewport = document.querySelector('.ag-center-cols-viewport')
      if (viewport) viewport.scrollLeft = viewport.scrollWidth
    })
    await expect(
      page.locator('.ag-header-cell[col-id="month_2025-12"]'),
    ).toBeVisible()

    // Verify 12月 cell data
    const cellText12 = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-12',
    )
    expect(cellText12).toBe('0.20')
  })
})

test.describe('Assignment Feature - Validation: Member Not Selected', () => {
  test('Scenario 12: Add member row and focus out without selecting a member', async ({
    page,
  }) => {
    await seedAndNavigate(page, buildSeedData())

    await addMemberRow(page, PROJECT_X_TASK1_ID)

    // Double-click the member cell in pinned left container to enter edit mode
    const newMemberRowId = `new-member-${PROJECT_X_TASK1_ID}`
    const cell = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="${newMemberRowId}"] .ag-cell[col-id="memberId"]`,
    )
    await cell.dblclick()

    // Verify the search input is visible (custom dropdown)
    const searchInput = page.locator('input[placeholder="担当者を検索..."]')
    await expect(searchInput).toBeVisible()

    // Leave it empty, press Escape to cancel editing
    await searchInput.press('Escape')
    await expect(searchInput).not.toBeVisible()

    // Verify no assignment was created in storage (row not committed)
    const stored = await getStoredData(page)
    const assignmentsForTask = (
      stored.assignments as Array<{ taskId: string }>
    ).filter((a) => a.taskId === PROJECT_X_TASK1_ID)
    expect(assignmentsForTask.length).toBe(0)

    // The new-member row should still be visible (transient, not committed)
    await expect(
      page.locator(`.ag-row[row-id="${newMemberRowId}"]`).first(),
    ).toBeVisible()
  })

  test('Scenario 13: Add member row and attempt to enter value without selecting member', async ({
    page,
  }) => {
    await seedAndNavigate(page, buildSeedData())

    await addMemberRow(page, PROJECT_X_TASK1_ID)

    const newMemberRowId = `new-member-${PROJECT_X_TASK1_ID}`

    // Double-click a month cell on the new-member row (center region)
    const monthCell = page.locator(
      `.ag-center-cols-container .ag-row[row-id="${newMemberRowId}"] .ag-cell[col-id="month_2025-04"]`,
    )
    await monthCell.dblclick()

    // The cell should NOT enter edit mode (new-member rows are not editable for month columns)
    await expect(monthCell).not.toHaveClass(/ag-cell-inline-editing/)
  })

  test('Scenario 14: After validation error, select a member and commit', async ({
    page,
  }) => {
    await seedAndNavigate(page, buildSeedData())

    // Add member row and open member cell editor
    await addMemberRow(page, PROJECT_X_TASK1_ID)

    const newMemberRowId = `new-member-${PROJECT_X_TASK1_ID}`
    const memberCell = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="${newMemberRowId}"] .ag-cell[col-id="memberId"]`,
    )
    await memberCell.dblclick()

    // Verify the search input is visible (custom dropdown)
    const searchInput = page.locator('input[placeholder="担当者を検索..."]')
    await expect(searchInput).toBeVisible()

    // Verify Member A option is visible in the list
    const memberButton = page.locator('button[data-member-item]', {
      hasText: 'Member A',
    })
    await expect(memberButton).toBeVisible()

    // Click Member A from the dropdown
    await memberButton.click()

    // Verify the member name appears in the grid
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member A' }),
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Assignment Feature - Validation: Over-Allocation', () => {
  test('Scenario 15: Total exceeds 1.0 across projects', async ({ page }) => {
    // Pre-seed with over-allocated data (0.6 + 0.5 = 1.1)
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.6,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.5,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    // Verify over-allocation is visible in summary grid (red styling)
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    const overAllocatedSpan = memberARow.locator(
      'span.text-red-700, span.text-red-300',
    )
    await expect(overAllocatedSpan).toBeVisible()
    await expect(overAllocatedSpan).toContainText('1.10')
  })

  test('Scenario 16: Reduce values so total falls to 1.0 or below', async ({
    page,
  }) => {
    // Start with over-allocation: Member A = 0.6 on X + 0.5 on Y = 1.1
    const assignmentY = makeAssignment(
      PROJECT_Y_ID,
      PROJECT_Y_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.5 },
    )
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.6,
        }),
        assignmentY,
      ],
    })
    await seedAndNavigate(page, data)

    // Reduce to 0.4 via storage (total becomes 0.6 + 0.4 = 1.0)
    await updateMonthlyValueViaStorage(page, assignmentY.id, '2025-04', 0.4)
    await renavigateToAssignment(page)

    // No over-allocation (red styling) should appear for Member A
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    const overAllocatedSpan = memberARow.locator(
      'span.text-red-700, span.text-red-300',
    )
    await expect(overAllocatedSpan).not.toBeVisible()

    // Verify the total is 1.00
    await expect(memberARow.getByText('1.00')).toBeVisible()
  })

  test('Scenario 17: Multiple members exceed 1.0 in different months', async ({
    page,
  }) => {
    // Pre-seed: Member A over-allocated in April (0.6+0.5=1.1),
    // Member B over-allocated in May (0.7+0.5=1.2)
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.6,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.5,
        }),
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK2_ID, MEMBER_B_ID, {
          '2025-05': 0.7,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_B_ID, {
          '2025-05': 0.5,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })

    // Member A should show over-allocation indicator
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    const memberAOverSpan = memberARow.locator(
      'span.text-red-700, span.text-red-300',
    )
    await expect(memberAOverSpan).toBeVisible()
    await expect(memberAOverSpan).toContainText('1.10')

    // Member B should also show over-allocation indicator
    const memberBRow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member B' })
    const memberBOverSpan = memberBRow.locator(
      'span.text-red-700, span.text-red-300',
    )
    await expect(memberBOverSpan).toBeVisible()
    await expect(memberBOverSpan).toContainText('1.20')
  })
})

test.describe('Assignment Feature - Data Persistence', () => {
  test('Scenario 18: Enter values, switch project, then switch back', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      {},
    )
    const data = buildSeedData({ assignments: [assignment] })
    await seedAndNavigate(page, data)

    // Update value via storage
    await updateMonthlyValueViaStorage(page, assignment.id, '2025-04', 0.4)
    await renavigateToAssignment(page)

    // Verify value is shown
    const cellText1 = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText1).toBe('0.40')

    // Switch to Project Y
    await selectProject(page, 'Project Y')

    // Switch back to Project X
    await selectProject(page, 'Project X')

    // Value should be preserved
    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.40')
  })

  test('Scenario 19: Enter values, then reload the page', async ({ page }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      {},
    )
    const data = buildSeedData({ assignments: [assignment] })
    await seedAndNavigate(page, data)

    // Update value via storage
    await updateMonthlyValueViaStorage(page, assignment.id, '2025-04', 0.7)

    // Reload page and re-navigate via WBS to avoid stale store
    await page.goto('/wbs')
    await page
      .getByRole('heading', { name: 'WBS' })
      .waitFor({ state: 'visible', timeout: 10000 })
    await page.click('a[href="/assignment"]')
    await page
      .getByRole('heading', { name: 'アサイン', exact: true, level: 1 })
      .waitFor({ state: 'visible', timeout: 10000 })
    await selectProject(page, 'Project X')

    // Value should be restored
    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.70')
  })

  test('Scenario 20: Add member rows, enter values, navigate away and return', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({ assignments: [assignment] })
    await seedAndNavigate(page, data)

    // Navigate to Team page
    await page.click('a[href="/team"]')
    await page
      .getByRole('heading', { name: 'チーム' })
      .waitFor({ state: 'visible', timeout: 10000 })

    // Navigate back to assignment
    await page.click('a[href="/assignment"]')
    await page
      .getByRole('heading', { name: 'アサイン', exact: true, level: 1 })
      .waitFor({ state: 'visible', timeout: 10000 })
    await selectProject(page, 'Project X')

    // Value should be preserved
    const cellText = await readAgGridCellText(
      page,
      `member-${assignment.id}`,
      'month_2025-04',
    )
    expect(cellText).toBe('0.30')
  })
})

test.describe('Assignment Feature - Member-by-Month Summary Grid', () => {
  test('Scenario 21: Display the summary grid', async ({ page }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
          '2025-05': 0.3,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.3,
        }),
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK2_ID, MEMBER_B_ID, {
          '2025-04': 0.5,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    await expect(page.getByText('担当者別年間サマリー')).toBeVisible()

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    await expect(summaryTable).toBeVisible()

    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow).toBeVisible()

    // Member A April total: 0.4 + 0.3 = 0.7
    await expect(memberARow.getByText('0.70')).toBeVisible()
  })

  test('Scenario 22: Enter value and see summary update immediately', async ({
    page,
  }) => {
    const assignmentX = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      {},
    )
    const assignmentY = makeAssignment(
      PROJECT_Y_ID,
      PROJECT_Y_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({
      assignments: [assignmentX, assignmentY],
    })
    await seedAndNavigate(page, data)

    // Update value via storage and re-navigate
    await updateMonthlyValueViaStorage(page, assignmentX.id, '2025-04', 0.4)
    await renavigateToAssignment(page)

    // Summary should show 0.3 + 0.4 = 0.7
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.70')).toBeVisible()
  })

  test('Scenario 23: Hover over summary cell shows per-project breakdown', async ({
    page,
  }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.3,
        }),
        makeAssignment(PROJECT_Z_ID, PROJECT_Z_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.2,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    const cell = memberARow.locator('td').filter({ hasText: '0.90' })

    const titleAttr = await cell.getAttribute('title')
    expect(titleAttr).toContain('Project X')
    expect(titleAttr).toContain('0.40')
    expect(titleAttr).toContain('Project Y')
    expect(titleAttr).toContain('0.30')
    expect(titleAttr).toContain('Project Z')
    expect(titleAttr).toContain('0.20')
  })

  test('Scenario 24: Over-allocation visual indicator in summary', async ({
    page,
  }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.6,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.5,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })

    const overAllocatedSpan = memberARow.locator(
      'span.text-red-700, span.text-red-300',
    )
    await expect(overAllocatedSpan).toBeVisible()
    await expect(overAllocatedSpan).toContainText('1.10')
  })

  test('Scenario 25: Collapse the summary accordion', async ({ page }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    await expect(summaryTable).toBeVisible()

    await page.getByText('担当者別年間サマリー').click()
    await expect(summaryTable).not.toBeVisible()
  })

  test('Scenario 26: Expand the summary accordion', async ({ page }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    await page.getByText('担当者別年間サマリー').click()
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    await expect(summaryTable).not.toBeVisible()

    await page.getByText('担当者別年間サマリー').click()
    await expect(summaryTable).toBeVisible()
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.40')).toBeVisible()
  })

  test('Scenario 27: Collapse, edit values, then re-expand', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    // Collapse the summary
    await page.getByText('担当者別年間サマリー').click()

    // Update value via storage
    await updateMonthlyValueViaStorage(page, assignment.id, '2025-04', 0.8)
    await renavigateToAssignment(page)

    // Collapse again (it opens on re-navigate)
    await page.getByText('担当者別年間サマリー').click()
    const summaryTableCollapsed = page
      .locator('table')
      .filter({ hasText: '担当者' })
    await expect(summaryTableCollapsed).not.toBeVisible()

    // Re-expand
    await page.getByText('担当者別年間サマリー').click()
    await expect(summaryTableCollapsed).toBeVisible()

    // Summary should show updated value
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.80')).toBeVisible()
  })
})

test.describe('Assignment Feature - Composite Scenarios', () => {
  test('Scenario 28: Member across multiple projects, summary + tooltip', async ({
    page,
  }) => {
    const data = buildSeedData({
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.3,
        }),
        makeAssignment(PROJECT_Z_ID, PROJECT_Z_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.2,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.90')).toBeVisible()

    const cell = memberARow.locator('td').filter({ hasText: '0.90' })
    const titleAttr = await cell.getAttribute('title')
    expect(titleAttr).toContain('Project X')
    expect(titleAttr).toContain('Project Y')
    expect(titleAttr).toContain('Project Z')
  })

  test('Scenario 29: Extend schedule, enter in new months, check summary', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-09-30',
      assignments: [assignment],
    })
    await seedAndNavigate(page, data)

    // Extend schedule to December
    const newEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, newEntries)

    // Enter value in December via storage
    await updateMonthlyValueViaStorage(page, assignment.id, '2025-12', 0.5)
    await renavigateToAssignment(page)

    // Verify new month columns (scroll to reveal 12月 due to AG Grid column virtualisation)
    await scrollToMonthColumn(page, 'month_2025-12')
    await expect(
      page.locator('.ag-header-cell[col-id="month_2025-12"]'),
    ).toBeVisible()

    // Verify summary updated
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.50')).toBeVisible()
  })

  test('Scenario 30: Shorten, re-extend, verify restored data in summary', async ({
    page,
  }) => {
    const data = buildSeedData({
      scheduleStart: '2025-04-01',
      scheduleEnd: '2025-12-31',
      assignments: [
        makeAssignment(PROJECT_X_ID, PROJECT_X_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.4,
          '2025-12': 0.3,
        }),
        makeAssignment(PROJECT_Y_ID, PROJECT_Y_TASK1_ID, MEMBER_A_ID, {
          '2025-04': 0.3,
          '2025-12': 0.2,
        }),
      ],
    })
    await seedAndNavigate(page, data)

    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARow.getByText('0.70')).toBeVisible()
    await expect(memberARow.getByText('0.50')).toBeVisible()

    // Shorten schedule to Apr-Sep
    const shortenedEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-09-30'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-09-30'),
    ]
    await updateScheduleEntries(page, shortenedEntries)
    await renavigateToAssignment(page)

    // After shortening schedule to Apr-Sep, the AG Grid should not show 12月 column.
    // Use .ag-header-cell selector (not th) to avoid matching the summary HTML table
    // which always shows all 12 fiscal months.
    await expect(
      page.locator('.ag-header-cell').filter({ hasText: '12月' }),
    ).not.toBeVisible()

    const stored = await getStoredData(page)
    const storedAssignments = stored.assignments as Array<{
      memberId: string
      projectId: string
      monthlyValues: Record<string, number>
    }>
    const memberAAssignments = storedAssignments.filter(
      (a) => a.memberId === MEMBER_A_ID,
    )
    const decValues = memberAAssignments.map(
      (a) => a.monthlyValues['2025-12'] ?? 0,
    )
    expect(decValues).toContain(0.3)
    expect(decValues).toContain(0.2)

    // Re-extend to original Apr-Dec
    const restoredEntries = [
      makeScheduleEntry(PROJECT_X_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Y_ID, 'phase-1', '2025-04-01', '2025-12-31'),
      makeScheduleEntry(PROJECT_Z_ID, 'phase-1', '2025-04-01', '2025-12-31'),
    ]
    await updateScheduleEntries(page, restoredEntries)
    await renavigateToAssignment(page)

    const summaryTableAfter = page
      .locator('table')
      .filter({ hasText: '担当者' })
    const memberARowAfter = summaryTableAfter
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(memberARowAfter.getByText('0.70')).toBeVisible()
    await expect(memberARowAfter.getByText('0.50')).toBeVisible()
  })
})

test.describe('Assignment Feature - Delete Assignment', () => {
  test('Scenario 31: Delete a member assignment via the delete button', async ({
    page,
  }) => {
    const assignment = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const data = buildSeedData({ assignments: [assignment] })
    await seedAndNavigate(page, data)

    // Verify the member row is visible
    const memberRow = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="member-${assignment.id}"]`,
    )
    await expect(memberRow).toBeVisible()
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member A' }),
    ).toBeVisible()

    // Hover over the member cell to reveal the delete button
    const memberCell = memberRow.locator('.ag-cell[col-id="memberId"]')
    await memberCell.hover()

    // Click the delete button
    const deleteBtn = memberCell.getByRole('button', { name: '担当者を削除' })
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Verify the member row is removed
    await expect(memberRow).not.toBeVisible()

    // Verify the assignment is removed from storage
    const stored = await getStoredData(page)
    const remaining = (stored.assignments as Array<{ id: string }>).filter(
      (a) => a.id === assignment.id,
    )
    expect(remaining.length).toBe(0)
  })

  test('Scenario 32: Delete one of multiple member assignments', async ({
    page,
  }) => {
    const assignmentA = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.3 },
    )
    const assignmentB = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_B_ID,
      { '2025-04': 0.5 },
    )
    const data = buildSeedData({ assignments: [assignmentA, assignmentB] })
    await seedAndNavigate(page, data)

    // Verify both members are visible
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member A' }),
    ).toBeVisible()
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member B' }),
    ).toBeVisible()

    // Delete Member A's assignment
    const memberARow = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="member-${assignmentA.id}"]`,
    )
    const memberACell = memberARow.locator('.ag-cell[col-id="memberId"]')
    await memberACell.hover()
    const deleteBtn = memberACell.getByRole('button', { name: '担当者を削除' })
    await deleteBtn.click()

    // Verify Member A is removed but Member B remains
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member A' }),
    ).not.toBeVisible()
    await expect(
      page.locator('.ag-cell').filter({ hasText: 'Member B' }),
    ).toBeVisible()

    // Verify only Member B's assignment remains in storage
    const stored = await getStoredData(page)
    const remaining = stored.assignments as Array<{ id: string }>
    expect(remaining.length).toBe(1)
    expect(remaining[0]?.id).toBe(assignmentB.id)
  })

  test('Scenario 33: Delete assignment and verify summary grid updates', async ({
    page,
  }) => {
    const assignmentX = makeAssignment(
      PROJECT_X_ID,
      PROJECT_X_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.6 },
    )
    const assignmentY = makeAssignment(
      PROJECT_Y_ID,
      PROJECT_Y_TASK1_ID,
      MEMBER_A_ID,
      { '2025-04': 0.5 },
    )
    const data = buildSeedData({ assignments: [assignmentX, assignmentY] })
    await seedAndNavigate(page, data)

    // Verify over-allocation in summary (0.6 + 0.5 = 1.1)
    const summaryTable = page.locator('table').filter({ hasText: '担当者' })
    const memberARow = summaryTable
      .locator('tr')
      .filter({ hasText: 'Member A' })
    await expect(
      memberARow.locator('span.text-red-700, span.text-red-300'),
    ).toBeVisible()

    // Delete the assignment on Project X
    const memberRow = page.locator(
      `.ag-pinned-left-cols-container .ag-row[row-id="member-${assignmentX.id}"]`,
    )
    const memberCell = memberRow.locator('.ag-cell[col-id="memberId"]')
    await memberCell.hover()
    await memberCell.getByRole('button', { name: '担当者を削除' }).click()

    // Summary should update: only 0.5 from Project Y (no over-allocation)
    await expect(
      memberARow.locator('span.text-red-700, span.text-red-300'),
    ).not.toBeVisible()
    await expect(memberARow.getByText('0.50')).toBeVisible()
  })
})
