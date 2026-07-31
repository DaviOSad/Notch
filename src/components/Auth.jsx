import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// window.location.origin não inclui o path do GitHub Pages (/Finances-Dashboard/);
// sem o BASE_URL o link do email cai na raiz do domínio e dá 404.
const authRedirectUrl = window.location.origin + import.meta.env.BASE_URL

// --- CUSTOM HOOK PARA LÓGICA DE AUTENTICAÇÃO ---
function useAuthLogic() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [mode, setMode] = useState('login') 
  const [isAnimating, setIsAnimating] = useState(false)
  
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [emailError, setEmailError] = useState('')       
  const [passwordError, setPasswordError] = useState('') 

  // --- INTERCEPTA ERROS DE LINK EXPIRADO NA URL ---
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('error_description')) {
      if (hash.includes('invalid+or+has+expired') || hash.includes('Token+expired')) {
        setErrorMessage('Este link de recuperação já foi utilizado ou expirou.')
      } else {
        setErrorMessage('Ocorreu um erro com o seu link de autenticação.')
      }
      // Limpa a URL para remover os códigos de erro e deixar o endereço limpo
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()

    let hasValidationErrors = false

    if (!email.trim()) {
      setEmailError('Preencha este campo.')
      hasValidationErrors = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Insira um email válido.')
      hasValidationErrors = true
    } else {
      setEmailError('')
    }

    if (mode !== 'recovery') {
      if (!password) {
        setPasswordError('Preencha este campo.')
        hasValidationErrors = true
      } else if (password.length < 8) {
        setPasswordError('A senha deve ter pelo menos 8 caracteres.')
        hasValidationErrors = true
      } else {
        setPasswordError('')
      }
    }

    if (hasValidationErrors) return

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    if (mode === 'recovery') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl,
      })

      if (error) {
        setErrorMessage('Ocorreu um erro ao tentar enviar o email.')
      } else {
        setSuccessMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
      }
      setLoading(false)
      return
    }

    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl },
        })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Email ou senha incorretos.')
      } else if (error.message.includes('User already registered')) {
        setErrorMessage('Este email já está cadastrado.')
      } else if (error.message.includes('Password should be at least')) {
        setPasswordError('A senha deve ter pelo menos 8 caracteres.')
      } else {
        setErrorMessage('Ocorreu um erro ao processar sua requisição.')
      }
    } else if (mode === 'register') {
      
      if (data?.user?.identities && data.user.identities.length === 0) {
        setErrorMessage('Este email já está cadastrado.')
        setLoading(false)
        return
      }

      setSuccessMessage('Conta criada com sucesso! Verifique seu email.')
      setEmail('')
      setPassword('')
    }
    
    setLoading(false)
  }

  const toggleMode = (newMode) => {
    setIsAnimating(true)
    setTimeout(() => {
      setMode(newMode)
      setErrorMessage('')
      setSuccessMessage('')
      setEmailError('')    
      setPasswordError('') 
      setEmail('')
      setPassword('')
      setIsAnimating(false)
    }, 300)
  }

  return {
    loading, email, setEmail, password, setPassword,
    mode, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    handleAuth, toggleMode
  }
}

// --- COMPONENTE VISUAL ---
export default function Auth() {
  const {
    loading, email, setEmail, password, setPassword,
    mode, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    handleAuth, toggleMode
  } = useAuthLogic()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] p-4 font-sans antialiased text-slate-200">
      <div className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-700/50 relative overflow-hidden">
        
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold text-cyan-400 tracking-[0.2em] uppercase mb-2">
            Nexo
          </h3>
        </div>

        <div className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              {mode === 'login' && 'Entrar no sistema'}
              {mode === 'register' && 'Criar nova conta'}
              {mode === 'recovery' && 'Recuperar senha'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed h-10">
              {mode === 'login' && 'Acesse seu dashboard e controle seus gastos.'}
              {mode === 'register' && 'Crie sua conta para acompanhar suas finanças e categorias.'}
              {mode === 'recovery' && 'Enviaremos um link para você redefinir sua senha.'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center text-red-400 text-sm shadow-inner">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center text-emerald-400 text-sm shadow-inner">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuth} noValidate className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                className={`w-full p-3.5 bg-[#0f172a] border ${emailError ? 'border-rose-500' : 'border-slate-700'} rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 text-base shadow-inner`}
                placeholder="seu@email.com"
                required
              />
              {emailError && (
                <span className="text-xs font-medium text-rose-500 mt-2 block px-1">
                  {emailError}
                </span>
              )}
            </div>
            
            {mode !== 'recovery' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError('') 
                  }}
                  className={`w-full p-3.5 bg-[#0f172a] border ${passwordError ? 'border-rose-500' : 'border-slate-700'} rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 text-base shadow-inner`}
                  placeholder="••••••••"
                  required={mode !== 'recovery'}
                />
                {passwordError && (
                  <span className="text-xs font-medium text-rose-500 mt-2 block px-1">
                    {passwordError}
                  </span>
                )}
                
                {/* Botão de Esqueci a senha */}
                {mode === 'login' && (
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => toggleMode('recovery')} className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                      Esqueci a senha?
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isAnimating}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold p-3.5 rounded-xl hover:from-blue-500 hover:to-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 mt-4 text-base flex justify-center items-center shadow-lg shadow-blue-500/25"
            >
              {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Enviar link de recuperação'}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
          {mode === 'recovery' ? (
            <button
              onClick={() => toggleMode('login')}
              type="button"
              disabled={isAnimating}
              className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 mx-auto disabled:cursor-wait"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Voltar ao Login
            </button>
          ) : (
            <button
              onClick={() => toggleMode(mode === 'login' ? 'register' : 'login')}
              type="button"
              disabled={isAnimating}
              className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors disabled:cursor-wait"
            >
              {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
              <span className="text-cyan-400 underline decoration-cyan-400/30 underline-offset-4">
                {mode === 'login' ? 'Cadastre-se' : 'Entre aqui'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}