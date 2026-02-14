import { expect, test } from '@playwright/test'

// ─── Seed Data Constants ───────────────────────────────────────────────────────

const NOW = '2025-10-01T00:00:00.000Z'

const PROJECT_ID = '00000000-0000-4000-8000-000000000001'

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
    status: 'not_started',
    confidence: level === 0 ? 'S' : null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

/**
 * シードデータを注入する
 */
async function seedDatabase() {
  const seedData = {
    version: '1.0.0',
    fiscalYear: 2025,
    projects: [makeProject(PROJECT_ID, 'P001', '親プロジェクト', 0, null)],
    members: [],
    metadata: {
      lastModified: NOW,
      createdBy: 'e2e-test',
      version: '1.0.0',
    },
  }
  return seedData
}

test.describe('ProjectDialog: タスク追加時のUI変更', () => {
  test.beforeEach(async ({ page }) => {
    const seedData = await seedDatabase()
    await page.goto('/')
    await page.evaluate((d) => {
      localStorage.setItem('resource-manager-data', JSON.stringify(d))
    }, seedData)
    await page.reload()
  })

  test('プロジェクト（level=0）追加時: タイトルは「新規プロジェクト」、ラベルは「プロジェクト名」、案件確度フィールドあり', async ({
    page,
  }) => {
    // Projectsページに移動（プロジェクト追加はこちらから）
    await page.goto('/projects')
    await page.waitForSelector('button:has-text("プロジェクトを追加")')

    // プロジェクト追加ダイアログを開く
    await page.getByRole('button', { name: 'プロジェクトを追加' }).click()

    // ダイアログが開いていることを確認
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // タイトルが「新規プロジェクト」であることを確認
    await expect(dialog.getByText('新規プロジェクト')).toBeVisible()

    // ラベルが「プロジェクト名」であることを確認
    await expect(dialog.getByText('プロジェクト名')).toBeVisible()

    // 案件確度フィールドが表示されていることを確認
    await expect(dialog.getByText('案件確度')).toBeVisible()

    // ステータスフィールドが表示されていることを確認
    await expect(dialog.getByText('ステータス')).toBeVisible()
  })

  test('タスク（level=1）追加時: タイトルは「新規タスク」、ラベルは「タスク名」、案件確度フィールドなし', async ({
    page,
  }) => {
    // Projectsページに移動
    await page.goto('/projects')
    await page.waitForSelector('text=親プロジェクト')

    // プロジェクト行にホバーして子タスク追加ボタンをクリック
    const projectRow = page
      .getByText('親プロジェクト')
      .locator('xpath=ancestor::div[@role="treeitem"]')
    await projectRow.hover()

    // 子タスク追加ボタンをクリック
    await projectRow.getByRole('button', { name: '子タスクを追加' }).click()

    // ダイアログが開いていることを確認
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // タイトルが「新規タスク」であることを確認
    await expect(dialog.getByText('新規タスク')).toBeVisible()

    // ラベルが「タスク名」であることを確認
    await expect(dialog.getByText('タスク名')).toBeVisible()

    // 案件確度フィールドが非表示であることを確認
    await expect(dialog.queryByText('案件確度')).not.toBeVisible()

    // ステータスフィールドは表示されていることを確認
    await expect(dialog.getByText('ステータス')).toBeVisible()
  })

  test('プロジェクト（level=0）編集時: タイトルは「プロジェクトを編集」', async ({
    page,
  }) => {
    // Projectsページに移動
    await page.goto('/projects')
    await page.waitForSelector('text=親プロジェクト')

    // プロジェクト行をダブルクリックして編集ダイアログを開く
    const projectRow = page.getByText('親プロジェクト')
    await projectRow.dblclick()

    // ダイアログが開いていることを確認
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // タイトルが「プロジェクトを編集」であることを確認
    await expect(dialog.getByText('プロジェクトを編集')).toBeVisible()

    // 案件確度フィールドが表示されていることを確認（level=0）
    await expect(dialog.getByText('案件確度')).toBeVisible()
  })
})
