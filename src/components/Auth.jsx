import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  
  // Novos estados para controle de mensagens da UI
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
      // Traduzindo mensagens comuns de erro do Supabase para melhorar a UX
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Email ou senha incorretos.')
      } else if (error.message.includes('User already registered')) {
        setErrorMessage('Este email já está cadastrado.')
      } else if (error.message.includes('Password should be at least')) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.')
      } else {
        setErrorMessage(error.message)
      }
    } else if (!isLogin) {
      setSuccessMessage('Sucesso! Verifique seu email para confirmar o cadastro.')
      // Limpa os campos após sucesso no cadastro
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {isLogin 
              ? 'Acesse seu dashboard financeiro' 
              : 'Comece a controlar seus gastos hoje mesmo'}
          </p>
        </div>

        {/* Caixa de Erro */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700 animate-fade-in">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Caixa de Sucesso */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start text-green-700 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold p-3 rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-200 flex justify-center items-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              isLogin ? 'Entrar' : 'Cadastrar'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            type="button"
            className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  )
}