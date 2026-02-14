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
    projects: [makeProject(PROJECT_ID, 'P001', 'テストプロジェクト', 0, null)],
    members: [],
    metadata: {
      lastModified: NOW,
      createdBy: 'e2e-test',
      version: '1.0.0',
    },
  }
  return seedData
}

test.describe('WBS設定: デフォルト表示名「区分」', () => {
  test.beforeEach(async ({ page }) => {
    const seedData = await seedDatabase()
    await page.goto('/')
    await page.evaluate((d) => {
      localStorage.setItem('resource-manager-data', JSON.stringify(d))
    }, seedData)
    await page.reload()
  })

  test('WBS設定ダイアログで、デフォルト列の表示名が「区分」になっている', async ({
    page,
  }) => {
    // WBSページに移動（ナビゲーションワークアラウンド）
    await page.goto('/wbs')
    await page.getByRole('link', { name: 'WBS' }).click()

    // プロジェクトを選択
    await page
      .getByRole('button', { name: 'プロジェクトを選択してください' })
      .click()
    await page.getByText('テストプロジェクト').click()

    // WBS設定ボタンをクリック
    await page.getByRole('button', { name: 'WBS設定' }).click()

    // ダイアログが開いていることを確認
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // デフォルト列の表示名が「区分」であることを確認
    // 最初の3列が有効で、表示名が「区分」であることを確認
    const firstColumnNameInput = dialog.locator('input[type="text"]').first()
    await expect(firstColumnNameInput).toHaveValue('区分')
  })
})
