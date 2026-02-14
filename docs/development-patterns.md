# 開発パターン集

プロジェクト固有のコード規約・落とし穴・アンチパターンをまとめる。
汎用的なReact/TypeScript知識はここには含めない。
ルート定義・ストア一覧・ディレクトリ構成・スキーマ定義は `docs/project.md`, `docs/architecture.md`, `docs/data-model.md` を参照。

---

## 1. Zustand ストア

### 1.1 セレクタの鉄則

```typescript
// NG: セレクタ内で新しい配列/オブジェクトを生成 → 無限ループ
const items = useStore((s) => s.list.filter((x) => x.active))

// OK: 生データを取得し、useMemoで派生
const list = useStore((s) => s.list)
const items = useMemo(() => list.filter((x) => x.active), [list])
```

**検出**: `useXxxStore((s) => s.xxx.filter` / `.map` / `.sort` / `.reduce` がないか確認する。

### 1.2 ストア間の参照（getState()）

```typescript
// OK: 他ストアは getState() で参照（カスケード削除等）
deleteProject: (id) => {
  set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  const { assignments } = useAssignmentStore.getState()
  useAssignmentStore.getState().bulkDelete(
    assignments.filter((a) => a.projectId === id).map((a) => a.id)
  )
}
```

### 1.3 永続化アーキテクチャ（persist vs jsonStorage 混在）

本プロジェクトでは2つの永続化パターンが併存する:

| パターン | 対象ストア | ストレージキー | 特徴 |
|---------|-----------|---------------|------|
| Zustand `persist` + `createJSONStorage` | app-store（テーマ・年度等のUI状態） | `resource-manager-app` | 自動永続化 |
| 手動 `jsonStorage.load()` / `.save()` | projects, members, assignment, efforts, schedule, team, tech-tags 等 | `resource-manager-data`（単一キー） | アクション内で明示的に呼び出し |

```typescript
// パターンA: persist ミドルウェア（app-store）
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'resource-manager-app', storage: createJSONStorage(() => localStorage) },
  ),
)

// パターンB: jsonStorage（その他の業務データストア）
export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: jsonStorage.load().projects ?? [],
  addProject: (project) => {
    set((s) => ({ projects: [...s.projects, project] }))
    jsonStorage.save(get())
  },
}))
```

新規ストア追加時は、データの性質に応じてパターンを選択すること。

### 1.4 マイグレーション

`persist` ミドルウェアを使うストアの場合:

```typescript
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'store-key',
    version: 2,
    migrate: (persisted, version) => {
      const state = persisted as Record<string, unknown>
      if (version === 0) { /* v0→v1 */ }
      if (version === 1) { /* v1→v2 */ }
      return state
    },
  },
)
```

`jsonStorage` を使うストアの場合は `json-storage.ts` 内のロード処理でデフォルト値を設定する。

---

## 2. AG Grid (v33)

### 2.1 列定義のメモ化

```typescript
// OK: useMemoで列定義を安定化
const columnDefs = useMemo<ColDef<RowData>[]>(() => {
  const dynamicCols = items.map((item) => ({
    headerName: item.name,
    field: `dynamic_${item.id}`,
    editable: (params) => params.data?.isEditable ?? false,
  }))
  return [...staticCols, ...dynamicCols]
}, [items])

// NG: レンダーごとに新しい配列を生成 → 列がリセットされる
const columnDefs = [...]
```

### 2.2 valueSetter の型変換（Number() 必須）

AG Grid のテキストエディタは **string** 値を返す。数値フィールドでは必ず `Number()` で変換する。

```typescript
// NG: string値がそのまま保存され、cellRendererの .toFixed() がクラッシュ
valueSetter: (params) => {
  params.data.value = params.newValue  // string!
  return true
}

// OK: Number()で変換
valueSetter: (params) => {
  params.data.value = Number(params.newValue)
  return true
}
```

### 2.3 cellRenderer の防御的コーディング

```typescript
// OK: data未定義チェック必須（仮想スクロール時にnullあり）
function MyCellRenderer(props: ICellRendererParams) {
  if (!props.data) return null
  const value = Number(props.data.amount)  // 防御的にNumber()変換
  return <div className="flex h-full items-center">{value.toFixed(2)}</div>
}
```

### 2.4 v33 固有の注意点

- **DOM重複行**: ピン留め列（pinned-left）と本体（center-cols）で同じ `row-id` の行が重複レンダーされる
  - セレクタ例: `.ag-center-cols-container .ag-row[row-id="..."] .ag-cell[col-id="..."]`
  - Playwright等では `.first()` やコンテナ指定セレクタを使う
- **クラス名**: インライン編集中は `ag-cell-inline-editing`（`ag-cell-editing` ではない）
- **API変更**: `columnApi` は非推奨、`gridApi` 経由でアクセスする
- **テーマAPI**:
  - `headerForegroundColor` → `headerTextColor` にリネーム
  - `inputBorderColor` は存在しない → `inputBorder: { color: '...' }` を使用

---

## 3. 数値精度

### 3.1 工数値の丸め

| 対象 | 刻み | 関数 | 計算式 |
|------|------|------|--------|
| WBS工数 | 0.05刻み | `roundToHalf()` | `Math.round(value * 20) / 20` |
| アサイン配分 | 0.01刻み | `parseAssignmentInput()` | `Math.round(parsed * 100) / 100` |

表示はいずれも `.toFixed(2)` で小数第2位まで。

### 3.2 浮動小数点比較（epsilon使用）

```typescript
// NG: 浮動小数点の直接比較（0.1 + 0.2 !== 0.3 問題）
if (total === 1.0) { ... }

// OK: イプシロンで比較
if (Math.abs(total - 1.0) < 0.001) { ... }
```

---

## 4. 年度月変換

年度月（`fiscalMonth`）と暦月（`calendarMonth`）の変換:

```
fiscalMonth 1=4月, 2=5月, ..., 9=12月, 10=1月, 11=2月, 12=3月
```

月次データのキーは `"YYYY-MM"` 形式（暦月ベース）で統一されている。
変換関数は `src/shared/types/database.ts` に定義:
- `fiscalMonthToCalendarMonth()`: 年度月 → 暦月
- `calendarMonthToFiscalMonth()`: 暦月 → 年度月
- `getFiscalMonthLabel()`: 年度月 → `"4月"` 形式のラベル

**注意**: UIの表示ラベルと内部データの月番号が一致しているか常に確認すること。

---

## 5. データモデル変更時の規約

### DatabaseSchema への追加

```typescript
// OK: 後方互換のため optional で追加（既存データの読み込みが壊れない）
newField: z.array(NewSchema).optional()

// NG: required で追加 → 既存データのパースが失敗する
newField: z.array(NewSchema)
```

### json-storage.ts のマイグレーション

`jsonStorage` パターンのストアでは、`load()` 時にデフォルト値を設定する:

```typescript
const data = jsonStorage.load()
const newItems = data.newField ?? []  // undefinedの場合のフォールバック
```

### Zodスキーマ設計パターン

```typescript
// データスキーマ（永続化用）
export const ProjectSchema = z.object({ id: z.string().uuid(), ... })
export type Project = z.infer<typeof ProjectSchema>

// フォーム用（id, timestamp除外）
export const CreateProjectSchema = ProjectSchema.omit({ id: true, createdAt: true })

// 部分更新用
export const UpdateProjectSchema = CreateProjectSchema.partial().required({ id: true })
```

---

## 6. UI 規約

### ダークモード

```typescript
// OK: shadcn/ui のセマンティックカラー（自動対応）
className="text-foreground bg-background border-border"

// OK: Tailwind の dark: プレフィックス
className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"

// NG: ハードコードされた色値（ダークモードで見えなくなる）
style={{ backgroundColor: '#f0f0f0' }}
// → AG Grid の getRowStyle 等でやむを得ない場合は CSS変数を使う
```

### コンポーネント設計

- **Presentational**: props のみに依存、ストアを直接参照しない
- **Container**: ストア/hooks を使用、pages ディレクトリまたは feature のトップに配置
- `components/` 配下で `useXxxStore` を直接呼ぶ場合は Container であることを意識する

### shadcn/ui コンポーネント追加

```bash
npx shadcn@latest add <component-name>
```

追加後は `src/shared/components/ui/` に配置される。

### 条件付きスタイル

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'rounded-lg border p-4 transition-colors',
  isActive && 'border-primary bg-primary/5',
  isError && 'border-destructive bg-destructive/5',
)}>
```

---

## 7. E2E テストパターン

### テストデータ注入

全業務データは **単一の localStorage キー** `resource-manager-data` で管理される。

```typescript
// シードデータを構築し、localStorageに注入
const seedData = {
  version: '1.0.0',
  fiscalYear: 2025,
  projects: [...],
  members: [...],
  assignments: [...],
  metadata: { lastModified: new Date().toISOString(), createdBy: 'test', version: '1.0.0' },
}

await page.evaluate((d) => {
  localStorage.setItem('resource-manager-data', JSON.stringify(d))
}, seedData)
```

### AG Grid 操作ヘルパー（コンテナ指定セレクタ）

AG Grid はピン留め列で DOM 行が重複するため、コンテナを指定する:

```typescript
// Center-cols のセル
const cell = page.locator(
  '.ag-center-cols-container .ag-row[row-id="0"] .ag-cell[col-id="value"]'
)

// Pinned-left のセル
const cell = page.locator(
  '.ag-pinned-left-cols-container .ag-row[row-id="0"] .ag-cell[col-id="name"]'
)
```

テキストマッチの注意: `hasText: '1月'` は "1月", "11月", "12月" にもマッチするため、`col-id` セレクタを使うこと。

### ナビゲーション回避策

Zustand ストアと `useMemo` の組み合わせで初回ナビゲーション時にデータが古い場合がある:

```typescript
// OK: /wbs 経由で SPA ナビゲーション
await page.goto('/wbs')
await page.getByRole('link', { name: /アサイン/ }).click()
```

---

## 8. デザインシステム

### 8.1 参照するデザインシステム

UI/UX実装時は以下のデザインシステム・ガイドラインに準拠する。

参考とする全体デザインシステム：https://www.digital.go.jp/policies/servicedesign/designsystem

> **出典表示（利用規約準拠）**
>
> 本プロジェクトのカラートークン（プライマリカラー・セマンティックカラー）およびスペーシング設計は、
> デジタル庁デザインシステムウェブサイト https://design.digital.go.jp/dads/ のコンテンツを参考に加工して作成しています。
> デジタル庁が本プロジェクトのUIを作成・承認したものではありません。
>
> 利用規約: https://design.digital.go.jp/dads/introduction/notices/

| リソース | URL | 用途 |
| ------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| shadcn/ui    | [ui.shadcn.com](https://ui.shadcn.com/)           | UIコンポーネントライブラリ（本プロジェクトの基盤）          |
| Radix UI     | [radix-ui.com](https://www.radix-ui.com/)         | shadcn/uiの基盤プリミティブ（アクセシビリティ仕様）        |
| Tailwind CSS | [tailwindcss.com](https://tailwindcss.com/docs)   | ユーティリティファーストCSS（スペーシング・カラー・レスポンシブ） |
| WCAG 2.1     | [w3.org](https://www.w3.org/TR/WCAG21/)           | アクセシビリティ基準（AA準拠を目標）                        |
| Lucide Icons | [lucide.dev](https://lucide.dev/icons/)           | アイコンライブラリ                                          |

### 8.2 カラートークン

本プロジェクトではshadcn/uiのCSS変数ベースのカラートークンを使用する。

```css
/* src/index.css で定義済み */
--background    /* 背景色 */
--foreground    /* 前景色（テキスト） */
--primary       /* プライマリカラー */
--secondary     /* セカンダリカラー */
--muted         /* ミュートカラー */
--accent        /* アクセントカラー */
--destructive   /* 破壊的操作の色 */
--border        /* ボーダー色 */
--ring          /* フォーカスリング色 */
```

### 8.3 スペーシングスケール

Tailwind CSSのデフォルトスケールに従う（`p-1` = 4px, `p-2` = 8px, `p-4` = 16px, ...）。
マジックナンバーの直指定は禁止。

### 8.4 コンポーネント追加手順

```bash
npx shadcn@latest add <component-name>
```

追加後は `src/shared/components/ui/` に配置される。Radix UIプリミティブのアクセシビリティ仕様を確認すること。

### 8.5 アイコン使用規約

```typescript
import { IconName } from 'lucide-react'

// OK: サイズはTailwindクラスまたはsize propで指定
<IconName className="h-4 w-4" />
<IconName size={16} />

// NG: styleでハードコード
<IconName style={{ width: '14px' }} />
```

---

## 9. 過去の問題事例

| 問題 | 原因 | 対策 |
| ---- | ---- | ---- |
| AG Grid で `.toFixed()` がクラッシュ | valueSetter が string 値をそのまま保存 | `Number()` で変換 |
| Zustand ストアで無限ループ | セレクタ内で `.filter()` / `.map()` | `useMemo` で派生 |
| 年度月の表示ずれ | fiscalMonth / calendarMonth の混同 | 変換関数を必ず経由 |
| ダークモードで文字が見えない | ハードコードされた色値 | セマンティックカラー使用 |
| 既存データ読み込みエラー | 新フィールドを required で追加 | optional + デフォルト値 |
| DOM 要素の重複選択（E2E） | AG Grid の pinned/body 重複行 | コンテナ指定セレクタ使用 |
| タイムゾーンでテスト失敗 | `new Date('YYYY-MM-DD')` が UTC 解釈 | `new Date(year, month, day)` を使用 |
