// Legacy theme store - now uses UIStore
// This file is kept for backwards compatibility
import { useUIStore } from './uiStore'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

// Compatibility wrapper around UIStore
export const useThemeStore = (): ThemeStore => {
  const uiStore = useUIStore()
  
  return {
    theme: uiStore.theme,
    setTheme: uiStore.setTheme,
    toggleTheme: uiStore.toggleTheme,
    initializeTheme: () => {
      // Theme is now automatically initialized in UIStore
      // No need to call setTheme as it's already initialized
    },
  }
}

// Re-export for convenience
export const useTheme = () => useUIStore(state => state.theme)
export const useSetTheme = () => useUIStore(state => state.setTheme)
export const useToggleTheme = () => useUIStore(state => state.toggleTheme)