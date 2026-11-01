import { getCategoryGroup, getGroupedRootCategories, isGoalTransaction, isSystemCategory } from '../../lib/categories'
import { GOAL_DEPOSIT_CATEGORY, GOAL_WITHDRAWAL_CATEGORY } from '../../lib/constants'

const cat = (id, name, type = 'expense', parent_id = null) => ({ id, name, type, parent_id })

describe('isSystemCategory', () => {
  it('reconhece as categorias criadas pelas movimentações de metas', () => {
    expect(isSystemCategory(cat(1, GOAL_DEPOSIT_CATEGORY))).toBe(true)
    expect(isSystemCategory(cat(2, GOAL_WITHDRAWAL_CATEGORY, 'income'))).toBe(true)
  })

  it('não confunde categorias do usuário, nem subcategorias homônimas', () => {
    expect(isSystemCategory(cat(3, 'Alimentação'))).toBe(false)
    expect(isSystemCategory(cat(4, GOAL_DEPOSIT_CATEGORY, 'expense', 9))).toBe(false)
  })
})

describe('getCategoryGroup', () => {
  it('separa despesas, receitas e metas', () => {
    expect(getCategoryGroup(cat(1, 'Mercado'))).toBe('Despesas')
    expect(getCategoryGroup(cat(2, 'Salário', 'income'))).toBe('Receitas')
    expect(getCategoryGroup(cat(3, GOAL_WITHDRAWAL_CATEGORY, 'income'))).toBe('Metas')
  })
})

describe('getGroupedRootCategories', () => {
  const all = [
    cat(1, GOAL_DEPOSIT_CATEGORY),
    cat(2, 'Alimentação'),
    cat(3, 'Salário', 'income'),
    cat(4, 'Almoço', 'expense', 2),
    cat(5, GOAL_WITHDRAWAL_CATEGORY, 'income'),
    cat(6, 'Transporte'),
  ]

  it('devolve só raízes, na ordem Despesas, Receitas, Metas', () => {
    expect(getGroupedRootCategories(all).map((c) => [c.group, c.name])).toEqual([
      ['Despesas', 'Alimentação'],
      ['Despesas', 'Transporte'],
      ['Receitas', 'Salário'],
      ['Metas', GOAL_DEPOSIT_CATEGORY],
      ['Metas', GOAL_WITHDRAWAL_CATEGORY],
    ])
  })

  it('mantém a ordem original dentro de cada grupo', () => {
    const names = getGroupedRootCategories(all).filter((c) => c.group === 'Despesas').map((c) => c.name)
    expect(names).toEqual(['Alimentação', 'Transporte'])
  })
})

describe('isGoalTransaction', () => {
  const categories = [cat(1, 'Alimentação'), cat(2, GOAL_DEPOSIT_CATEGORY), cat(3, GOAL_WITHDRAWAL_CATEGORY, 'income')]

  it('é verdadeiro para aportes e resgates de metas', () => {
    expect(isGoalTransaction({ category_id: 2 }, categories)).toBe(true)
    expect(isGoalTransaction({ category_id: 3 }, categories)).toBe(true)
  })

  it('é falso para lançamentos comuns, sem categoria ou com categoria desconhecida', () => {
    expect(isGoalTransaction({ category_id: 1 }, categories)).toBe(false)
    expect(isGoalTransaction({ category_id: null }, categories)).toBe(false)
    expect(isGoalTransaction({ category_id: 99 }, categories)).toBe(false)
  })

  // Ids vindos de <select> são strings; os do banco, números.
  it('compara ids como texto', () => {
    expect(isGoalTransaction({ category_id: '2' }, categories)).toBe(true)
  })
})
