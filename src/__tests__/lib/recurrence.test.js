import {
  buildMonthTransactions,
  computeAccumulatedBalance,
  countOccurrences,
  hasEndedBy,
} from '../../lib/recurrence'

const recurring = (overrides = {}) => ({
  id: 1,
  amount: 200,
  description: 'Parcela do notebook',
  expense_date: '2026-07-10',
  type: 'expense',
  is_recurring: true,
  recurrence_end_date: null,
  ...overrides,
})

const inMonth = (rows, year, month) =>
  buildMonthTransactions(rows, new Date(year, month, 1)).map((t) => t.expense_date)

describe('buildMonthTransactions — prazo da recorrência', () => {
  it('repete indefinidamente quando não há prazo', () => {
    const rows = [recurring()]
    expect(inMonth(rows, 2027, 11)).toEqual(['2027-12-10'])
  })

  // Compra em 6x a partir de julho/2026: última cobrança em dezembro/2026.
  it('inclui o mês do prazo e corta o seguinte', () => {
    const rows = [recurring({ recurrence_end_date: '2026-12-31' })]

    expect(inMonth(rows, 2026, 6)).toEqual(['2026-07-10'])
    expect(inMonth(rows, 2026, 11)).toEqual(['2026-12-10'])
    expect(inMonth(rows, 2027, 0)).toEqual([])
  })

  // O dia do prazo é irrelevante: o corte é sempre por mês.
  it('cobre o mês inteiro do prazo mesmo se o vencimento for depois do dia gravado', () => {
    const rows = [recurring({ expense_date: '2026-07-28', recurrence_end_date: '2026-12-05' })]
    expect(inMonth(rows, 2026, 11)).toEqual(['2026-12-28'])
  })

  it('não antecipa a recorrência para meses anteriores ao início', () => {
    const rows = [recurring({ recurrence_end_date: '2026-12-31' })]
    expect(inMonth(rows, 2026, 5)).toEqual([])
  })

  it('mantém o dia limitado ao último dia do mês dentro do prazo', () => {
    const rows = [recurring({ expense_date: '2026-01-31', recurrence_end_date: '2026-03-31' })]
    expect(inMonth(rows, 2026, 1)).toEqual(['2026-02-28'])
  })

  it('ignora o prazo em lançamentos não recorrentes', () => {
    const rows = [recurring({ is_recurring: false, recurrence_end_date: '2026-07-31' })]
    expect(inMonth(rows, 2026, 7)).toEqual([])
    expect(inMonth(rows, 2026, 6)).toEqual(['2026-07-10'])
  })
})

describe('hasEndedBy', () => {
  it('é falso sem prazo definido', () => {
    expect(hasEndedBy(null, 2030, 0)).toBe(false)
  })

  it('é falso no mês do prazo e verdadeiro no mês seguinte', () => {
    expect(hasEndedBy('2026-12-31', 2026, 11)).toBe(false)
    expect(hasEndedBy('2026-12-31', 2027, 0)).toBe(true)
  })
})

describe('computeAccumulatedBalance', () => {
  const balanceIn = (rows, year, month) => computeAccumulatedBalance(rows, new Date(year, month, 1))

  it('soma receitas e subtrai despesas de todos os meses, não só do visualizado', () => {
    const rows = [
      { amount: 1000, expense_date: '2026-05-05', type: 'income', is_recurring: false },
      { amount: 400, expense_date: '2026-06-10', type: 'expense', is_recurring: false },
      { amount: 100, expense_date: '2026-07-01', type: 'expense', is_recurring: false },
    ]
    expect(balanceIn(rows, 2026, 6)).toBe(500)
  })

  // Recorrente entra multiplicado pelas ocorrências já acontecidas.
  it('multiplica a recorrência pelos meses decorridos até o mês visualizado', () => {
    const rows = [recurring({ amount: 200, expense_date: '2026-07-10' })]

    expect(balanceIn(rows, 2026, 6)).toBe(-200)
    expect(balanceIn(rows, 2026, 9)).toBe(-800)
  })

  it('para de somar a recorrência depois do prazo', () => {
    const rows = [recurring({ amount: 200, recurrence_end_date: '2026-09-30' })]

    expect(balanceIn(rows, 2026, 8)).toBe(-600)
    expect(balanceIn(rows, 2027, 5)).toBe(-600)
  })

  it('ignora recorrências que ainda não começaram', () => {
    const rows = [recurring({ amount: 200, expense_date: '2026-09-10' })]
    expect(balanceIn(rows, 2026, 6)).toBe(0)
  })

  it('trata linha sem tipo como despesa', () => {
    const rows = [{ amount: 50, expense_date: '2026-07-01', is_recurring: false }]
    expect(balanceIn(rows, 2026, 6)).toBe(-50)
  })

  it('devolve zero sem lançamentos', () => {
    expect(balanceIn([], 2026, 6)).toBe(0)
    expect(balanceIn(null, 2026, 6)).toBe(0)
  })
})

describe('countOccurrences', () => {
  it('conta as duas pontas', () => {
    expect(countOccurrences(2026, 6, '2026-12-31')).toBe(6)
    expect(countOccurrences(2026, 6, '2026-07-31')).toBe(1)
  })

  it('devolve null sem prazo', () => {
    expect(countOccurrences(2026, 6, '')).toBeNull()
  })
})
