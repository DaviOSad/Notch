import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialTheme, applyTheme, THEME_KEY } from '../../lib/theme'

describe('getInitialTheme', () => {
  beforeEach(() => localStorage.clear())

  it('usa a escolha salva quando existe', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    expect(getInitialTheme(false)).toBe('dark')
    localStorage.setItem(THEME_KEY, 'light')
    expect(getInitialTheme(true)).toBe('light')
  })

  it('sem escolha salva, segue a preferência do sistema', () => {
    expect(getInitialTheme(true)).toBe('dark')
    expect(getInitialTheme(false)).toBe('light')
  })

  it('ignora valor salvo inválido', () => {
    localStorage.setItem(THEME_KEY, 'roxo')
    expect(getInitialTheme(false)).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => localStorage.clear())

  it('liga a classe dark no <html> e persiste', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('desliga a classe dark no tema claro', () => {
    applyTheme('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })
})
