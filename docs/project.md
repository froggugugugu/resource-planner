# プロジェクト情報

## 概要

年度単位（4月〜翌年3月）で案件別・担当者別に月次リソース配分を管理するWebアプリケーション。
localStorageでJSON永続化し、将来的なRDB移行を考慮した設計。

主要機能: 案件管理（階層ツリー）/ 担当者管理 / アサイン管理 / WBS工数 / スケジュール（ガント）/ 技術タグ / スナップショット / レポート

## コマンド

```bash
npm run dev              # 開発サーバー（HMR）
npm run build            # 型チェック（tsc -b）+ 本番ビルド（vite build）
npm run lint             # Biome Lint
npm run format           # Biome Format
npm run check            # Biome Check（Lint + Format、自動修正あり）
npm run test             # Vitest（watchモード）
npm run test:run         # テスト一回実行
npm run test:coverage    # カバレッジ付きテスト（v8）
npm run e2e              # Playwright E2E
npm run e2e:ui           # Playwright E2E（UIモード）
npm run depcruise        # 依存方向チェック（dependency-cruiser）
npm run depcruise:report # 依存グラフSVG出力
npm run preview          # 本番ビルドのローカルプレビュー
```

Node.js 20以上が必要

## 技術スタック

| カテゴリ       | 技術                                          |
| -------------- | --------------------------------------------- |
| フレームワーク | React 19, TypeScript 5.9（Strict）, Vite 7    |
| スタイリング   | Tailwind CSS 4, shadcn/ui（Radix UI）, cmdk 1  |
| 状態管理       | Zustand 5（localStorage永続化）               |
| グリッド       | AG Grid 33                                    |
| ガントチャート | @svar-ui/react-gantt 2.5                      |
| チャート       | Recharts 2.15                                 |
| バリデーション | Zod 3.24, React Hook Form 7                   |
| ルーティング   | React Router DOM 7                            |
| ガイドツアー   | React Joyride 3                               |
| D&D            | react-dnd 16                                  |
| アイコン       | lucide-react                                  |
| コード品質     | Biome 2.3（リンター / フォーマッター）        |
| 依存方向チェック | dependency-cruiser 17                        |
| Git Hooks      | husky 9, lint-staged 16                       |
| テスト         | Vitest 4, Testing Library, Playwright 1.52    |
| モック         | MSW 2                                         |

## ルーティング

| パス                           | ページ           | 機能                         |
| ------------------------------ | ---------------- | ---------------------------- |
| `/`                            | → `/dashboard`   | デフォルトリダイレクト       |
| `/dashboard`                   | DashboardPage    | ダッシュボード               |
| `/team`                        | TeamPage         | チーム管理（組織階層・売上予算） |
| `/members`                     | → `/team`        | リダイレクト（後方互換）     |
| `/projects`                    | ProjectsPage     | 案件管理ツリー               |
| `/wbs`                         | WbsPage          | WBS工数管理                  |
| `/wbs-settings/:projectId`     | WbsSettingsPage  | WBS列設定（案件別）          |
| `/schedule`                    | SchedulePage     | ガントチャート               |
| `/schedule-settings/:projectId`| PhaseSettingsPage| 工程定義管理（案件別）       |
| `/assignment`                  | AssignmentPage   | アサイン管理                 |
| `/tech-tags`                   | TechTagsPage     | 技術タグ管理                 |
| `/reports`                     | ReportsPage      | レポート・CSV出力            |

## Zustandストア一覧

| ストア                   | 責務                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `app-store`              | 年度管理、テーマ、フォントサイズ、ローディング               |
| `projects-store`         | 案件CRUD、ツリー構造、コード自動採番                         |
| `members-store`          | 担当者CRUD、役割マスタ抽出、課別・未所属・年度内在籍セレクタ |
| `team-store`             | 部門・課CRUD（組織階層管理）                                 |
| `assignment-store`       | アサイン管理CRUD、月次配分値の更新、担当者別月次集計         |
| `efforts-store`          | WBS工数データ管理                                            |
| `schedule-store`         | スケジュールエントリ、工程依存関係                           |
| `schedule-settings-store`| 工程定義（最大10件、色・有効/無効・並び順）                  |
| `wbs-settings-store`     | WBS工数列設定（最大10列）                                    |
| `tech-tags-store`        | 技術タグCRUD、カテゴリ/サブカテゴリCRUD、マスタデータシード   |
| `tour-store`             | ガイドツアー状態管理（永続化なし）                            |

全ストアはZustand 5 + localStorage永続化（jsonStorage経由）。tour-storeのみ永続化なし。

## 制約事項

- DBは使わない（localStorageでJSON永続化）
- ダークモード対応必須
- パスエイリアス: `@/` → `src/`
- E2Eテストはブラウザー: Chromium、ベースURL: `http://localhost:5173`
- Git Hooks: pre-commitでlint-staged（Biome check）、pre-pushでlint + 型チェック + テスト + 依存方向チェック
