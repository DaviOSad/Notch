import { useState } from 'react'
import { Download, User, X } from 'lucide-react'
import { supabase } from '../../../supabaseClient'

export default function SettingsModal({ session, onClose, onExportCSV }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const clearPasswordFeedback = () => { setPasswordError(''); setPasswordSuccess('') }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    clearPasswordFeedback()

    if (newPassword.length < 8) return setPasswordError('A senha deve ter pelo menos 8 caracteres.')
    if (newPassword !== confirmPassword) return setPasswordError('As senhas não coincidem.')

    setIsUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsUpdatingPassword(false)

    if (error) return setPasswordError('Erro ao atualizar: ' + error.message)

    setPasswordSuccess('Senha atualizada com sucesso!')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => { setIsChangingPassword(false); setPasswordSuccess('') }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-slate-900 p-6 md:rounded-3xl rounded-t-3xl shadow-2xl transition-transform animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Configurações</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={16} /> Perfil</h3>
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-4">
              <div><p className="text-xs text-slate-400 mb-1">E-mail conectado</p><p className="text-sm font-medium text-white">{session?.user?.email || 'Usuário'}</p></div>
              <div className="h-px w-full bg-white/5" />
              <div>
                <p className="text-xs text-slate-400 mb-2">Senha</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white tracking-[0.2em] mt-1">••••••••</p>
                  <button onClick={() => setIsChangingPassword(!isChangingPassword)} className={`text-xs font-bold transition-colors ${isChangingPassword ? 'text-slate-400 hover:text-slate-300' : 'text-cyan-400 hover:text-cyan-300'}`}>{isChangingPassword ? 'Cancelar' : 'Alterar senha'}</button>
                </div>
              </div>
              {isChangingPassword && (
                <form onSubmit={handleUpdatePassword} noValidate className="mt-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                  <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); clearPasswordFeedback() }} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none border border-white/5" placeholder="Nova senha" />
                  <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearPasswordFeedback() }} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none border border-white/5" placeholder="Confirmar nova senha" />
                  {passwordError && <span className="text-xs font-medium text-rose-500 px-1">{passwordError}</span>}
                  {passwordSuccess && <span className="text-xs font-medium text-emerald-500 px-1">{passwordSuccess}</span>}
                  <button type="submit" disabled={isUpdatingPassword} className="mt-1 w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-white transition-colors">{isUpdatingPassword ? 'Atualizando...' : 'Salvar nova senha'}</button>
                </form>
              )}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Download size={16} /> Dados</h3>
            <button onClick={onExportCSV} className="w-full flex items-center justify-between bg-slate-950/50 hover:bg-slate-800 rounded-2xl p-4 border border-white/5 transition-colors group">
              <div className="flex flex-col items-start"><span className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Exportar Lançamentos</span><span className="text-xs text-slate-400">Baixar histórico deste mês em .csv</span></div>
              <Download size={18} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
