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
      // Traduz os erros mais comuns
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-[#0a0f1c] p-4 font-sans">
      <div className="w-full max-w-md bg-[#111827]/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-800">
        <div className="text-center mb-8">
          <h3 className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase mb-3">
            Finanças Pessoais
          </h3>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Entrar no dashboard' : 'Criar nova conta'}
          </h2>
          <p className="text-xs text-slate-400">
            Controle seus gastos, acompanhe por categoria e consulte o mês atual.
          </p>
        </div>

        {/* Caixa de Erro */}
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center text-red-400 text-sm animate-fade-in">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Caixa de Sucesso */}
        {successMessage && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center text-emerald-400 text-sm animate-fade-in">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#0f172a] border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors outline-none text-white placeholder-slate-600 text-sm"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#0f172a] border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors outline-none text-white placeholder-slate-600 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium p-3 rounded-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 mt-2 text-sm flex justify-center items-center"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            type="button"
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  )
}