---
name: security-scan
version: 1.0.0
description: >
  This skill should be used when the user asks to "run security scan", "check vulnerabilities", "audit dependencies",
  or mentions "セキュリティスキャン", "脆弱性", "OWASP", "npm audit", "シークレット検出", "CVE".
  Source-code read-only — never modifies source code or test files.
  Outputs scan report to output/reports/security/ and raw data to testreport/security/ (requires Write permission to both).
  Takes optional argument: /security-scan <target-scope or instruction>
argument-hint: "<対象範囲 or 指示>"
allowed-tools: Read, Glob, Grep, Bash(git *), Write(output/**), Write(testreport/**), WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs
context: fork
---

# Security Scan

セキュリティスキャンツールを実行し、構造化された脆弱性レポートを出力するスキル。
OWASP ZAP（DAST）、依存パッケージ脆弱性スキャン、静的解析（SAST）、シークレット検出などを統合的に実施する。
`project-config.md` セクション10（セキュリティポリシー）を参照し、プロジェクト固有のポリシーに準拠する。

**免責事項**: 本スキルによるスキャンは自動化ツールに基づく参考情報であり、セキュリティ専門家によるペネトレーションテストの代替ではない。重要なシステムでは必ず専門家のレビューを受けること。

## 前提条件

`docs/` ファイルへの依存なし。`project-config.md` §10（セキュリティポリシー）を参照する。未記入の場合は OWASP Top 10 をデフォルト基準として使用する。

## 基本姿勢

- **ソースコードは一切変更しない**（読み取り専用）
- スキャン結果は再現可能であること（ツール・バージョン・設定を明記）
- 検出された脆弱性は重要度を明示する（CRITICAL / HIGH / MEDIUM / LOW / INFO）
- 偽陽性（False Positive）の可能性がある検出には明示的にマークする
- 修正の優先順位を明確にする

## 使い方

```text
/security-scan <対象範囲 or スキャン指示>
```

引数は省略可能。省略した場合はプロジェクト全体をスキャン対象とする。
ファイルパスやカテゴリを指定した場合はその範囲に限定してスキャンする。

### 例

```text
/security-scan プロジェクト全体のセキュリティスキャン
/security-scan src/features/assignment/
/security-scan 依存パッケージのみ
```

### 出力先

- デフォルト: 会話内でレポートを提示
- ファイル出力: `output/reports/security/SECURITY_<日時>.md`（`output/`ディレクトリが存在する場合）
- ツール出力: `testreport/security/`

### 他スキルとの連携

| 前工程 | 本スキル | 後工程 |
| ------ | -------- | ------ |
| `/implementing-features` | `/security-scan` | （最終工程） |

## スキャンカテゴリ

### 1. 依存パッケージ脆弱性スキャン（SCA）

既知の脆弱性（CVE）を持つ依存パッケージを検出する。

```bash
# npm 標準
npm audit --json > testreport/security/npm-audit.json
npm audit

# より詳細な分析（プロジェクトにインストールされている場合）
# npx snyk test
# trivy fs --scanners vuln .
```

#### チェック項目

- [ ] 直接依存（dependencies）の脆弱性を確認した
- [ ] 間接依存（devDependencies含む）の脆弱性を確認した
- [ ] CRITICAL/HIGH の脆弱性にパッチ適用可能か確認した
- [ ] 脆弱性のあるパッケージが本番ビルドに含まれるか確認した

#### 判定基準

| 条件 | 判定 |
| ---- | ---- |
| CRITICAL/HIGH が0件 | PASS |
| CRITICAL/HIGH があるが本番ビルドに含まれない（devDependencies のみ） | WARNING |
| CRITICAL/HIGH が本番ビルドに含まれる | FAIL |

### 2. 静的アプリケーションセキュリティテスト（SAST）

ソースコード内のセキュリティ上の問題を静的に検出する。

#### 検出対象（OWASP Top 10 ベース）

| 脆弱性カテゴリ | CWE | OWASP Top 10 |
| -------------- | --- | ------------ |
| クロスサイトスクリプティング（XSS） | CWE-79 | A03:2021 |
| インジェクション | CWE-89, CWE-78 | A03:2021 |
| 機密情報の露出（ハードコードされた認証情報） | CWE-798 | A02:2021 |
| 安全でないコード実行（動的コード評価） | CWE-95 | A08:2021 |
| 入力バリデーション不備 | CWE-20 | A03:2021 |
| 暗号化の不備 | CWE-327 | A02:2021 |

#### Grepベースの簡易検出

ツールが未導入の場合、OWASP CWEパターンに該当するコードをソースコード内で検索する:

- **CWE-79 (XSS)**: 安全でないHTML挿入API（innerHTML系、フレームワーク固有の raw HTML 挿入等）
- **CWE-798 (ハードコード認証情報)**: ソースコード内の password, secret, api_key, token リテラル
- **CWE-95 (動的コード評価)**: 文字列からコードを動的に生成・実行する関数

```bash
# セキュリティツールが導入されている場合
# npx semgrep --config auto src/
```

#### チェック項目

- [ ] CWE-79（XSS）パターンをスキャンした
- [ ] CWE-798（ハードコード認証情報）をスキャンした
- [ ] CWE-95（動的コード評価）パターンをスキャンした
- [ ] ユーザー入力のバリデーション状況を確認した
- [ ] OWASP Top 10の主要カテゴリをカバーした

### 3. 動的アプリケーションセキュリティテスト（DAST）

稼働中のアプリケーションに対してセキュリティスキャンを実施する。

#### OWASP ZAP

```bash
# OWASP ZAP Docker（Baseline Scan: パッシブスキャン、高速）
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t <TARGET_URL> \
  -J zap-report.json \
  -r zap-report.html

# OWASP ZAP Docker（Full Scan: アクティブスキャン、詳細）
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t <TARGET_URL> \
  -J zap-report.json \
  -r zap-report.html

# API Scan（OpenAPI/Swagger定義がある場合）
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t <OPENAPI_SPEC_URL> \
  -f openapi \
  -J zap-api-report.json
```

#### 前提条件

- Docker がインストールされていること
- 対象アプリケーションが起動していること（開発サーバー or ビルド済みプレビュー）
- ネットワークアクセスが可能であること

#### スキャンモード選択

| モード | コマンド | 所要時間 | 用途 |
| ------ | -------- | -------- | ---- |
| Baseline | `zap-baseline.py` | 1〜2分 | CI/日常チェック（パッシブスキャンのみ） |
| Full | `zap-full-scan.py` | 10〜30分 | リリース前の詳細スキャン |
| API | `zap-api-scan.py` | 5〜15分 | API仕様ベースのスキャン |

#### チェック項目

- [ ] 対象URLに対してスキャンを実行した
- [ ] セキュリティヘッダーの設定を確認した
- [ ] CSP（Content Security Policy）の設定を確認した
- [ ] Cookie属性（Secure, HttpOnly, SameSite）を確認した

### 4. シークレット検出

ソースコードやGit履歴に含まれる機密情報を検出する。

```bash
# gitleaks（Git履歴を含むスキャン）
gitleaks detect --source . --report-path testreport/security/gitleaks.json --report-format json

# gitleaks（ステージング済みファイルのみ）
gitleaks protect --staged --report-path testreport/security/gitleaks-staged.json

# trufflehog（Git履歴スキャン）
trufflehog git file://. --json > testreport/security/trufflehog.json
```

#### 検出対象

- APIキー・アクセストークン
- パスワード・認証情報
- 秘密鍵（SSH, PGP）
- データベース接続文字列
- クラウドプロバイダーの資格情報（AWS, GCP, Azure）
- `.env` ファイルのコミット

### 5. セキュリティヘッダー・設定分析

HTTP応答ヘッダーとアプリケーション設定のセキュリティを検証する。

#### 必須ヘッダー

| ヘッダー | 推奨値 | 目的 |
| -------- | ------ | ---- |
| `Content-Security-Policy` | 適切なディレクティブ | XSS・データインジェクション防止 |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィング防止 |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | クリックジャッキング防止 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS 強制 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラー情報漏洩防止 |
| `Permissions-Policy` | 必要なAPIのみ許可 | ブラウザ機能の制限 |

## スキャンワークフロー

1. **スコープ確認** — スキャン対象（全体 / 特定カテゴリ / 特定ファイル）を確認
2. **環境確認** — 必要なツールのインストール状況を確認
3. **ツール実行** — カテゴリ別にスキャンツールを実行
4. **結果分析** — スキャン結果を解析し、偽陽性を識別
5. **🚏 レポートゲート** — 構造化されたレポートを出力

### ツール可用性への対応

スキャンツールがインストールされていない場合:

1. インストール手順を提示する（ユーザーの判断を待つ）
2. ツールなしで実行可能な範囲（Grepベースの検索、`npm audit`）で簡易スキャンを実施する
3. 簡易スキャンの限界を明記する

## 出力契約

### セクション定義

| セクション | 必須 | 制約 |
| ---------- | ---- | ---- |
| 免責事項 | ✅ | 定型文。変更不可 |
| スキャン概要 | ✅ | 対象範囲・使用ツール・スキャン日時を必ず含む |
| エグゼクティブサマリー | ✅ | 検出件数の重要度別集計。非技術者にも理解可能な概要 |
| 検出事項 | ✅ | CRITICAL→HIGH→MEDIUM→LOW→INFO の順。0件でも見出しは残す |
| 依存パッケージサマリー | 条件付き | SCAを実施した場合 |
| DAST結果サマリー | 条件付き | DASTを実施した場合 |
| 推奨アクション | ✅ | 優先度順に番号付き。修正難易度（低/中/高）を付記 |
| 次回スキャン推奨事項 | ✅ | 追加すべきツール・スキャン範囲の拡大提案 |

### 重要度定義

| レベル | 判定基準 | 対応期限の目安 | CVSS相当 |
| ------ | -------- | -------------- | -------- |
| **CRITICAL** | 即座に悪用可能な脆弱性。認証バイパス、RCE、機密情報の公開露出 | 即時対応 | 9.0〜10.0 |
| **HIGH** | 悪用にはある程度の条件が必要だが、深刻な影響を与えうる脆弱性 | 1週間以内 | 7.0〜8.9 |
| **MEDIUM** | 限定的な条件下で悪用可能、または影響が中程度の脆弱性 | 次回リリースまで | 4.0〜6.9 |
| **LOW** | 悪用が困難、または影響が軽微な脆弱性 | 計画的に対応 | 0.1〜3.9 |
| **INFO** | セキュリティ上のベストプラクティスからの乖離。直接的な脆弱性ではない | 任意 | - |

### 検出事項の記述フォーマット

```text
- [ ] **[重要度]** `検出場所` 脆弱性の概要。
  **CVE/CWE**: 該当する場合に記載。
  **影響**: 悪用された場合の具体的な影響。
  **修正案**: 具体的な修正方法。
  **修正難易度**: 低 / 中 / 高。
  **偽陽性の可能性**: あり / なし（ありの場合は根拠を記載）。
```

### 語彙制約

| 用語 | 定義 |
| ---- | ---- |
| SCA | Software Composition Analysis。依存パッケージの脆弱性スキャン |
| SAST | Static Application Security Testing。ソースコードの静的解析 |
| DAST | Dynamic Application Security Testing。稼働アプリケーションへの動的スキャン |
| CVE | Common Vulnerabilities and Exposures。公開された脆弱性の識別番号 |
| CWE | Common Weakness Enumeration。ソフトウェアの弱点分類 |
| CVSS | Common Vulnerability Scoring System。脆弱性の重要度スコア（0.0〜10.0） |
| 偽陽性 | False Positive。実際には脆弱性ではない検出結果 |
| パッシブスキャン | 通常のリクエスト/レスポンスを観察するのみ（侵入的でない） |
| アクティブスキャン | 意図的に攻撃パターンを送信して脆弱性を検証する |

### 構造制約

- 検出事項にはCVE/CWE番号を可能な限り付記する
- 修正案は具体的なコード変更またはコマンドで記述する
- 偽陽性の判定根拠を明記する
- スキャンに使用したツールのバージョンを必ず記録する

## レポートフォーマット

```markdown
# セキュリティスキャンレポート: [対象の概要]

## 免責事項
本レポートは自動化ツールに基づく参考情報であり、包括的なセキュリティ評価の代替ではありません。
重要なシステムではセキュリティ専門家によるレビューを推奨します。

## スキャン概要
- スキャン日時: YYYY-MM-DD HH:MM
- 対象: [アプリケーション名/URL/リポジトリ]
- スキャン範囲: SCA / SAST / DAST / シークレット検出 / ヘッダー分析
- 使用ツール:
  - [ツール名 vX.X.X]（対象カテゴリ）

## エグゼクティブサマリー
- 検出件数: CRITICAL X件 / HIGH Y件 / MEDIUM Z件 / LOW W件 / INFO V件
- 総合リスク評価: 高 / 中 / 低
- 即時対応が必要な項目: X件

## 検出事項

### CRITICAL（即時対応）
- [ ] **[CRITICAL]** `検出場所` 脆弱性の概要。
  **CVE/CWE**: CVE-XXXX-XXXXX / CWE-XXX。
  **影響**: 影響の説明。
  **修正案**: 修正方法。
  **修正難易度**: 低 / 中 / 高。

### HIGH（1週間以内）
（同上フォーマット）

### MEDIUM（次回リリースまで）
（同上フォーマット）

### LOW（計画的に対応）
（同上フォーマット）

### INFO（参考情報）
（同上フォーマット）

## 依存パッケージサマリー

| パッケージ | 現バージョン | 脆弱性 | 重要度 | 修正バージョン | 本番影響 |
| ---------- | ------------ | ------ | ------ | -------------- | -------- |
| [名前] | [ver] | CVE-XXXX | HIGH | [ver] | あり / なし |

## DAST結果サマリー

| アラート | リスク | 件数 | CWE | URL例 |
| -------- | ------ | ---- | --- | ----- |
| [アラート名] | High/Medium/Low | X | CWE-XXX | /path |

## 推奨アクション
1. **[重要度]** [対応内容]（修正難易度: 低/中/高）
2. ...

## 次回スキャン推奨事項
- [追加すべきツール・スキャン範囲の提案]
- 推奨スキャン頻度: [日次 / 週次 / リリース前]
```

## ツール導入ガイド

最小構成: `npm audit`（追加インストール不要）。
推奨構成: gitleaks + OWASP ZAP + semgrep。

```bash
# gitleaks（シークレット検出）
# https://github.com/gitleaks/gitleaks#installing
brew install gitleaks  # macOS
# または GitHub Releases からバイナリをダウンロード

# OWASP ZAP（DAST）
# Docker 経由で利用（インストール不要）
# docker run --rm ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t <URL>

# semgrep（SAST）
# https://semgrep.dev/docs/getting-started/
pip install semgrep
# または brew install semgrep
```

## 禁止事項

- ソースコードの変更（テストファイルも含む）
- 本番環境へのアクティブスキャンの実行（開発/ステージング環境のみ）
- スキャンツールの無断インストール（ユーザーの確認を取る）
- 脆弱性情報の過小評価（不明な場合は高めに評価する）
- 検出された機密情報のレポートへの転記（マスクする）
- 「問題なし」の断定（「スキャン範囲内で検出なし」と表現する）

## 関連参照(必要に応じて Claude が load)

@.claude/guardrails.md
@.claude/permissions-guide.md
@.claude/quality-gates.md
@.claude/pitfalls.md
