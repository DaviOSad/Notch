import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  
  // Estados para as mensagens de feedback
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Email ou senha incorretos.')
      } else if (error.message.includes('User already registered')) {
        setErrorMessage('Este email já está cadastrado.')
      } else if (error.message.includes('Password should be at least')) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.')
      } else {
        setErrorMessage('Ocorreu um erro ao processar sua requisição.')
      }
    } else if (!isLogin) {
      setSuccessMessage('Conta criada com sucesso! Verifique seu email.')
      setEmail('')
      setPassword('')
    }
    
    setLoading(false)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] p-4 font-sans antialiased text-slate-200">
      <div className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-700/50">
        <div className="text-center mb-8">
          <h3 className="text-sm font-bold text-cyan-400 tracking-[0.2em] uppercase mb-2">
            Finanças Pessoais
          </h3>
          <h2 className="text-3xl font-extrabold text-white mb-3">
            {isLogin ? 'Entrar no sistema' : 'Criar nova conta'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Controle seus gastos, acompanhe por categoria e consulte o mês atual com facilidade.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center text-red-400 text-sm animate-fade-in shadow-inner">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center text-emerald-400 text-sm animate-fade-in shadow-inner">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 text-base shadow-inner"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 text-base shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold p-3.5 rounded-xl hover:from-blue-500 hover:to-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 mt-4 text-base flex justify-center items-center shadow-lg shadow-blue-500/25"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
          <button
            onClick={toggleMode}
            type="button"
            className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
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