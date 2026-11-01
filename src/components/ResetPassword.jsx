import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Alert from './ui/Alert'
import AuthLayout from './ui/AuthLayout'
import Field from './ui/Field'

export default function ResetPassword({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      return setError('A senha deve ter pelo menos 8 caracteres.')
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
    <AuthLayout title="Definir nova senha" subtitle="Crie uma nova senha segura para acessar sua conta.">
      {error && <Alert className="mb-5">{error}</Alert>}

      <form onSubmit={handleUpdate} noValidate className="flex flex-col gap-5">
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError('') }}
          placeholder="••••••••"
          required
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
          placeholder="••••••••"
          required
        />

        <button type="submit" disabled={loading} className="btn-destaque mt-1 py-3.5 text-base">
          {loading ? 'Salvando...' : 'Salvar e Acessar'}
        </button>
      </form>
    </AuthLayout>
  )
}
