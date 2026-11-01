import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../components/Dashboard'
import { vi } from 'vitest'

const categories = [
  { id: 1, name: 'Alimentação', type: 'expense', parent_id: null },
  { id: 2, name: 'Metas (Aportes)', type: 'expense', parent_id: null },
  { id: 3, name: 'Metas (Resgates)', type: 'income', parent_id: null },
  { id: 4, name: 'Salário', type: 'income', parent_id: null },
]

const row = (id, amount, description, category_id, type) =>
  ({ id, amount, description, expense_date: '2026-07-10', category_id, type, is_recurring: false })

// Receitas 1000, despesas 200, guardado em metas 300 − 100 = 200 → restante 600.
const expenses = [
  row(1, 1000, 'Salário de julho', 4, 'income'),
  row(2, 200, 'Mercado', 1, 'expense'),
  row(3, 300, 'Aporte: Viagem', 2, 'expense'),
  row(4, 100, 'Resgate: Viagem', 3, 'income'),
]

vi.mock('../../supabaseClient', () => {
  const chain = (table) => {
    const b = {
      select: () => b, order: () => b, lte: () => b, or: () => b, eq: () => b, insert: () => b, update: () => b, delete: () => b,
      then: (resolve) => resolve({ data: table === 'categories' ? categories : table === 'expenses' ? expenses : [], error: null }),
    }
    return b
  }
  return { supabase: { from: vi.fn(chain), auth: { signOut: vi.fn() } } }
})

describe('Movimentação de metas fora de Despesas/Receitas', () => {
  const session = { user: { id: 'u1', email: 'a@b.c' } }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 6, 20, 12))
  })
  afterEach(() => vi.useRealTimers())

  const renderDashboard = async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={session} />) })
    return user
  }
  // Os botões de filtro começam pelo nome; as linhas do histórico também são botões e uma
  // delas começa com "Metas (Aportes)", daí o padrão mais específico para Metas.
  const FILTERS = { Receitas: /^Receitas\s*R\$/, Despesas: /^Despesas\s*R\$/, Metas: /^Metas\s*(Guardado|Resgatado)/ }
  const filterButton = (name) => screen.getByRole('button', { name: FILTERS[name] })

  it('separa o total do mês em receitas, despesas e metas, sem mudar o restante', async () => {
    await renderDashboard()

    expect(filterButton('Receitas')).toHaveTextContent('R$ 1.000,00')
    expect(filterButton('Despesas')).toHaveTextContent('R$ 200,00')
    expect(filterButton('Metas')).toHaveTextContent('Guardado no mês')
    expect(filterButton('Metas')).toHaveTextContent('R$ 200,00')
    expect(screen.getByText('Restante do mês').nextElementSibling).toHaveTextContent('R$ 600,00')
  })

  it('a fita mostra o guardado como uma fatia de Metas', async () => {
    await renderDashboard()

    const tape = screen.getByRole('img', { name: /guardados nas metas/ })
    // Intl separa "R$" do número com um espaço não separável.
    expect(tape.getAttribute('aria-label').replace(/ /g, ' ')).toBe('R$ 200,00 gastos e R$ 200,00 guardados nas metas de R$ 1.000,00 recebidos.')
  })

  it('o filtro Metas mostra só aportes e resgates', async () => {
    const user = await renderDashboard()

    await user.click(filterButton('Metas'))

    expect(screen.getByText('Aporte: Viagem')).toBeInTheDocument()
    expect(screen.getByText('Resgate: Viagem')).toBeInTheDocument()
    expect(screen.queryByText('Mercado')).not.toBeInTheDocument()
    expect(screen.queryByText('Salário de julho')).not.toBeInTheDocument()
  })

  it('o filtro Despesas não inclui o aporte, e Receitas não inclui o resgate', async () => {
    const user = await renderDashboard()

    await user.click(filterButton('Despesas'))
    expect(screen.getByText('Mercado')).toBeInTheDocument()
    expect(screen.queryByText('Aporte: Viagem')).not.toBeInTheDocument()

    await user.click(filterButton('Receitas'))
    expect(screen.getByText('Salário de julho')).toBeInTheDocument()
    expect(screen.queryByText('Resgate: Viagem')).not.toBeInTheDocument()
  })

  it('no histórico o aporte não é pintado como despesa', async () => {
    await renderDashboard()

    const aporte = screen.getByText('Aporte: Viagem').closest('[role="button"]')
    const valor = within(aporte).getByText(/R\$\s*300,00/)
    expect(valor).not.toHaveClass('text-saida')
    expect(valor).not.toHaveClass('text-entrada')
  })

  it('a ficha de detalhes chama o aporte pelo nome, não de despesa', async () => {
    const user = await renderDashboard()

    await user.click(screen.getByText('Aporte: Viagem').closest('[role="button"]'))
    const panel = await screen.findByTestId('transaction-details')

    expect(within(panel).getByText('Aporte em meta')).toBeInTheDocument()
    expect(within(panel).queryByText('Despesa')).not.toBeInTheDocument()
  })
})
