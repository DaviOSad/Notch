import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import ResetPassword from './components/ResetPassword' // Importamos a tela nova

export default function App() {
  const [session, setSession] = useState(null)
  
  // Novo estado para controlar se o usuário está vindo do link de recuperação
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // O Supabase dispara este evento automaticamente ao detectar o hash do email na URL
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen">
      {/* 
        A lógica de roteamento agora é:
        1. Se clicou no email (recoveryMode) E fez o auto-login (session), mostra a tela de reset.
        2. Se não clicou no email, mas tem sessão (login normal), mostra o Dashboard.
        3. Se não tem sessão nenhuma, mostra a tela de Auth.
      */}
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