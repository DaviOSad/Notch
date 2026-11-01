import { getParentCategoryName, getRootCategories, isGoalTransaction, isSystemCategory } from './categories'
import { COLORS, GOALS_LABEL, UNCATEGORIZED_COLOR, UNCATEGORIZED_LABEL } from './constants'

// Linhas antigas sem `type` sempre foram despesas.
export const isExpense = (t) => t.type === 'expense' || !t.type

// Valor ausente ou não numérico vale zero: uma linha ruim não pode virar "R$ NaN" no mês.
const amountOf = (t) => {
  const value = Number(t.amount)
  return Number.isFinite(value) ? value : 0
}

const sum = (rows) => rows.reduce((total, t) => total + amountOf(t), 0)

/**
 * Totais do mês em três baldes: receitas, despesas e metas. `goals` é o líquido guardado
 * (aportes − resgates) e fica fora dos outros dois, mas ainda desconta do restante:
 * esse dinheiro já saiu da conta, então `remaining` não muda.
 */
export const summarizeMonth = (transactions, categories = []) => {
  const isGoal = (t) => isGoalTransaction(t, categories)
  const regular = transactions.filter((t) => !isGoal(t))
  const goalRows = transactions.filter(isGoal)

  const income = sum(regular.filter((t) => t.type === 'income'))
  const expense = sum(regular.filter(isExpense))
  const goals = sum(goalRows.filter(isExpense)) - sum(goalRows.filter((t) => t.type === 'income'))
  return { income, expense, goals, remaining: income - expense - goals }
}

// Filtro do histórico: '' (tudo), 'income', 'expense' ou 'goals'. Metas ficam só no seu.
export const matchesTypeFilter = (transaction, filterType, categories) => {
  if (!filterType) return true
  if (isGoalTransaction(transaction, categories)) return filterType === 'goals'
  if (filterType === 'goals') return false
  return filterType === 'income' ? transaction.type === 'income' : isExpense(transaction)
}

// Despesas agrupadas pela categoria macro (subcategorias somam no pai), da maior para a menor.
export const spendByCategory = (transactions, categories) => {
  const totals = {}
  transactions.filter((t) => isExpense(t) && !isGoalTransaction(t, categories)).forEach((t) => {
    const name = getParentCategoryName(categories, t.category_id)
    totals[name] = (totals[name] || 0) + amountOf(t)
  })
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    // Estorno maior que a despesa deixaria uma fatia negativa (largura inválida na fita).
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
}

// Cores fixas por categoria macro, para o mês seguinte não trocar a cor de ninguém.
export const buildCategoryColorMap = (categories) => {
  // As de metas ficam fora: não aparecem como categoria na fita, e não podem gastar cor.
  const names = Array.from(new Set(getRootCategories(categories).filter((c) => !isSystemCategory(c)).map((c) => c.name))).sort()
  const map = {}
  names.forEach((name, index) => { map[name] = COLORS[index % COLORS.length] })
  map[UNCATEGORIZED_LABEL] = UNCATEGORIZED_COLOR
  return map
}

// Para a fita fechar com o restante do mês: o que foi guardado vira uma fatia própria;
 // se saiu mais do que entrou nas metas, a diferença conta como receita extra.
export const withGoals = (spend, income, goals) =>
  goals > 0
    ? { spend: [...spend, { name: GOALS_LABEL, value: goals, isGoals: true }], income }
    : { spend, income: income - goals }

/**
 * Geometria da "fita do mês": a receita é a largura total e cada categoria ocupa a
 * sua fatia dela. `share` e `free` são porcentagens da fita. Quando a despesa passa
 * da receita a fita é a própria despesa (nada livre) e `overflow` avisa o estouro.
 */
export const buildSpendTape = (spend, income) => {
  const expense = spend.reduce((total, s) => total + s.value, 0)
  // Soma de decimais em ponto flutuante deriva (0,1 + 0,2 > 0,3): compara em centavos.
  const cents = (value) => Math.round(value * 100)
  const scale = Math.max(income, expense)
  if (scale === 0) return { segments: [], free: 0, overflow: false }

  return {
    segments: spend.map((s) => ({ ...s, share: (s.value * 100) / scale })),
    free: (Math.max(income - expense, 0) * 100) / scale,
    overflow: cents(expense) > cents(income),
  }
}
