import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import SettingsModal from '../../components/dashboard/modals/SettingsModal'
import { supabase } from '../../supabaseClient'

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

const session = { user: { email: 'usuario@email.com' } }

describe('SettingsModal - Exclusão de conta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir o botão de excluir conta', () => {
    render(<SettingsModal session={session} onClose={vi.fn()} onExportCSV={vi.fn()} />)
    expect(screen.getByText('Excluir conta')).toBeInTheDocument()
  })

  it('deve pedir confirmação antes de excluir e não chamar a API ao cancelar', async () => {
    const user = userEvent.setup()
    render(<SettingsModal session={session} onClose={vi.fn()} onExportCSV={vi.fn()} />)

    await user.click(screen.getByText('Excluir conta'))
    expect(await screen.findByRole('heading', { name: 'Excluir conta' })).toBeInTheDocument()
    expect(screen.getByText(/não pode ser desfeita/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('heading', { name: 'Excluir conta' })).not.toBeInTheDocument()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('deve excluir a conta e encerrar a sessão ao confirmar', async () => {
    const user = userEvent.setup()
    supabase.rpc.mockResolvedValueOnce({ error: null })
    render(<SettingsModal session={session} onClose={vi.fn()} onExportCSV={vi.fn()} />)

    await user.click(screen.getByText('Excluir conta'))
    await user.click(screen.getByRole('button', { name: 'Excluir conta' }))

    expect(supabase.rpc).toHaveBeenCalledWith('delete_own_account')
    await vi.waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled())
  })

  it('deve exibir uma mensagem de erro e não encerrar a sessão se a exclusão falhar', async () => {
    const user = userEvent.setup()
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'falha no banco' } })
    render(<SettingsModal session={session} onClose={vi.fn()} onExportCSV={vi.fn()} />)

    await user.click(screen.getByText('Excluir conta'))
    await user.click(screen.getByRole('button', { name: 'Excluir conta' }))

    expect(await screen.findByText(/Erro ao excluir conta: falha no banco/i)).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })
})

describe('SettingsModal - Tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('alterna o modo escuro pelo interruptor de aparência', async () => {
    const user = userEvent.setup()
    render(<SettingsModal session={session} onClose={vi.fn()} onExportCSV={vi.fn()} />)

    const toggle = screen.getByRole('switch', { name: /modo escuro/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
