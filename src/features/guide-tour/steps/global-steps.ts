import type { Step } from 'react-joyride'

export const globalSteps: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'サイドバー',
    content:
      'アプリの各機能にはサイドバーからアクセスできます。折りたたみ/展開も可能です。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: 'ダッシュボード',
    content:
      'プロジェクト別アサイン、売上予算、メンバー別アサイン、充足率などの全体像を確認できます。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-team"]',
    title: 'チーム',
    content: '部門・課の組織階層を管理し、メンバーの登録・単価設定を行います。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-projects"]',
    title: 'プロジェクト',
    content:
      '案件の登録・ステータス管理を行います。確度（S/A/B/C）で受注見込みを管理できます。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-wbs"]',
    title: 'WBS',
    content: 'プロジェクトごとの作業分解構成（WBS）と工数を管理します。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-schedule"]',
    title: 'スケジュール',
    content:
      'ガントチャートで工程スケジュールを管理します。工程間の依存関係も設定できます。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-assignment"]',
    title: 'アサイン',
    content:
      'タスク別・担当者別の月次アサイン配分を管理します。担当者あたり月1.00人月が上限です。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="theme-toggle"]',
    title: 'テーマ切替',
    content: 'ライトモードとダークモードを切り替えられます。',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings-button"]',
    title: '設定',
    content:
      '年度開始月の変更、技術タグ管理、データ管理（スナップショット・エクスポート）にアクセスできます。',
    placement: 'right',
    disableBeacon: true,
  },
]
