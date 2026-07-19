import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { vi } from 'vitest'

// 1. Mock do motor do Supabase que aceita métodos encadeados infinitamente
const mockSupabaseBuilder = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  // O 'then' transforma esse objeto em uma Promise que o React consegue dar await
  then: function(resolve) {
    resolve({ data: [], error: null })
  }
}

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    from: vi.fn(() => mockSupabaseBuilder)
  }
}))

describe('Dashboard Component - Fluxos Críticos', () => {
  const mockSession = { user: { id: 'test-user-id', email: 'teste@dcc.ufmg.br' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar a tela inicial corretamente', async () => {
    // Usamos o act para garantir que o teste espere o useEffect terminar de buscar os dados simulados
    await act(async () => {
      render(<Dashboard session={mockSession} />)
    })
    
    expect(screen.getByText('Finanças')).toBeInTheDocument()
    expect(screen.getByText('Saldo Atual (Acumulado)')).toBeInTheDocument()
  })

  it('deve validar formulário de novo lançamento (vazio)', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<Dashboard session={mockSession} />)
    })

    const fabButton = document.querySelector('button.fixed.bottom-6')
    await user.click(fabButton)

    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    await user.click(submitBtn)

    expect(await screen.findByText('Preencha um valor maior que zero.')).toBeInTheDocument()
    expect(await screen.findByText('Selecione uma categoria.')).toBeInTheDocument()
  })

  it('deve validar formulário de configuração de conta (senhas não coincidem)', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<Dashboard session={mockSession} />)
    })

    const settingsButton = document.querySelector('header button:first-of-type')
    await user.click(settingsButton)

    await user.click(screen.getByText('Alterar senha'))

    const newPassInput = screen.getByPlaceholderText('Nova senha')
    const confirmPassInput = screen.getByPlaceholderText('Confirmar nova senha')

    await user.type(newPassInput, 'senhaforte123')
    await user.type(confirmPassInput, 'senhaerrada321')

    await user.click(screen.getByRole('button', { name: /Salvar nova senha/i }))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
  })

  it('deve validar senha com menos de 6 caracteres', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<Dashboard session={mockSession} />)
    })

    await user.click(document.querySelector('header button:first-of-type'))
    await user.click(screen.getByText('Alterar senha'))

    const newPassInput = screen.getByPlaceholderText('Nova senha')
    const confirmPassInput = screen.getByPlaceholderText('Confirmar nova senha')

    await user.type(newPassInput, '123')
    await user.type(confirmPassInput, '123')

    await user.click(screen.getByRole('button', { name: /Salvar nova senha/i }))

    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument()
  })
})