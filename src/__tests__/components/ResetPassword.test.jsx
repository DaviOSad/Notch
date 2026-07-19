import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPassword from '../../components/ResetPassword'
import { vi } from 'vitest'
import { supabase } from '../../supabaseClient'

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

describe('ResetPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar a tela de redefinição de senha', () => {
    render(<ResetPassword onComplete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /Definir nova senha/i })).toBeInTheDocument()
  })

  it('deve exibir erro se a senha tiver menos de 8 caracteres', async () => {
    const user = userEvent.setup()
    render(<ResetPassword onComplete={vi.fn()} />)

    const inputs = screen.getAllByPlaceholderText(/••••••••/i)
    await user.type(inputs[0], '1234567') // 7 caracteres
    await user.type(inputs[1], '1234567')
    
    await user.click(screen.getByRole('button', { name: /Salvar e Acessar/i }))

    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('deve exibir erro se as senhas não coincidirem', async () => {
    const user = userEvent.setup()
    render(<ResetPassword onComplete={vi.fn()} />)

    const inputs = screen.getAllByPlaceholderText(/••••••••/i)
    await user.type(inputs[0], 'senhaforte123')
    await user.type(inputs[1], 'senhaerrada321')
    
    await user.click(screen.getByRole('button', { name: /Salvar e Acessar/i }))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('deve exibir erro caso a API do Supabase falhe na atualização', async () => {
    const user = userEvent.setup()
    
    supabase.auth.updateUser.mockResolvedValueOnce({ error: { message: 'Token expirado ou erro de rede' } })

    render(<ResetPassword onComplete={vi.fn()} />)

    const inputs = screen.getAllByPlaceholderText(/••••••••/i)
    await user.type(inputs[0], 'senhaforte123')
    await user.type(inputs[1], 'senhaforte123')
    
    await user.click(screen.getByRole('button', { name: /Salvar e Acessar/i }))

    expect(await screen.findByText(/Erro ao atualizar a senha: Token expirado ou erro de rede/i)).toBeInTheDocument()
  })

  it('deve chamar supabase.auth.updateUser e onComplete com sucesso', async () => {
    const user = userEvent.setup()
    const mockOnComplete = vi.fn()
    supabase.auth.updateUser.mockResolvedValueOnce({ error: null })

    render(<ResetPassword onComplete={mockOnComplete} />)

    const inputs = screen.getAllByPlaceholderText(/••••••••/i)
    await user.type(inputs[0], 'senhaforte123')
    await user.type(inputs[1], 'senhaforte123')
    
    await user.click(screen.getByRole('button', { name: /Salvar e Acessar/i }))

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'senhaforte123' })
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
    })
  })
})