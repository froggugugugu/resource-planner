# アーキテクチャ

## エントリーポイント

`src/main.tsx` → `src/App.tsx`

プロバイダー構成（外側から）:

1. `StrictMode`（React）
2. `QueryClientProvider`（React Query、staleTime: 5分、retry: 1）
3. `BrowserRouter`（React Router）

## ディレクトリ構成（Feature-Sliced Design）

```
src/
├── main.tsx               # エントリーポイント（プロバイダー構成）
├── App.tsx                # ルーティング定義
├── index.css              # グローバルスタイル（Tailwind CSS）
├── vite-env.d.ts          # Vite型定義
│
├── features/
│   ├── projects/          # 案件管理（階層ツリー + WBS）
│   │   ├── components/    # ProjectTree, ProjectDialog, ProjectTreeGrid, TechTagSelectDialog
│   │   ├── pages/         # ProjectsPage, WbsPage, WbsSettingsPage
│   │   └── utils/         # code-generator, tree-utils（+ リエクスポート: effort-utils）
│   │
│   ├── members/           # 担当者管理
│   │   ├── components/    # MemberDialog
│   │   └── pages/         # MembersPage
│   │
│   ├── assignment/        # アサイン管理（タスク×担当者の月次配分）
│   │   ├── components/    # AssignmentTreeGrid, MemberSummaryGrid, MemberCellEditor
│   │   ├── pages/         # AssignmentPage
│   │   └── utils/         # assignment-utils（+ リエクスポート: project-display, member-filter）
│   │
│   ├── schedule/          # スケジュール管理（ガントチャート）
│   │   ├── components/    # ScheduleGantt, PhaseRow, DependencyDialog
│   │   ├── pages/         # SchedulePage, PhaseSettingsPage
│   │   └── utils/         # svar-gantt-utils + __tests__/
│   │
│   ├── team/              # チーム管理（組織階層・売上予算）
│   │   ├── components/    # TeamMemberDialog, NameInputDialog
│   │   ├── pages/         # TeamPage
│   │   └── utils/         # リエクスポート: budget-utils
│   │
│   ├── tech-tags/         # 技術タグ管理（カテゴリ/サブカテゴリ対応）
│   │   ├── components/    # TechTagDialog
│   │   ├── pages/         # TechTagsPage
│   │   └── utils/         # リエクスポート: tech-tag-master, tag-filter
│   │
│   ├── dashboard/         # ダッシュボード（チャート・サマリー）
│   │   ├── components/    # ProjectAssignmentChart, MemberAssignmentChart, BudgetComparisonChart, UtilizationRateChart, SkillDistributionChart
│   │   ├── pages/         # DashboardPage
│   │   └── utils/         # dashboard-utils（集計・充足率・スキル分布）
│   │
│   ├── guide-tour/        # 操作ガイダンスツアー（React Joyride）
│   │   ├── components/    # TourProvider, TourTooltip, TourMenuButton
│   │   ├── steps/         # ツアーステップ定義（global, dashboard, team, projects, wbs, schedule, assignment）
│   │   └── utils/         # tour-route-map + __tests__/
│   │
│   └── reports/           # レポート・スナップショット
│       ├── components/    # DataExport, SnapshotHistory
│       └── pages/         # ReportsPage
│
├── shared/
│   ├── ag-grid-theme.ts   # AG Grid共通テーマ（shadcn/ui準拠、ダークモード自動対応）
│   ├── components/
│   │   ├── Layout.tsx     # アプリ全体のレイアウト（ナビゲーション含む）
│   │   └── ui/            # shadcn/uiコンポーネント（15個）
│   │       ├── badge, button, card, collapsible, combobox, command
│   │       ├── dialog, input, label, popover
│   │       ├── select, table, toast, toaster
│   │       └── theme-color-picker
│   ├── data/
│   │   └── tech-tag-master.ts  # 技術タグマスタデータ（17カテゴリ・199タグ）
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-theme-color.ts
│   ├── types/             # Zodスキーマ定義（13ファイル + index.ts）
│   └── utils/             # 共有ユーティリティ
│       ├── tag-filter.ts       # タグ検索フィルタ
│       ├── project-display.ts  # プロジェクト名表示（確度付き）
│       ├── member-filter.ts    # メンバー部門・課フィルタ
│       ├── budget-utils.ts     # 売上予算・見込売上計算
│       └── effort-utils.ts     # WBS工数計算
│
├── infrastructure/
│   ├── storage/           # json-storage, snapshot-storage（+ index.ts）
│   └── validation/        # schemas（+ index.ts）
│
├── stores/                # Zustand状態管理（11ストア + index.ts）
│
├── test/                  # テストセットアップ（setup.ts のみ）
│
└── lib/
    └── utils.ts           # cn()ヘルパー（clsx + tailwind-merge）
```

## テスト構成

テストはコロケーション方式で各モジュールの `__tests__/` ディレクトリに配置。

### ストアテスト（`src/stores/__tests__/`）

| テストファイル              | 対象                                           |
| --------------------------- | ---------------------------------------------- |
| `assignment-store.test.ts`  | assignment-storeのCRUD・月次集計               |
| `members-store.test.ts`     | members-storeのCRUD・役割マスタ・セレクタ      |
| `projects-store.test.ts`    | projects-storeのCRUD・ツリー管理               |
| `team-store.test.ts`        | team-storeのCRUD・カスケード削除               |

### フィーチャーテスト（各 `features/*/utils/__tests__/`, `features/*/components/__tests__/`）

| テストファイル                    | 配置先                                    | 対象                                           |
| --------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `assignment-utils.test.ts`        | `features/assignment/utils/__tests__/`    | assignment-utilsのユーティリティ関数           |
| `assignment-tree-logic.test.ts`   | `features/assignment/utils/__tests__/`    | ツリー構造のロジック                           |
| `assignment-components.test.tsx`  | `features/assignment/components/__tests__/`| AssignmentTreeGrid等のコンポーネントテスト     |
| `code-generator.test.ts`         | `features/projects/utils/__tests__/`      | プロジェクトコード自動採番                     |
| `dashboard-utils.test.ts`        | `features/dashboard/utils/__tests__/`     | ダッシュボードユーティリティ                   |
| `tech-tag-category.test.ts`      | `features/tech-tags/utils/__tests__/`     | TechTagCategory/SubCategoryスキーマ・ストアCRUD |
| `demo-data.test.ts`              | `features/reports/data/__tests__/`        | デモデータ生成                                 |
| `schedule-schemas.test.ts`       | `features/schedule/utils/__tests__/`      | スケジュール関連Zodスキーマ                    |
| `schedule-store.test.ts`         | `features/schedule/utils/__tests__/`      | schedule-storeのCRUD・依存関係                 |
| `svar-gantt-utils.test.ts`       | `features/schedule/utils/__tests__/`      | ガントチャートデータ変換ユーティリティ         |
| `tour-route-map.test.ts`         | `features/guide-tour/utils/__tests__/`    | ツアールートマッピング                         |

### 共有レイヤーテスト

| テストファイル              | 配置先                                  | 対象                                           |
| --------------------------- | --------------------------------------- | ---------------------------------------------- |
| `budget-utils.test.ts`      | `shared/utils/__tests__/`               | 売上予算・見込売上・適用単価の計算ロジック     |
| `effort-utils.test.ts`      | `shared/utils/__tests__/`               | WBS工数計算ユーティリティ                      |
| `tag-filter.test.ts`        | `shared/utils/__tests__/`               | タグ検索フィルタ                               |
| `combobox.test.tsx`         | `shared/components/ui/__tests__/`       | Comboboxコンポーネント                         |
| `schemas.test.ts`           | `shared/types/__tests__/`               | Zodバリデーションスキーマ                      |
| `team-schemas.test.ts`      | `shared/types/__tests__/`               | Division/Section/UnitPriceEntry/MemberSchema   |

### インフラテスト

| テストファイル              | 配置先                                  | 対象                                           |
| --------------------------- | --------------------------------------- | ---------------------------------------------- |
| `snapshot-storage.test.ts`  | `infrastructure/storage/__tests__/`     | スナップショット保存・復元・クォータ管理       |
| `database-utils.test.ts`    | `infrastructure/storage/__tests__/`     | データベーススキーマ・マイグレーション         |
| `validation-schemas.test.ts`| `infrastructure/validation/__tests__/`  | フォームバリデーションスキーマ                 |

## ドキュメント責務

| ファイル | 責務 |
|---------|------|
| `docs/project.md` | ルート定義、ストア一覧、コマンド、技術スタック |
| `docs/architecture.md` | ディレクトリ構成、テスト一覧、ドキュメント責務 |
| `docs/data-model.md` | Zodスキーマ定義、フィールド仕様、バリデーションルール |
| `docs/development-patterns.md` | コード規約、落とし穴、アンチパターン、E2Eテストパターン |

### E2Eテスト（`e2e/`）

| テストファイル               | 対象                                 |
| ---------------------------- | ------------------------------------ |
| `assignment.spec.ts`         | アサイン管理の主要ユーザーフロー     |
| `dashboard.spec.ts`          | ダッシュボード・チャート・セレクタ   |
| `debug-gantt-dom.spec.ts`    | ガントチャートDOM構造のデバッグ       |
| `guide-tour.spec.ts`         | ガイドツアー機能（メニュー・ステップ遷移・終了操作） |
| `navigation.spec.ts`         | ナビゲーション・ルーティングの検証   |
| `team.spec.ts`               | チーム管理・組織階層のユーザーフロー |
| `uiux-adjustments.spec.ts`   | UI/UX調整（テーマ切り替え・カラートークン・レイアウト・ThemeColorPicker） |
