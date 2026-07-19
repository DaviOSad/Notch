import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ResetPassword({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres.')
    }
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.')
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Erro ao atualizar a senha: ' + error.message)
    } else {
      onComplete() // Atualizou com sucesso, vamos redirecionar para o Dashboard!
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] p-4 font-sans antialiased text-slate-200">
      <div className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-700/50">
        
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold text-cyan-400 tracking-[0.2em] uppercase mb-2">Nexo</h3>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white mb-3">Definir nova senha</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Crie uma nova senha segura para acessar sua conta.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center text-red-400 text-sm shadow-inner">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} noValidate className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nova Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none text-white placeholder-slate-600 shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold p-3.5 rounded-xl hover:from-emerald-400 hover:to-teal-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 shadow-lg shadow-emerald-500/25"
          >
            {loading ? 'Salvando...' : 'Salvar e Acessar'}
          </button>
        </form>
      </div>
    </div>
  )
}