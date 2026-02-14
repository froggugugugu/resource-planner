import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { jsonStorage } from '@/infrastructure/storage'

export type Theme = 'light' | 'dark' | 'system'
export type FontSize = 'sm' | 'base' | 'lg' | 'xl'

const FONT_SIZE_VALUES: Record<FontSize, string> = {
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
}

function applyFontSize(fontSize: FontSize) {
  document.documentElement.style.setProperty(
    '--app-font-size',
    FONT_SIZE_VALUES[fontSize],
  )
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme !== 'system') {
    root.classList.add(theme)
  }
}

interface AppState {
  fiscalYear: number
  fiscalYearStartMonth: number
  isLoading: boolean
  error: string | null
  theme: Theme
  isFullscreen: boolean
  fontSize: FontSize
  isSidebarCollapsed: boolean
  // Actions
  setFiscalYear: (year: number) => void
  setFiscalYearStartMonth: (month: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setTheme: (theme: Theme) => void
  toggleFullscreen: () => void
  toggleSidebar: () => void
  setFontSize: (size: FontSize) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  initialize: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      fiscalYear:
        new Date().getMonth() >= 3
          ? new Date().getFullYear()
          : new Date().getFullYear() - 1,
      fiscalYearStartMonth: 4,
      isLoading: false,
      error: null,
      theme: 'system' as Theme,
      isFullscreen: false,
      fontSize: 'base' as FontSize,
      isSidebarCollapsed: false,

      setFiscalYear: (year) => {
        set({ fiscalYear: year })
        jsonStorage.changeFiscalYear(year)
      },

      setFiscalYearStartMonth: (month) => {
        set({ fiscalYearStartMonth: month })
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleFullscreen: () => {
        set((state) => ({ isFullscreen: !state.isFullscreen }))
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
      },

      setFontSize: (fontSize) => {
        applyFontSize(fontSize)
        set({ fontSize })
      },

      increaseFontSize: () => {
        const sizes: FontSize[] = ['sm', 'base', 'lg', 'xl']
        const { fontSize } = get()
        const idx = sizes.indexOf(fontSize)
        if (idx >= 0 && idx < sizes.length - 1) {
          const newSize = sizes[idx + 1] as FontSize
          applyFontSize(newSize)
          set({ fontSize: newSize })
        }
      },

      decreaseFontSize: () => {
        const sizes: FontSize[] = ['sm', 'base', 'lg', 'xl']
        const { fontSize } = get()
        const idx = sizes.indexOf(fontSize)
        if (idx > 0) {
          const newSize = sizes[idx - 1] as FontSize
          applyFontSize(newSize)
          set({ fontSize: newSize })
        }
      },

      initialize: () => {
        const db = jsonStorage.load()
        const { theme, fontSize } = get()
        applyTheme(theme)
        applyFontSize(fontSize)
        set({ fiscalYear: db.fiscalYear, isLoading: false })
      },
    }),
    {
      name: 'resource-manager-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fiscalYear: state.fiscalYear,
        fiscalYearStartMonth: state.fiscalYearStartMonth,
        theme: state.theme,
        fontSize: state.fontSize,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme)
        }
        if (state?.fontSize) {
          applyFontSize(state.fontSize)
        }
      },
    },
  ),
)
