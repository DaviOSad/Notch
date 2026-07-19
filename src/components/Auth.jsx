import { useState } from 'react'
import { supabase } from '../supabaseClient'

// --- CUSTOM HOOK PARA LÓGICA DE AUTENTICAÇÃO ---
function useAuthLogic() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Estados para as mensagens de feedback
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [emailError, setEmailError] = useState('')       // Estado para erro no input de Email
  const [passwordError, setPasswordError] = useState('') // Estado para erro no input de Senha

  const handleAuth = async (e) => {
    e.preventDefault()

    let hasValidationErrors = false

    // 1. Validação Manual do Email
    if (!email.trim()) {
      setEmailError('Preencha este campo.')
      hasValidationErrors = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Insira um email válido.')
      hasValidationErrors = true
    } else {
      setEmailError('')
    }

    // 2. Validação Manual da Senha
    if (!password) {
      setPasswordError('Preencha este campo.')
      hasValidationErrors = true
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.')
      hasValidationErrors = true
    } else {
      setPasswordError('')
    }

    // Se houver erros nos inputs, interrompe antes de chamar o banco de dados
    if (hasValidationErrors) return

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    // Capturamos o 'data' além do 'error'
    const { data, error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Email ou senha incorretos.')
      } else if (error.message.includes('User already registered')) {
        setErrorMessage('Este email já está cadastrado.')
      } else if (error.message.includes('Password should be at least')) {
        setPasswordError('A senha deve ter pelo menos 6 caracteres.')
      } else {
        setErrorMessage('Ocorreu um erro ao processar sua requisição.')
      }
    } else if (!isLogin) {
      
      // Verificação do bloqueio anti-enumeração do Supabase
      if (data?.user?.identities && data.user.identities.length === 0) {
        setErrorMessage('Este email já está cadastrado.')
        setLoading(false)
        return // Interrompe a execução para não mostrar o alerta verde
      }

      setSuccessMessage('Conta criada com sucesso! Verifique seu email.')
      setEmail('')
      setPassword('')
    }
    
    setLoading(false)
  }

  const toggleMode = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsLogin(!isLogin)
      setErrorMessage('')
      setSuccessMessage('')
      setEmailError('')    // Limpa o erro de email ao trocar de tela
      setPasswordError('') // Limpa o erro de senha ao trocar de tela
      setEmail('')
      setPassword('')
      setIsAnimating(false)
    }, 300)
  }

  return {
    loading, email, setEmail, password, setPassword,
    isLogin, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    handleAuth, toggleMode
  }
}

// --- COMPONENTE VISUAL ---
export default function Auth() {
  const {
    loading, email, setEmail, password, setPassword,
    isLogin, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    handleAuth, toggleMode
  } = useAuthLogic()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] p-4 font-sans antialiased text-slate-200">
      <div className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-700/50">
        
        {/* Header Fixo */}
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold text-cyan-400 tracking-[0.2em] uppercase mb-2">
            Nexo
          </h3>
        </div>

        {/* Área Animada */}
        <div className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              {isLogin ? 'Entrar no sistema' : 'Criar nova conta'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed h-10">
              {isLogin 
                ? 'Acesse seu dashboard e controle seus gastos.' 
                : 'Crie sua conta para acompanhar suas finanças e categorias.'}
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

          {/* Adicionado noValidate para desativar os tooltips do navegador */}
          <form onSubmit={handleAuth} noValidate className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('') // Limpa o erro ao digitar
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('') // Limpa o erro ao digitar
                }}
                className={`w-full p-3.5 bg-[#0f172a] border ${passwordError ? 'border-rose-500' : 'border-slate-700'} rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 text-base shadow-inner`}
                placeholder="••••••••"
                required
              />
              {passwordError && (
                <span className="text-xs font-medium text-rose-500 mt-2 block px-1">
                  {passwordError}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || isAnimating}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold p-3.5 rounded-xl hover:from-blue-500 hover:to-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 mt-4 text-base flex justify-center items-center shadow-lg shadow-blue-500/25"
            >
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
        </div>
        
        {/* Footer de Navegação */}
        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
          <button
            onClick={toggleMode}
            type="button"
            disabled={isAnimating}
            className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors disabled:cursor-wait"
          >
            {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
            <span className="text-cyan-400 underline decoration-cyan-400/30 underline-offset-4">
              {isLogin ? 'Cadastre-se' : 'Entre aqui'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}