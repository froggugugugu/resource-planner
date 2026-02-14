# データモデル

Zodスキーマ定義は `src/shared/types/` に配置。
フォームバリデーションは `src/infrastructure/validation/schemas.ts` に配置。

## スキーマ詳細

### Project（`project.ts`）

案件の階層ツリー構造。最大5レベルまで対応。

| フィールド    | 型                                       | 備考                                 |
| ------------- | ---------------------------------------- | ------------------------------------ |
| `id`          | `uuid`                                   |                                      |
| `code`        | `string`（1〜50文字）                    | 自動採番（P001, P001-01, P001-01-001） |
| `name`        | `string`（1〜200文字）                   |                                      |
| `description` | `string`（最大2000文字、任意）           |                                      |
| `background`  | `string`（最大2000文字、任意）           | 案件背景                             |
| `purpose`     | `string`（最大2000文字、任意）           | 案件目的                             |
| `parentId`    | `uuid \| null`                           | 親案件ID                             |
| `level`       | `number`（0〜5）                         | 0=プロジェクト、1〜5=階層レベル      |
| `status`      | `not_started \| active \| completed`     | デフォルト: `not_started`            |
| `confidence`  | `S \| A \| B \| C \| null`              | 案件確度（S=確定、A=高、B=中、C=低） |
| `createdAt`   | `datetime`                               |                                      |
| `updatedAt`   | `datetime`                               |                                      |

派生型: `CreateProject`（id/日時を除外）、`UpdateProject`（idのみ必須、他は任意）、`ProjectTreeNode`（children/depth付きUI表示用）

### Division（`division.ts`）

組織階層の部門。

| フィールド   | 型                           | 備考                       |
| ------------ | ---------------------------- | -------------------------- |
| `id`         | `uuid`                       |                            |
| `name`       | `string`（1〜100文字）       |                            |
| `sortOrder`  | `number`（0以上の整数）      | 並び順                     |
| `createdAt`  | `datetime`                   |                            |
| `updatedAt`  | `datetime`                   |                            |

派生型: `CreateDivision`（id/日時を除外）、`UpdateDivision`（idのみ必須、他は任意）

### Section（`section.ts`）

組織階層の課。部門に所属。

| フィールド   | 型                           | 備考                       |
| ------------ | ---------------------------- | -------------------------- |
| `id`         | `uuid`                       |                            |
| `divisionId` | `uuid`                       | 所属部門ID                 |
| `name`       | `string`（1〜100文字）       |                            |
| `sortOrder`  | `number`（0以上の整数）      | 並び順                     |
| `createdAt`  | `datetime`                   |                            |
| `updatedAt`  | `datetime`                   |                            |

派生型: `CreateSection`（id/日時を除外）、`UpdateSection`（idのみ必須、他は任意）

### UnitPriceEntry（`member.ts`内で定義）

単価履歴エントリ。メンバーの月額単価変更履歴。

| フィールド      | 型                           | 備考                              |
| --------------- | ---------------------------- | --------------------------------- |
| `effectiveFrom` | `string`（YYYY-MM形式）      | 適用開始年月                      |
| `amount`        | `number`（0以上）            | 月額単価（万円）                  |

### Member（`member.ts`）

担当者情報。課への所属、開始/終了日、単価履歴を持つ。

| フィールド         | 型                           | 備考                                     |
| ------------------ | ---------------------------- | ---------------------------------------- |
| `id`               | `uuid`                       |                                          |
| `name`             | `string`（1〜100文字）       |                                          |
| `department`       | `string`（最大100文字、任意）| 後方互換用（Phase 3で削除予定）          |
| `sectionId`        | `uuid \| null`               | 課ID（null = 未所属）                    |
| `role`             | `string`（最大100文字）      | 役割                                     |
| `isActive`         | `boolean`                    | アクティブ状態                           |
| `techTagIds`       | `uuid[]`（任意）             | 紐付けた技術タグIDリスト                 |
| `startDate`        | `string \| null`             | 開始日 YYYY-MM-DD（null = 未設定）       |
| `endDate`          | `string \| null`             | 終了日 YYYY-MM-DD（null = 在籍中）      |
| `unitPriceHistory` | `UnitPriceEntry[]`           | 単価履歴（空配列可）                     |
| `createdAt`        | `datetime`                   |                                          |
| `updatedAt`        | `datetime`                   |                                          |

ユーティリティ: `extractRoles()`（ユニーク値のソート済みリスト）

### AssignmentEntry（`assignment.ts`）

タスク×担当者ごとの月次アサイン。プロジェクト・タスク・メンバーの組み合わせで1レコード。

| フィールド      | 型                              | 備考                           |
| --------------- | ------------------------------- | ------------------------------ |
| `id`            | `uuid`                          |                                |
| `projectId`     | `uuid`                          | 対象プロジェクト               |
| `taskId`        | `uuid`                          | 対象タスク（プロジェクトの子） |
| `memberId`      | `uuid`                          | 担当者                         |
| `monthlyValues` | `Record<string, number>`        | キー: `"YYYY-MM"`、値: 0.0〜1.0 |
| `createdAt`     | `datetime`                      |                                |
| `updatedAt`     | `datetime`                      |                                |

### EffortEntry（`effort.ts`）

WBS工数エントリ。プロジェクト×列ごとに1レコード。

| フィールド  | 型                        | 備考                      |
| ----------- | ------------------------- | ------------------------- |
| `id`        | `uuid`                    |                           |
| `projectId` | `uuid`                    |                           |
| `columnId`  | `string`                  | `effort-1` 〜 `effort-10` |
| `value`     | `number`（0以上）         | 上限なし                  |

### Schedule関連（`schedule.ts`）

#### PhaseDefinition（工程定義）

| フィールド  | 型                         | 備考                          |
| ----------- | -------------------------- | ----------------------------- |
| `phaseKey`  | `string`                   | `phase-1` 〜 `phase-10`（不変） |
| `name`      | `string`（1〜50文字）      | 表示名                        |
| `color`     | `string`                   | ガントバーの色（HEX）        |
| `enabled`   | `boolean`                  | 有効/無効                     |
| `sortOrder` | `number`（0以上の整数）    | D&D並び順                     |

#### PhaseSettings（工程設定コンテナー）

| フィールド     | 型                               | 備考                   |
| -------------- | -------------------------------- | ---------------------- |
| `phases`       | `PhaseDefinition[]`（最大10件）  |                        |
| `lastModified` | `datetime`                       |                        |

デフォルト: 10件生成、最初の5件（要件定義/基本設計/詳細設計/実装・単体テスト/結合テスト）が有効

#### ScheduleEntry（スケジュールエントリ）

| フィールド  | 型       | 備考                              |
| ----------- | -------- | --------------------------------- |
| `id`        | `string` |                                   |
| `projectId` | `string` |                                   |
| `phaseKey`  | `string` |                                   |
| `startDate` | `string` | `YYYY-MM-DD`形式                  |
| `endDate`   | `string` | `YYYY-MM-DD`形式                  |

一意性制約: projectId × phaseKey

#### PhaseDependency（工程依存関係）

| フィールド       | 型                          | 備考                         |
| ---------------- | --------------------------- | ---------------------------- |
| `id`             | `string`                    |                              |
| `projectId`      | `string`                    |                              |
| `fromPhaseKey`   | `string`                    | 依存元の工程キー             |
| `toPhaseKey`     | `string`                    | 依存先の工程キー             |
| `dependencyType` | `FS \| SS \| FF \| SF`     |                              |

一意性制約: projectId × fromPhaseKey × toPhaseKey

### WbsSettings（`wbs-settings.ts`）

#### EffortColumn（工数列定義）

| フィールド        | 型                     | 備考                         |
| ----------------- | ---------------------- | ---------------------------- |
| `id`              | `string`               | `effort-1` 〜 `effort-10`    |
| `displayName`     | `string`（1〜50文字）  | 列表示名                     |
| `enabled`         | `boolean`              | 有効/無効                    |
| `order`           | `number`（0以上）      | 並び順                       |
| `backgroundColor` | `string`（任意）       | HEXカラー                    |
| `techTagIds`      | `uuid[]`（任意）       | 紐付けた技術タグIDリスト     |

#### WbsSettings（設定コンテナー）

| フィールド      | 型                                | 備考                              |
| --------------- | --------------------------------- | --------------------------------- |
| `effortColumns` | `EffortColumn[]`（最大10列）      |                                   |
| `levelColors`   | `Record<string, string>`（任意）  | レベル別背景色（0〜5）            |
| `lastModified`  | `datetime`                        |                                   |

デフォルト: 10列生成、最初の3列が有効。レベル別背景色6色プリセット。

### TechTagCategory（`tech-tag-category.ts`）

技術タグカテゴリ（大分類）。技術タグをグループ化する。

| フィールド  | 型                           | 備考                         |
| ----------- | ---------------------------- | ---------------------------- |
| `id`        | `uuid`                       |                              |
| `name`      | `string`（1〜100文字）       |                              |
| `sortOrder` | `number`（0以上の整数）      | 並び順                       |
| `createdAt` | `datetime`                   |                              |
| `updatedAt` | `datetime`                   |                              |

派生型: `CreateTechTagCategory`（id/日時を除外）、`UpdateTechTagCategory`（idのみ必須、他は任意）

### TechTagSubCategory（`tech-tag-category.ts`）

技術タグサブカテゴリ（中分類）。カテゴリに所属。

| フィールド  | 型                           | 備考                         |
| ----------- | ---------------------------- | ---------------------------- |
| `id`        | `uuid`                       |                              |
| `categoryId`| `uuid`                       | 所属カテゴリID               |
| `name`      | `string`（1〜100文字）       |                              |
| `sortOrder` | `number`（0以上の整数）      | 並び順                       |
| `createdAt` | `datetime`                   |                              |
| `updatedAt` | `datetime`                   |                              |

派生型: `CreateTechTagSubCategory`（id/日時を除外）、`UpdateTechTagSubCategory`（idのみ必須、他は任意）

### TechTag（`tech-tag.ts`）

技術タグ。カテゴリ/サブカテゴリに所属し、案件や担当者に紐付け可能。

| フィールド      | 型                           | 備考                              |
| --------------- | ---------------------------- | --------------------------------- |
| `id`            | `uuid`                       |                                   |
| `name`          | `string`（1〜50文字）        |                                   |
| `color`         | `string`                     | HEX形式（`#RRGGBB`）             |
| `categoryId`    | `uuid`                       | 所属カテゴリID（必須）            |
| `subCategoryId` | `uuid \| null`               | 所属サブカテゴリID（null = 直下） |
| `note`          | `string \| null`（最大200文字）| 補足・備考                       |
| `createdAt`     | `datetime`                   |                                   |
| `updatedAt`     | `datetime`                   |                                   |

マスタデータ: `src/features/tech-tags/utils/tech-tag-master.ts` にExcelベースの全17カテゴリ・199タグをプリセット定義。ストア初回ロード時にシード。

### Snapshot（`snapshot.ts`）

データのスナップショット履歴管理。

#### SnapshotTag

`string`（1〜50文字）。使用可能文字: 半角英数字、ドット、ハイフン、アンダースコアのみ。

#### SnapshotMeta（メタデータ）

| フィールド   | 型                  | 備考                          |
| ------------ | ------------------- | ----------------------------- |
| `id`         | `uuid`              |                               |
| `tag`        | `SnapshotTag`       | 一意（重複不可）              |
| `version`    | `string`            | 保存時のアプリバージョン      |
| `createdAt`  | `datetime`          |                               |
| `fiscalYear` | `number`            | 保存時の年度                  |
| `dataSize`   | `number`（0以上）   | データサイズ（バイト）        |

#### SnapshotEntry

`SnapshotMeta` + `Database`（データ本体）の組み合わせ。

#### SnapshotHistory

`SnapshotEntry[]` の配列。最大20件。超過時は古いものから削除。QuotaExceededError対応あり。

### Database（`database.ts`）

全データ統合スキーマ（JSON永続化用）。

| フィールド        | 型                          | 備考          |
| ----------------- | --------------------------- | ------------- |
| `version`         | `string`                    | スキーマバージョン |
| `fiscalYear`      | `number`（2000〜2100）      | 対象年度      |
| `projects`        | `Project[]`                 | 必須          |
| `members`         | `Member[]`                  | 必須          |
| `efforts`         | `EffortEntry[]`             | 任意          |
| `wbsSettings`     | `WbsSettings`               | 任意          |
| `scheduleEntries` | `ScheduleEntry[]`           | 任意          |
| `dependencies`    | `PhaseDependency[]`         | 任意          |
| `assignments`     | `AssignmentEntry[]`         | 任意          |
| `techTags`             | `TechTag[]`                 | 任意          |
| `techTagCategories`    | `TechTagCategory[]`         | 任意          |
| `techTagSubCategories` | `TechTagSubCategory[]`      | 任意          |
| `divisions`            | `Division[]`                | 任意          |
| `sections`             | `Section[]`                 | 任意          |
| `metadata`        | `Metadata`                  | 必須          |

Metadata: `lastModified`（datetime）、`createdBy`（string）、`version`（string）

ユーティリティ関数:
- `fiscalMonthToCalendarMonth()`: 年度月（1〜12）→ 暦月（4月始まり）
- `calendarMonthToFiscalMonth()`: 暦月 → 年度月
- `getFiscalMonthLabel()`: 年度月 → `"4月"`形式のラベル

## フォームバリデーション（`infrastructure/validation/schemas.ts`）

| スキーマ            | 対象             | 主なルール                                       |
| ------------------- | ---------------- | ------------------------------------------------ |
| `projectFormSchema` | 案件ダイアログ   | code必須、name必須、level 0〜5、status/confidence |
| `memberFormSchema`  | 担当者ダイアログ | name必須、sectionId/startDate/endDate/unitPriceHistory対応、endDate >= startDateバリデーション |
| `techTagFormSchema` | 技術タグダイアログ | name必須（1〜50文字）、color必須（HEX形式）、categoryId必須、subCategoryId任意、note任意（200文字以内） |
| `techTagCategoryFormSchema` | カテゴリダイアログ | name必須（1〜100文字） |
| `techTagSubCategoryFormSchema` | サブカテゴリダイアログ | categoryId必須、name必須（1〜100文字） |

`validateJsonImport()`: JSONインポート時のフォーマットバリデーション

## 重要なバリデーションルール

- 担当者ごとの月次アサイン合計が1.0人月を超えないこと（`getMemberMonthlyTotal`）
- アサイン配分値は0.0〜1.0の範囲
- 工程定義は最大10件、WBS工数列も最大10列
- スナップショットは最大20件（超過時は古いものから削除）
- スナップショットタグは一意（重複保存不可）
- 年度月は1〜12（1=4月、12=3月）
