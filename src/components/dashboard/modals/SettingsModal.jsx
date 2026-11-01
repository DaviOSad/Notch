import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { supabase } from '../../../supabaseClient'
import Alert from '../../ui/Alert'
import Field from '../../ui/Field'
import Modal from '../../ui/Modal'
import ConfirmDialog from './ConfirmDialog'
import ErrorDialog from './ErrorDialog'

export default function SettingsModal({ session, onClose, onExportCSV }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const clearPasswordFeedback = () => { setPasswordError(''); setPasswordSuccess('') }

  // A conta e todos os dados são apagados por uma função no banco (SECURITY DEFINER),
  // pois o cliente nunca tem a service role key para chamar supabase.auth.admin.deleteUser.
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    const { error } = await supabase.rpc('delete_own_account')

    if (error) {
      setIsDeletingAccount(false)
      setShowDeleteConfirm(false)
      setDeleteError('Erro ao excluir conta: ' + error.message)
      return
    }

    await supabase.auth.signOut()
  }

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
    <>
      <Modal title="Configurações" onClose={onClose} width="md:max-w-lg">
        <div className="flex flex-col divide-y divide-linha">
          <section className="pb-6">
            <h3 className="mb-3 font-display text-lg font-bold">Perfil</h3>
            <p className="text-sm text-neblina">E-mail conectado</p>
            <p className="mb-5 break-all font-medium">{session?.user?.email || 'Usuário'}</p>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-neblina">Senha</p>
                <p className="font-medium tracking-[0.2em]">••••••••</p>
              </div>
              <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="btn-neutro !px-3 !py-2">
                {isChangingPassword ? 'Cancelar' : 'Alterar senha'}
              </button>
            </div>

            {isChangingPassword && (
              <form onSubmit={handleUpdatePassword} noValidate className="mt-5 flex animate-surge flex-col gap-3">
                <Field label="Nova senha" hideLabel type="password" autoComplete="new-password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); clearPasswordFeedback() }} placeholder="Nova senha" />
                <Field label="Confirmar nova senha" hideLabel type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearPasswordFeedback() }} placeholder="Confirmar nova senha" />
                {passwordError && <Alert>{passwordError}</Alert>}
                {passwordSuccess && <Alert tone="success">{passwordSuccess}</Alert>}
                <button type="submit" disabled={isUpdatingPassword} className="btn-primario">{isUpdatingPassword ? 'Atualizando...' : 'Salvar nova senha'}</button>
              </form>
            )}
          </section>

          <section className="py-6">
            <h3 className="mb-3 font-display text-lg font-bold">Dados</h3>
            <button onClick={onExportCSV} className="group flex w-full items-center justify-between gap-4 rounded-xl border border-linha bg-white px-4 py-3 text-left transition-colors hover:bg-pagina">
              <span className="flex flex-col"><span className="font-medium">Exportar Lançamentos</span><span className="text-sm text-neblina">Baixar histórico deste mês em .csv</span></span>
              <Download size={18} className="shrink-0 text-neblina" />
            </button>
          </section>

          <section className="pt-6">
            <h3 className="mb-3 font-display text-lg font-bold">Zona de risco</h3>
            <button onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-saida/40 px-4 py-3 text-left transition-colors hover:bg-saida/10">
              <span className="flex flex-col"><span className="font-medium text-saida">Excluir conta</span><span className="text-sm text-neblina">Remove sua conta e todos os dados permanentemente</span></span>
              <Trash2 size={18} className="shrink-0 text-saida" />
            </button>
          </section>
        </div>
      </Modal>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Excluir conta"
          message={<>Tem certeza que deseja excluir sua conta? Todos os seus lançamentos, categorias e metas serão apagados <span className="font-bold text-tinta">permanentemente</span>. Esta ação não pode ser desfeita.</>}
          isBusy={isDeletingAccount}
          confirmLabel="Excluir conta"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {deleteError && <ErrorDialog message={deleteError} onClose={() => setDeleteError('')} />}
    </>
  )
}
