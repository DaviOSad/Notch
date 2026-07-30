import { SESSION_MAX_IDLE_MS, isSessionStale } from '../../lib/session'

const NOW = Date.parse('2026-07-30T12:00:00Z')
const agoMs = (ms) => NOW - ms
const DIA = 24 * 60 * 60 * 1000

describe('isSessionStale', () => {
  it('mantém a sessão de quem entrou há menos de 2 dias', () => {
    expect(isSessionStale(agoMs(DIA), null, NOW)).toBe(false)
    expect(isSessionStale(agoMs(SESSION_MAX_IDLE_MS - 1000), null, NOW)).toBe(false)
  })

  it('derruba a sessão parada há mais de 2 dias', () => {
    expect(isSessionStale(agoMs(SESSION_MAX_IDLE_MS + 1000), null, NOW)).toBe(true)
    expect(isSessionStale(agoMs(30 * DIA), null, NOW)).toBe(true)
  })

  // Login novo (inclusive via link de recuperação de senha) conta como uso: sem isso
  // quem passou do prazo seria deslogado antes de conseguir trocar a senha.
  it('considera um login recente mesmo com o carimbo local vencido', () => {
    const lastSignIn = new Date(agoMs(60 * 1000)).toISOString()
    expect(isSessionStale(agoMs(30 * DIA), lastSignIn, NOW)).toBe(false)
  })

  it('usa o carimbo local quando o login é antigo', () => {
    const lastSignIn = new Date(agoMs(30 * DIA)).toISOString()
    expect(isSessionStale(agoMs(60 * 1000), lastSignIn, NOW)).toBe(false)
    expect(isSessionStale(agoMs(3 * DIA), lastSignIn, NOW)).toBe(true)
  })

  it('não expira sem nenhuma referência de uso', () => {
    expect(isSessionStale(null, null, NOW)).toBe(false)
    expect(isSessionStale('', undefined, NOW)).toBe(false)
    expect(isSessionStale('lixo', 'nao-e-data', NOW)).toBe(false)
  })
})
