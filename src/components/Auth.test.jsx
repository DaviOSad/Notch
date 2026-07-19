import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from './Auth'
import { vi } from 'vitest'
import { supabase } from '../supabaseClient'

// Mock do cliente Supabase para isolar a autenticação
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    const toggleButton = screen.getByRole('button', { name: /Não tem conta\?/i })
    await user.click(toggleButton)

    // Aguarda o setTimeout de 300ms do toggleMode resolver
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Criar nova conta/i })).toBeInTheDocument()
    }, { timeout: 500 })
    
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
  })

  it('deve chamar signInWithPassword e exibir erro com credenciais inválidas', async () => {
    const user = userEvent.setup()
    
    // Simula uma resposta de erro do Supabase
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })

    render(<Auth />)

    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Senha/i)
    const submitBtn = screen.getByRole('button', { name: 'Entrar' })

    await user.type(emailInput, 'teste@email.com')
    await user.type(passwordInput, 'senha123')
    await user.click(submitBtn)

    // Verifica se a API foi chamada corretamente
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teste@email.com',
      password: 'senha123',
    })

    // Verifica se a mensagem de erro formatada apareceu na tela
    expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument()
  })

  it('deve chamar signUp e exibir mensagem de sucesso ao criar nova conta', async () => {
    const user = userEvent.setup()
    
    // Simula sucesso (error: null) no cadastro
    supabase.auth.signUp.mockResolvedValueOnce({ error: null })

    render(<Auth />)

    // Altera para o modo de cadastro
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/Email/i), 'novo@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    // Verifica chamada da API
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'novo@email.com',
      password: 'senha123',
    })

    // Verifica mensagem de sucesso
    expect(await screen.findByText('Conta criada com sucesso! Verifique seu email.')).toBeInTheDocument()
  })

  it('deve exibir erro quando o email já estiver cadastrado', async () => {
    const user = userEvent.setup()
    
    // Simula erro de email já existente
    supabase.auth.signUp.mockResolvedValueOnce({
      error: { message: 'User already registered' },
    })

    render(<Auth />)

    // Altera para modo de cadastro
    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/Email/i), 'existe@email.com')
    await user.type(screen.getByLabelText(/Senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    // Verifica mensagem de erro correspondente
    expect(await screen.findByText('Este email já está cadastrado.')).toBeInTheDocument()
  })

  it('deve exibir erro de senha muito curta', async () => {
    const user = userEvent.setup()
    
    // Simula erro de tamanho de senha do Supabase
    supabase.auth.signUp.mockResolvedValueOnce({
      error: { message: 'Password should be at least 8 characters' },
    })

    render(<Auth />)

    await user.click(screen.getByRole('button', { name: /Não tem conta\?/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/Email/i), 'teste@email.com')
    await user.type(screen.getByLabelText(/Senha/i), '123')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()
  })
})