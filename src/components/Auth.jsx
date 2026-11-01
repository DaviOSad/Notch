import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Alert from './ui/Alert'
import AuthLayout from './ui/AuthLayout'
import Field from './ui/Field'

// window.location.origin não inclui o path do GitHub Pages (/Finances-Dashboard/);
// sem o BASE_URL o link do email cai na raiz do domínio e dá 404.
const authRedirectUrl = window.location.origin + import.meta.env.BASE_URL

// --- CUSTOM HOOK PARA LÓGICA DE AUTENTICAÇÃO ---
function useAuthLogic() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')

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

    if (mode === 'register') {
      if (confirmPassword !== password) {
        setConfirmError('As senhas não coincidem.')
        hasValidationErrors = true
      } else {
        setConfirmError('')
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
        setErrorMessage(error.status === 429
          ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
          : 'Ocorreu um erro ao tentar enviar o email.')
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
      if (error.status === 429) {
        setErrorMessage('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.')
      } else if (error.message.includes('Invalid login credentials')) {
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
      setConfirmPassword('')
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
      setConfirmError('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setIsAnimating(false)
    }, 300)
  }

  return {
    loading, email, setEmail, password, setPassword,
    mode, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    confirmPassword, setConfirmPassword, confirmError, setConfirmError,
    handleAuth, toggleMode
  }
}

// --- COMPONENTE VISUAL ---
const TITLES = {
  login: 'Entrar no sistema',
  register: 'Criar nova conta',
  recovery: 'Recuperar senha',
}

const SUBTITLES = {
  login: 'Acesse seu dashboard e controle seus gastos.',
  register: 'Crie sua conta para acompanhar suas finanças e categorias.',
  recovery: 'Enviaremos um link para você redefinir sua senha.',
}

const SUBMIT_LABELS = {
  login: 'Entrar',
  register: 'Cadastrar',
  recovery: 'Enviar link de recuperação',
}

export default function Auth() {
  const {
    loading, email, setEmail, password, setPassword,
    mode, isAnimating, errorMessage, successMessage,
    emailError, setEmailError, passwordError, setPasswordError,
    confirmPassword, setConfirmPassword, confirmError, setConfirmError,
    handleAuth, toggleMode
  } = useAuthLogic()

  const footer = mode === 'recovery' ? (
    <button
      onClick={() => toggleMode('login')}
      type="button"
      disabled={isAnimating}
      className="flex items-center gap-2 text-sm font-medium text-neblina transition-colors hover:text-tinta disabled:cursor-wait"
    >
      <ArrowLeft size={16} />
      Voltar ao Login
    </button>
  ) : (
    <button
      onClick={() => toggleMode(mode === 'login' ? 'register' : 'login')}
      type="button"
      disabled={isAnimating}
      className="text-sm font-medium text-neblina transition-colors hover:text-tinta disabled:cursor-wait"
    >
      {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
      <span className="font-semibold text-tinta underline decoration-caju decoration-2 underline-offset-4">
        {mode === 'login' ? 'Cadastre-se' : 'Entre aqui'}
      </span>
    </button>
  )

  return (
    <AuthLayout title={TITLES[mode]} subtitle={SUBTITLES[mode]} footer={footer} fading={isAnimating}>
      <div>
        {errorMessage && <Alert className="mb-5">{errorMessage}</Alert>}
        {successMessage && <Alert tone="success" className="mb-5">{successMessage}</Alert>}

        <form onSubmit={handleAuth} noValidate className="flex flex-col gap-5">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
            }}
            error={emailError}
            placeholder="seu@email.com"
            required
          />

          {mode !== 'recovery' && (
            <div>
              <Field
                label="Senha"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                error={passwordError}
                placeholder="••••••••"
                required
              />
              {mode === 'login' && (
                <button type="button" onClick={() => toggleMode('recovery')} className="mt-3 text-sm font-medium text-neblina underline underline-offset-4 transition-colors hover:text-tinta">
                  Esqueci a senha?
                </button>
              )}
            </div>
          )}

          {mode === 'register' && (
            <Field
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (confirmError) setConfirmError('')
              }}
              error={confirmError}
              placeholder="••••••••"
              required
            />
          )}

          <button type="submit" disabled={loading || isAnimating} className="btn-destaque mt-1 py-3.5 text-base">
            {loading ? 'Processando...' : SUBMIT_LABELS[mode]}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
