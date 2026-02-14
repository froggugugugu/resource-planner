---
name: code-review
description: Reviews code changes for quality, conventions compliance, performance, and security. Applies when the user asks to review code, check implementation quality, or validate changes against project standards. Read-only — never modifies source code.
---

# Code Review

プロジェクトのコード変更をレビューするスキル。
`CLAUDE.md`の規約と[docs/development-patterns.md](../../../docs/development-patterns.md)のプロジェクト固有チェックリストに基づき、構造化されたフィードバックを返す。

## 基本姿勢

- **ソースコードは一切変更しない**（読み取り専用）
- 指摘は具体的かつ対応可能なものに限る（「なんとなく気になる」は不可）
- 重要度を明示する（MUST / SHOULD / CONSIDER）
- 良い点も言及する（指摘だけにしない）
- 仕様書（タスクファイル）の要件を満たしているかを最優先で確認する

## レビューワークフロー

1. **変更範囲の把握** — 変更ファイル一覧を確認し、影響範囲を理解する
2. **仕様との照合** — タスクファイルの受け入れ基準と実装を突き合わせる
3. **観点別チェック** — 下記のレビュー観点に沿って確認する
4. **レポート出力** — 下記のフォーマットで構造化されたフィードバックを返す

## レビュー観点

### 1. 仕様準拠

- タスクファイルの受け入れ基準をすべて満たしているか
- 仕様にない機能が追加されていないか
- データモデル変更が仕様どおりか

### 2. コード品質・可読性

- 命名が意図を表しているか（変数、関数、コンポーネント）
- 関数の責務が単一か（1関数1責務）
- 不要なコード・コメントアウトが残っていないか
- 型定義が適切か（`any`の使用、不要なアサーション）

### 3. アーキテクチャ準拠

- Feature-Sliced Designに沿っているか（`src/features/{feature}/`配下の配置）
- Zustandストアの使い方が正しいか（[docs/development-patterns.md](../../../docs/development-patterns.md)参照）
- Zodスキーマと型の一貫性
- `@/`パスエイリアスの使用
- 依存方向ルールに違反していないか:
  - `features/X` → `features/Y` の直接import禁止
  - `shared` → `features` 禁止
  - `infrastructure` → `features` 禁止
  - `stores` → `features` 禁止
  - 循環依存禁止
- `npx depcruise src --config` でerrorが出ないか

### 4. パフォーマンス

- `useMemo`/`useCallback`が適切に使われているか（過剰でも不足でもなく）
- Zustandセレクタ内で`.filter()`/`.map()`/`.sort()`をしていないか（無限ループの原因）
- AG Gridの列定義が`useMemo`でメモ化されているか
- 不要な再レンダリングが発生しないか

### 5. セキュリティ

- XSS: `dangerouslySetInnerHTML`の使用がないか
- 入力値のサニタイゼーション/バリデーション
- localStorageに機密情報を保存していないか

### 6. ダークモード対応

- 色指定がライト/ダーク両対応か（`dark:`プレフィックス、またはshadcn/uiのセマンティックカラー）
- ハードコードされた色値がないか

### 7. テスト

- 重要なロジックにユニットテストがあるか
- テストが仕様の振る舞いを検証しているか（実装詳細のテストではなく）
- `describe`/`it`の説明文が日本語で振る舞いを明記しているか

### 8. 後方互換性

- 既存データのマイグレーションが考慮されているか
- スキーマ変更がoptionalまたはデフォルト値付きか
- 既存のpublicインターフェースを破壊していないか

### 9. ドキュメント同期

- 実装変更に伴い `docs/` 配下が更新されているか
- ルート・ストア・コマンド変更 → `docs/project.md` が最新か
- feature・コンポーネント・テストファイル変更 → `docs/architecture.md` が最新か
- Zodスキーマ・バリデーションルール変更 → `docs/data-model.md` が最新か
- ドキュメント未更新の場合は MUST 指摘として報告する

## レポートフォーマット

```markdown
# コードレビュー: [変更の概要]

## 概要
- 変更ファイル数: X
- 影響範囲: [機能名]
- 仕様準拠: OK / NG（詳細は下記）
- ドキュメント同期: OK / NG（docs/ の更新状況）

## 指摘事項

### MUST（必須修正）
- [ ] [ファイル:行] 指摘内容。理由。修正案。

### SHOULD（推奨修正）
- [ ] [ファイル:行] 指摘内容。理由。修正案。

### CONSIDER（検討）
- [ ] [ファイル:行] 指摘内容。理由。

## 良い点
- [具体的に良かった点]

## 総合判定
- **承認** / **条件付き承認（MUST修正後）** / **要修正**
```

## 禁止事項

- ソースコードの変更（テストファイルも含む）
- 仕様書にない要件の追加要求
- 個人の好みに基づく指摘（プロジェクト規約に根拠がないもの）
- 重要度なしの曖昧な指摘
