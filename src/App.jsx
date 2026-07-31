import { useEffect, useState } from 'react'
import { supabase, emailJustConfirmed } from './supabaseClient'
import { useSessionExpiry } from './hooks/useSessionExpiry'
import { clearLastSeen, isSessionStale, readLastSeen } from './lib/session'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import ResetPassword from './components/ResetPassword' // Importamos a tela nova

export default function App() {
  const [session, setSession] = useState(null)

  // Novo estado para controlar se o usuário está vindo do link de recuperação
  const [recoveryMode, setRecoveryMode] = useState(false)

  // Verdadeiro só na primeira renderização após o clique no link de confirmação de email
  const [showEmailConfirmedBanner, setShowEmailConfirmedBanner] = useState(emailJustConfirmed)

  useEffect(() => {
    // Sessão parada além do prazo é derrubada aqui, antes de o dashboard montar —
    // tanto na restauração do storage quanto em qualquer evento de autenticação.
    const applySession = (session) => {
      if (session && isSessionStale(readLastSeen(), session.user?.last_sign_in_at)) {
        clearLastSeen()
        supabase.auth.signOut()
        return setSession(null)
      }
      if (!session) clearLastSeen()
      setSession(session)
    }

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // O Supabase dispara este evento automaticamente ao detectar o hash do email na URL
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }
      applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useSessionExpiry(session)

  return (
    <div className="min-h-screen">
      {/* 
        A lógica de roteamento agora é:
        1. Se clicou no email (recoveryMode) E fez o auto-login (session), mostra a tela de reset.
        2. Se não clicou no email, mas tem sessão (login normal), mostra o Dashboard.
        3. Se não tem sessão nenhuma, mostra a tela de Auth.
      */}
      {showEmailConfirmedBanner && session && !recoveryMode && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 shadow-inner">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Email verificado com sucesso!</span>
          <button
            type="button"
            onClick={() => setShowEmailConfirmedBanner(false)}
            className="ml-2 text-emerald-400/70 hover:text-emerald-400"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}
      {recoveryMode && session ? (
        <ResetPassword onComplete={() => setRecoveryMode(false)} />
      ) : session ? (
        <Dashboard session={session} />
      ) : (
        <Auth />
      )}
    </div>
  )
}