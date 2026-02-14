---
name: e2e-testing
description: Creates and maintains Playwright E2E tests for React SPAs. Applies when the user asks to write E2E tests, create scenario tests, automate user flows, or verify cross-feature behavior. Covers Page Object design, test data management, stability patterns, and reporting.
---

# E2E Testing

Playwright によるE2Eテストの実装スキル。ユーザー視点の主要シナリオを自動化し、リグレッションを防ぐ。
プロジェクト固有のシナリオ・Page Object・テストデータは [docs/development-patterns.md](../../../docs/development-patterns.md) を参照。

## テスト対象の方針

E2Eテストは **画面をまたぐユーザー操作フロー** を検証する。

- ✅ 対象: ページ遷移、フォーム操作→結果確認、機能間連携、データ永続化（リロード後の保持）
- ❌ 対象外: 個別バリデーションルール（単体テスト）、コンポーネント描画詳細（コンポーネントテスト）、サードパーティライブラリ内部の挙動

## 実装ワークフロー

1. **シナリオ定義** — 何を検証するか明確にする（[docs/development-patterns.md](../../../docs/development-patterns.md) のシナリオ一覧を参照）
2. **テストデータ準備** — ヘルパー関数でデータを注入（[docs/development-patterns.md](../../../docs/development-patterns.md) 参照）
3. **Page Objectで操作を記述** — テスト本体は「何を検証するか」に集中
4. **実行・確認** — `npm run e2e`
5. **レポート出力** — テストレポートをファイル出力し提示。トレース確認の操作方法・コマンドも提示

## ファイル配置

```
e2e/
├── <feature>.spec.ts         # テストファイル（機能単位）
├── fixtures/
│   └── test-data.ts          # テストデータ生成ヘルパー
└── pages/
    ├── BasePage.ts            # 共通操作（ナビゲーション、ダイアログ、トースト）
    └── <Feature>Page.ts       # 機能別Page Object
```

## ロケータ戦略（優先順）

1. `getByRole` — アクセシビリティベース（最も安定）
2. `getByLabel` — フォーム要素
3. `getByText` — 表示テキスト
4. `getByTestId` — 上記で困難な場合
5. CSSセレクタ — 複雑なUIコンポーネント（AG Grid等）の最終手段

## 安定性ルール

- Playwrightの自動待機を活用（`expect(...).toBeVisible()` 等のアサーション）
- **`waitForTimeout` は禁止**（フレーキーテストの原因）
- 各テストは `beforeEach` でデータを初期化（テスト間の実行順序に依存しない）
- ページ遷移後は `waitForLoadState('networkidle')` で安定化

## Page Object 設計原則

- **BasePage** に共通操作（ナビゲーション、ダイアログ開閉、トースト確認）を集約
- **機能別Page** は BasePage を継承し、その画面固有の操作を追加
- テスト本体からはPage Objectのメソッドのみ呼び出す（ロケータ直接操作は避ける）

## テストコマンド

```bash
npm run e2e                    # 全E2Eテスト
npm run e2e:ui                 # UIモード（デバッグ向き）
npx playwright test e2e/<file> # 特定ファイル
npx playwright test --grep "<テスト名>" # テスト名でフィルタ
npx playwright show-report     # レポート表示
```

## チェックリスト

- [ ] 各テストが独立（beforeEachでデータ初期化）
- [ ] Page Objectで操作を抽象化
- [ ] `waitForTimeout` を使っていない
- [ ] ロケータがRole/Label/Textベース
- [ ] データ永続化（リロード後）のテストがある
- [ ] 機能横断シナリオがある
- [ ] `npm run e2e` がCI環境でも安定してパスする
- [ ] E2Eテストはpre-pushフックのスコープ外であることを確認（手動または CI で実行）
