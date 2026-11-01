export const THEME_KEY = 'nexo:tema'

// Escolha salva vence; sem ela, segue o tema do sistema.
export function getInitialTheme(prefersDark) {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
}
