import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../components/Dashboard'
import { vi } from 'vitest'

const categories = [
  { id: 1, name: 'Alimentação', type: 'expense', parent_id: null },
  { id: 3, name: 'Metas (Resgates)', type: 'income', parent_id: null },
]
const goals = [{ id: 7, name: 'Viagem', target_amount: 1000, current_amount: 300, currency: 'BRL', deadline: null }]

// Inserir em `expenses` falha; o resto responde normalmente.
vi.mock('../../supabaseClient', () => {
  const chain = (table) => {
    let inserting = false
    const b = {
      select: () => b, order: () => b, lte: () => b, range: () => b, or: () => b, eq: () => b, update: () => b, delete: () => b,
      insert: () => { inserting = true; return b },
      then: (resolve) => {
        if (table === 'expenses' && inserting) return resolve({ data: null, error: { message: 'falhou' } })
        resolve({ data: table === 'categories' ? categories : table === 'goals' ? goals : [], error: null })
      },
    }
    return b
  }
  return { supabase: { from: vi.fn(chain), auth: { signOut: vi.fn() } } }
})

describe('Excluir meta com saldo', () => {
  it('avisa quando o resgate automático não pôde ser registrado', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={{ user: { id: 'u1', email: 'a@b.c' } }} />) })

    await user.click(screen.getByRole('button', { name: 'Excluir meta Viagem' }))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText(/Erro ao registrar o resgate/)).toBeInTheDocument()
  })
})
