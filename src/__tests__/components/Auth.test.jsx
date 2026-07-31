import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from '../../components/Auth'
import { vi } from 'vitest'
import { supabase } from '../../supabaseClient'

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '' 
  })

  it('deve renderizar a tela de login por padrão', () => {
    render(<Auth />)
    expect(screen.getByRole('heading', { name: /Entrar no sistema/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
  })

  it('deve alternar para o formulário de cadastro após a animação', async () => {
    const user = userEvent.setup()
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Criar nova conta/i })).toBeInTheDocument()
    }, { timeout: 500 })
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
  })

  it('deve chamar signInWithPassword e exibir erro com credenciais inválidas', async () => {
    const user = userEvent.setup()
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    render(<Auth />)
    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/Email ou senha incorretos/i)).toBeInTheDocument()
  })

  it('deve chamar signUp e exibir mensagem de sucesso ao criar nova conta', async () => {
    const user = userEvent.setup()
    supabase.auth.signUp.mockResolvedValueOnce({ data: { user: { identities: [{ id: '123' }] } }, error: null })
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument())
    await user.type(screen.getByLabelText(/Email/i), 'novo@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByText(/Conta criada com sucesso/i)).toBeInTheDocument()
  })

  it('deve exibir erro quando o email já estiver cadastrado', async () => {
    const user = userEvent.setup()
    supabase.auth.signUp.mockResolvedValueOnce({ data: { user: { identities: [] } }, error: null })
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument())
    await user.type(screen.getByLabelText(/Email/i), 'existe@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByText(/Este email já está cadastrado/i)).toBeInTheDocument()
  })

  it('deve validar no frontend a digitação de uma senha curta e exibir erro em vermelho', async () => {
    const user = userEvent.setup()
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument())
    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.type(screen.getByLabelText(/Senha/i), '1234567') // 7 caracteres
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByText(/A senha deve ter pelo menos 8 caracteres/i)).toBeInTheDocument()
  })

  it('deve alternar para recuperação de senha e chamar resetPasswordForEmail', async () => {
    const user = userEvent.setup()
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
    render(<Auth />)
    
    await user.click(screen.getByRole('button', { name: /Esqueci a senha/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Recuperar senha/i })).toBeInTheDocument())
    
    expect(screen.queryByLabelText(/Senha/i)).not.toBeInTheDocument()
    
    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))
    
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('teste@email.com', expect.any(Object))
    expect(await screen.findByText(/Email de recuperação enviado/i)).toBeInTheDocument()
  })

  it('deve exibir mensagem de limite de tentativas ao receber erro 429 no cadastro', async () => {
    const user = userEvent.setup()
    supabase.auth.signUp.mockResolvedValueOnce({ data: null, error: { status: 429, message: 'Email rate limit exceeded' } })
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument())
    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByText(/Muitas tentativas em pouco tempo/i)).toBeInTheDocument()
  })

  it('deve exibir mensagem de limite de tentativas ao receber erro 429 na recuperação de senha', async () => {
    const user = userEvent.setup()
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 429, message: 'Email rate limit exceeded' } })
    render(<Auth />)
    await user.click(screen.getByRole('button', { name: /Esqueci a senha/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Recuperar senha/i })).toBeInTheDocument())
    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))
    expect(await screen.findByText(/Muitas tentativas em pouco tempo/i)).toBeInTheDocument()
  })

  it('deve interceptar a URL e exibir erro de link expirado', async () => {
    window.location.hash = '#error_description=Email+link+is+invalid+or+has+expired'
    render(<Auth />)
    expect(await screen.findByText('Este link de recuperação já foi utilizado ou expirou.')).toBeInTheDocument()
  })
})