import { buildCategoryColorMap, buildSpendTape, matchesTypeFilter, spendByCategory, summarizeMonth, withGoals } from '../../lib/summary'
import { COLORS, GOAL_DEPOSIT_CATEGORY, GOAL_WITHDRAWAL_CATEGORY, UNCATEGORIZED_COLOR, UNCATEGORIZED_LABEL } from '../../lib/constants'

const tx = (type, amount, category_id = 1) => ({ type, amount, category_id })

const categories = [
  { id: 1, name: 'Moradia', parent_id: null },
  { id: 2, name: 'Aluguel', parent_id: 1 },
  { id: 3, name: 'Lazer', parent_id: null },
  { id: 10, name: GOAL_DEPOSIT_CATEGORY, type: 'expense', parent_id: null },
  { id: 11, name: GOAL_WITHDRAWAL_CATEGORY, type: 'income', parent_id: null },
]

describe('summarizeMonth', () => {
  it('soma receitas e despesas e calcula o restante', () => {
    const rows = [tx('income', 5000), tx('expense', 1200), tx('expense', 300.5)]
    expect(summarizeMonth(rows)).toEqual({ income: 5000, expense: 1500.5, goals: 0, remaining: 3499.5 })
  })

  // Linhas antigas sem `type` sempre foram tratadas como despesa.
  it('trata lançamento sem tipo como despesa', () => {
    expect(summarizeMonth([{ amount: 40 }])).toEqual({ income: 0, expense: 40, goals: 0, remaining: -40 })
  })

  it('aceita valores numéricos vindos como texto do banco', () => {
    expect(summarizeMonth([tx('income', '100.10'), tx('expense', '0.10')]).remaining).toBeCloseTo(100)
  })
})

describe('valores inválidos', () => {
  it('conta amount nulo ou não numérico como zero, sem contaminar o mês', () => {
    const rows = [tx('income', 100), { type: 'expense', amount: null }, tx('expense', 'abc'), tx('expense', 30)]
    expect(summarizeMonth(rows)).toEqual({ income: 100, expense: 30, goals: 0, remaining: 70 })
  })

  it('ignora na fita categorias cujo total não é positivo', () => {
    const rows = [tx('expense', 50, 3), tx('expense', 20, 1), tx('expense', -20, 1), tx('expense', null, 1)]
    expect(spendByCategory(rows, categories)).toEqual([{ name: 'Lazer', value: 50 }])
  })
})

describe('spendByCategory', () => {
  it('agrupa despesas pela categoria macro, da maior para a menor', () => {
    const rows = [tx('expense', 100, 3), tx('expense', 300, 2), tx('expense', 50, 1), tx('income', 999, 1)]
    expect(spendByCategory(rows, categories)).toEqual([
      { name: 'Moradia', value: 350 },
      { name: 'Lazer', value: 100 },
    ])
  })

  it('junta lançamentos sem categoria sob o rótulo padrão', () => {
    expect(spendByCategory([tx('expense', 10, 999)], categories)).toEqual([
      { name: UNCATEGORIZED_LABEL, value: 10 },
    ])
  })
})

describe('buildSpendTape', () => {
  const spend = [{ name: 'Moradia', value: 600 }, { name: 'Lazer', value: 200 }]

  it('usa a receita como largura total e deixa o que sobrou livre', () => {
    const tape = buildSpendTape(spend, 1000)
    expect(tape.overflow).toBe(false)
    expect(tape.segments.map((s) => s.share)).toEqual([60, 20])
    expect(tape.free).toBe(20)
  })

  it('estoura a fita quando gasta mais do que recebe, sem espaço livre', () => {
    const tape = buildSpendTape(spend, 400)
    expect(tape.overflow).toBe(true)
    expect(tape.free).toBe(0)
    expect(tape.segments.map((s) => s.share)).toEqual([75, 25])
  })

  it('sem receita, a despesa ocupa a fita inteira e conta como estouro', () => {
    const tape = buildSpendTape(spend, 0)
    expect(tape.overflow).toBe(true)
    expect(tape.segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100)
  })

  // 0,10 + 0,20 dá 0.30000000000000004 em ponto flutuante: não pode virar "estouro".
  it('não acusa estouro quando despesa e receita são iguais ao centavo', () => {
    const tape = buildSpendTape([{ name: 'A', value: 0.1 }, { name: 'B', value: 0.2 }], 0.3)
    expect(tape.overflow).toBe(false)
    expect(tape.free).toBe(0)
  })

  it('devolve fita vazia quando não há movimento', () => {
    expect(buildSpendTape([], 0)).toEqual({ segments: [], free: 0, overflow: false })
  })

  it('com receita e sem gasto, a fita fica toda livre', () => {
    expect(buildSpendTape([], 800)).toEqual({ segments: [], free: 100, overflow: false })
  })
})

describe('buildCategoryColorMap', () => {
  it('atribui cores fixas por ordem alfabética, independente do mês', () => {
    const map = buildCategoryColorMap(categories)
    expect(map.Lazer).toBe(COLORS[0])
    expect(map.Moradia).toBe(COLORS[1])
    expect(map[UNCATEGORIZED_LABEL]).toBe(UNCATEGORIZED_COLOR)
  })

  it('ignora subcategorias', () => {
    expect(buildCategoryColorMap(categories).Aluguel).toBeUndefined()
  })
})

describe('movimentações de metas', () => {
  const rows = [
    tx('income', 6000, 1),
    tx('expense', 1000, 1),
    tx('expense', 500, 10), // aporte
    tx('income', 150, 11), // resgate
  ]

  it('saem de receitas e despesas e viram o líquido guardado em metas', () => {
    expect(summarizeMonth(rows, categories)).toEqual({ income: 6000, expense: 1000, goals: 350, remaining: 4650 })
  })

  // O dinheiro guardado já saiu da conta: o restante é o mesmo de antes da separação.
  it('mantém o restante do mês igual ao de contar tudo como despesa/receita', () => {
    const naive = summarizeMonth(rows, [])
    expect(summarizeMonth(rows, categories).remaining).toBe(naive.remaining)
  })

  it('resgate maior que o aporte dá líquido negativo', () => {
    expect(summarizeMonth([tx('income', 800, 11), tx('expense', 300, 10)], categories).goals).toBe(-500)
  })

  it('não entram no gasto por categoria', () => {
    expect(spendByCategory(rows, categories)).toEqual([{ name: 'Moradia', value: 1000 }])
  })
})

describe('withGoals', () => {
  const spend = [{ name: 'Moradia', value: 1000 }]

  it('guardado vira uma fatia própria da fita', () => {
    expect(withGoals(spend, 6000, 350)).toEqual({
      spend: [{ name: 'Moradia', value: 1000 }, { name: 'Metas', value: 350, isGoals: true }],
      income: 6000,
    })
  })

  it('resgate líquido soma à receita da fita em vez de gerar fatia', () => {
    expect(withGoals(spend, 6000, -500)).toEqual({ spend, income: 6500 })
  })

  it('sem movimento de metas, nada muda', () => {
    expect(withGoals(spend, 6000, 0)).toEqual({ spend, income: 6000 })
  })

  it('a fita fecha com o restante do mês', () => {
    const { spend: s, income } = withGoals(spend, 6000, 350)
    expect(buildSpendTape(s, income).free).toBeCloseTo((4650 * 100) / 6000)
  })
})

describe('matchesTypeFilter', () => {
  const expense = { type: 'expense', category_id: 1 }
  const income = { type: 'income', category_id: 3 }
  const deposit = { type: 'expense', category_id: 10 }
  const withdrawal = { type: 'income', category_id: 11 }

  it('sem filtro, tudo passa', () => {
    ;[expense, income, deposit, withdrawal].forEach((t) => expect(matchesTypeFilter(t, '', categories)).toBe(true))
  })

  it('Despesas e Receitas deixam as metas de fora', () => {
    expect(matchesTypeFilter(expense, 'expense', categories)).toBe(true)
    expect(matchesTypeFilter(deposit, 'expense', categories)).toBe(false)
    expect(matchesTypeFilter(income, 'income', categories)).toBe(true)
    expect(matchesTypeFilter(withdrawal, 'income', categories)).toBe(false)
  })

  it('Metas mostra só aportes e resgates', () => {
    expect(matchesTypeFilter(deposit, 'goals', categories)).toBe(true)
    expect(matchesTypeFilter(withdrawal, 'goals', categories)).toBe(true)
    expect(matchesTypeFilter(expense, 'goals', categories)).toBe(false)
  })
})
