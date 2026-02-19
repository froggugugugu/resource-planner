---
name: implementing-features
description: >
  Implements features, fixes bugs, and refactors code following TDD workflow.
  Triggers: implement, create, fix, modify, add, refactor, build, develop, change functionality.
  Covers: components, stores, schemas, utilities, styling, and docs/ synchronization.
---

# Implementing Features

プロジェクトの開発標準に従い、TDDで機能実装・バグ修正・リファクタリングを行う。
`CLAUDE.md` の方針を厳守すること。プロジェクト固有のコードパターンは [docs/development-patterns.md](../../../docs/development-patterns.md) を参照。

## 基本姿勢

- 実務でそのまま使えるコードを書く（擬似コード禁止、TODOで逃げない）
- 仕様が曖昧な場合は実装前に質問する（推測で進めない）
- 設計を勝手に変えない、過剰な抽象化をしない
- 仕様書にない機能を追加しない
- ユーザーデータの暗黙的な削除・上書きをしない

## 実装ワークフロー（TDD）

1. **仕様確認** — 曖昧な点があれば選択肢を示して質問
2. **テスト作成** — Vitest + Testing Library で正常系・異常系・境界値を書く
3. **最小実装** — テストが通るコードを書く
4. **リファクタリング** — テストが通ったまま整理
5. **検証** — `npm run test:run && npm run check && npm run build && npx depcruise src --config`
   ※ 上記検証コマンドは `.husky/pre-push` と同等。push時に自動実行されるが、
     コミット前に手動確認したい場合に使用する
6. **ドキュメント更新** — 下記「ドキュメント同期」に従い `docs/` を更新

## 出力フォーマット

実装時は以下の順で出力:
1. 実装方針（簡潔に）
2. テストコード
3. 本体コード

## アーキテクチャ準拠

- **Feature-Sliced Design**: `src/features/{feature}/` 配下に components, pages, utils
- **状態管理**: Zustand 5 + persist middleware（セレクタの注意点は [docs/development-patterns.md](../../../docs/development-patterns.md) 参照）
- **バリデーション**: Zod スキーマで型安全に（`src/shared/types/`）
- **UI**: Tailwind CSS 4 + shadcn/ui、ダークモード必須
- **パスエイリアス**: `@/` → `src/`

## データモデル変更時

- Zodスキーマを先に定義
- 既存 `DatabaseSchema` との後方互換を維持（optional追加）
- localStorage永続化層（`jsonStorage`）への影響を確認

## ドキュメント同期

実装変更後、影響を受ける `docs/` ファイルを必ず更新する。
ドキュメントの正確性は実装と同等の品質基準で扱う。

### 更新トリガーと対象ファイル

| 変更内容                         | 更新対象               |
| -------------------------------- | ---------------------- |
| ルート追加・変更・削除           | `docs/project.md`      |
| Zustandストア追加・変更・削除    | `docs/project.md`      |
| npmスクリプト追加・変更          | `docs/project.md`      |
| 依存パッケージ追加・バージョン変更 | `docs/project.md`    |
| feature追加・削除・リネーム      | `docs/architecture.md` |
| コンポーネント追加・削除         | `docs/architecture.md` |
| テストファイル追加・削除         | `docs/architecture.md` |
| shared/infrastructure変更        | `docs/architecture.md` |
| コードパターン・落とし穴の発見/変更 | `docs/development-patterns.md` |
| Zodスキーマのフィールド追加・変更 | `docs/data-model.md`  |
| バリデーションルール変更         | `docs/data-model.md`   |
| フォームスキーマ追加・変更       | `docs/data-model.md`   |

### 更新手順

1. 変更した実装コードを読み、影響を受ける `docs/` ファイルを特定する
2. 対象ファイルの該当箇所を実装に合わせて更新する
3. 更新内容を品質レポートの変更影響範囲に含める

## テストポリシー

- テストは「仕様を説明するもの」
- 重要なロジックには必ずテストケースを用意
- カバレッジ80%以上を目標
- `describe` / `it` の説明文は日本語で振る舞いを明記
- ユニットテストカバレッジのレポートをファイル出力し提示

## 依存方向の検証

実装完了時に `npx depcruise src --config` を実行し、以下のルール違反がないことを確認する:

- `features/X` → `features/Y` の直接依存がないこと
- `shared` → `features` の依存がないこと
- `infrastructure` → `features` の依存がないこと
- `stores` → `features` の依存がないこと
- 循環依存がないこと

## Git操作

- `--no-verify` は使用禁止（pre-commit / pre-pushフックを迂回しない）
- フック失敗時はエラーの原因を修正する
- `--force` は原則禁止

## 禁止事項

- Zustandセレクタ内での `.filter()` / `.map()` / `.sort()`（無限ループの原因）
- 仕様書にない機能の追加
- ユーザーデータの暗黙的な削除・上書き
- `--no-verify` によるフック迂回
