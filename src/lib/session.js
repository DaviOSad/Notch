// Expiração da sessão por inatividade: o usuário é deslogado depois de 2 dias sem
// abrir o app. Enquanto o app está aberto e visível o carimbo é renovado, então o
// prazo só é avaliado ao entrar (ou ao voltar para a aba) — nunca no meio do uso.

export const SESSION_MAX_IDLE_MS = 2 * 24 * 60 * 60 * 1000

const LAST_SEEN_KEY = 'notch:ultimo-acesso'

/**
 * `lastSeen` é o carimbo local do último uso; `lastSignInAt` vem do servidor e não
 * muda nas renovações de token. O login mais recente entre os dois é o que vale —
 * sem isso, um link de recuperação aberto depois do prazo derrubaria a sessão antes
 * da troca de senha.
 *
 * Sem nenhum dos dois (primeiro acesso depois deste recurso, storage limpo) a sessão
 * não expira: derrubar quem acabou de chegar seria pior que deixar passar uma vez.
 */
export const isSessionStale = (lastSeen, lastSignInAt, now = Date.now()) => {
  const lastUse = Math.max(Number(lastSeen) || 0, Date.parse(lastSignInAt) || 0)
  if (!lastUse) return false
  return now - lastUse > SESSION_MAX_IDLE_MS
}

// O acesso ao storage é protegido: navegador em modo restrito não pode quebrar o app.
const safely = (action, fallback = null) => {
  try {
    return action()
  } catch {
    return fallback
  }
}

export const readLastSeen = () => safely(() => window.localStorage.getItem(LAST_SEEN_KEY))

export const touchLastSeen = () =>
  safely(() => window.localStorage.setItem(LAST_SEEN_KEY, String(Date.now())))

export const clearLastSeen = () => safely(() => window.localStorage.removeItem(LAST_SEEN_KEY))
