import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFinanceData } from '../../hooks/useFinanceData'

// `expenses` é respondido por `expensesHandler({ from, to, lte })`, que cada teste define.
let expensesHandler
vi.mock('../../supabaseClient', () => {
  const chain = (table) => {
    const q = { from: 0, to: Infinity, lte: null }
    const b = {
      select: () => b, order: () => b, eq: () => b,
      lte: (_col, v) => { q.lte = v; return b },
      range: (from, to) => { q.from = from; q.to = to; return b },
      then: (resolve, reject) =>
        Promise.resolve(table === 'expenses' ? expensesHandler(q) : { data: [{ id: 1, name: 'x' }], error: null }).then(resolve, reject),
    }
    return b
  }
  return { supabase: { from: vi.fn(chain) } }
})

const session = { user: { id: 'u1' } }
const row = (id, date = '2026-07-10') => ({ id, amount: 1, expense_date: date, type: 'expense', is_recurring: false })

describe('useFinanceData — leitura de lançamentos', () => {
  it('lê todas as páginas, sem parar no limite de 1000 linhas do Supabase', async () => {
    const all = Array.from({ length: 1005 }, (_, i) => row(i))
    // Como o PostgREST: sem `range`, no máximo 1000 linhas por resposta.
    expensesHandler = ({ from, to }) => ({ data: all.slice(from, Math.min(to, from + 999) + 1), error: null })

    const { result } = renderHook(() => useFinanceData(session, new Date(2026, 6, 15)))

    await waitFor(() => expect(result.current.transactions).toHaveLength(1005))
    expect(result.current.accumulatedBalance).toBe(-1005)
  })

  it('ignora a resposta de um mês antigo que chega depois da do mês atual', async () => {
    const resolvers = {}
    expensesHandler = ({ lte }) => new Promise((resolve) => { resolvers[lte] = resolve })

    const { result, rerender } = renderHook(({ d }) => useFinanceData(session, d), {
      initialProps: { d: new Date(2026, 6, 15) }, // julho
    })
    await waitFor(() => expect(resolvers['2026-07-31']).toBeDefined())
    rerender({ d: new Date(2026, 7, 15) }) // agosto
    await waitFor(() => expect(resolvers['2026-08-31']).toBeDefined())

    await act(async () => { resolvers['2026-08-31']({ data: [row(2, '2026-08-05')], error: null }) })
    await act(async () => { resolvers['2026-07-31']({ data: [row(1, '2026-07-05'), row(3, '2026-07-06')], error: null }) })

    expect(result.current.transactions.map((t) => t.id)).toEqual([2])
  })
})
