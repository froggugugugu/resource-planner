import {
  BarChart3,
  Calendar,
  CalendarDays,
  ClipboardList,
  Database,
  FolderKanban,
  Moon,
  Network,
  PanelLeftClose,
  Settings,
  Sun,
  Tag,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useAppStore } from '@/stores'
import type { Theme } from '@/stores/app-store'

interface LayoutProps {
  children: ReactNode
  sidebarExtra?: ReactNode
}

const navItems = [
  {
    to: '/dashboard',
    label: 'ダッシュボード',
    icon: BarChart3,
    tourId: 'nav-dashboard',
  },
  { to: '/team', label: 'チーム', icon: Users, tourId: 'nav-team' },
  {
    to: '/projects',
    label: 'プロジェクト',
    icon: FolderKanban,
    tourId: 'nav-projects',
  },
  { to: '/wbs', label: 'WBS', icon: Network, tourId: 'nav-wbs' },
  {
    to: '/schedule',
    label: 'スケジュール',
    icon: Calendar,
    tourId: 'nav-schedule',
  },
  {
    to: '/assignment',
    label: 'アサイン',
    icon: ClipboardList,
    tourId: 'nav-assignment',
  },
]

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'ライト' },
  { value: 'dark', icon: Moon, label: 'ダーク' },
]

export function Layout({ children, sidebarExtra }: LayoutProps) {
  const navigate = useNavigate()
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const fiscalYearStartMonth = useAppStore(
    (state) => state.fiscalYearStartMonth,
  )
  const setFiscalYearStartMonth = useAppStore(
    (state) => state.setFiscalYearStartMonth,
  )
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={cn(
          'flex h-full flex-col border-r border-border bg-card transition-[width] duration-200',
          isSidebarCollapsed ? 'w-[60px]' : 'w-[180px]',
        )}
      >
        {/* Logo / Title + Collapse toggle */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
          {isSidebarCollapsed ? (
            <button
              type="button"
              className="mx-auto text-base font-bold hover:text-accent-foreground transition-colors"
              onClick={toggleSidebar}
              title="サイドバーを開く"
            >
              RF
            </button>
          ) : (
            <span className="truncate text-sm font-bold pl-1">ResFlow</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7 shrink-0', isSidebarCollapsed && 'hidden')}
            onClick={toggleSidebar}
            title="サイドバーを閉じる"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, tourId }) => (
              <NavLink
                key={to}
                to={to}
                data-tour={tourId}
                title={isSidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-md transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                    isSidebarCollapsed
                      ? 'justify-center px-2 py-2'
                      : 'gap-3 px-3 py-2',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate text-sm font-medium">{label}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          <div
            className={cn(
              'flex',
              isSidebarCollapsed
                ? 'flex-col items-center gap-1'
                : 'items-center gap-1',
            )}
          >
            {/* Theme toggle */}
            <div data-tour="theme-toggle" className="contents">
              {themeOptions.map(({ value, icon: Icon, label: themeLabel }) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7',
                    theme === value && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => setTheme(value)}
                  aria-label={themeLabel}
                  title={themeLabel}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>

            {/* Settings popover */}
            {!isSidebarCollapsed && <div className="flex-1" />}
            {sidebarExtra}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-tour="settings-button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="システム設定"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-56 p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  システム設定
                </p>
                <div className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="text-sm">年度開始月</span>
                  <select
                    className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-sm"
                    value={fiscalYearStartMonth}
                    onChange={(e) =>
                      setFiscalYearStartMonth(Number(e.target.value))
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {month}月
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => navigate('/tech-tags')}
                >
                  <Tag className="h-4 w-4" />
                  技術タグ
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => navigate('/reports')}
                >
                  <Database className="h-4 w-4" />
                  データ管理
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1800px] px-4 py-4">{children}</div>
      </main>
    </div>
  )
}
