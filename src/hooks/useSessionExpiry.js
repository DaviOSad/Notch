import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { clearLastSeen, isSessionStale, readLastSeen, touchLastSeen } from '../lib/session'

// De quanto em quanto tempo o carimbo de "último acesso" é renovado com o app aberto.
const HEARTBEAT_MS = 60 * 1000

/**
 * Mantém vivo o carimbo do último acesso enquanto o app está sendo usado e desloga
 * quando o prazo de inatividade já tinha estourado.
 *
 * A aba em segundo plano não conta como uso: deixar o app aberto e esquecido não
 * segura a sessão. Por isso a verificação roda ao montar, a cada batida e quando a
 * aba volta a ficar visível — os três momentos em que o usuário "entra" no app.
 */
export function useSessionExpiry(session) {
  useEffect(() => {
    if (!session) return

    const check = () => {
      if (document.visibilityState === 'hidden') return

      if (isSessionStale(readLastSeen(), session.user?.last_sign_in_at)) {
        clearLastSeen()
        supabase.auth.signOut()
        return
      }
      touchLastSeen()
    }

    check()
    const heartbeat = setInterval(check, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', check)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', check)
    }
  }, [session])
}
