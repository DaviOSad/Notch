import { SYSTEM_CATEGORY_NAMES, UNCATEGORIZED_LABEL } from './constants'

// Ids vindos de um <select> são strings, enquanto os do banco são números —
// compare sempre por aqui em vez de usar === direto.
export const sameId = (a, b) => String(a) === String(b)

export const findCategory = (categories, catId) => categories.find((c) => sameId(c.id, catId))

export const getRootCategories = (categories) => categories.filter((c) => !c.parent_id)

// Categorias de manutenção, criadas sozinhas pelas movimentações de metas. Não são
// escolhidas nem apagadas à mão: o usuário só as vê no histórico e no filtro.
export const isSystemCategory = (category) => !category.parent_id && SYSTEM_CATEGORY_NAMES.includes(category.name)

// Aporte/resgate de meta: um lançamento cuja categoria é de manutenção. É dinheiro que
// mudou de lugar (conta ⇄ caixinha), não gasto nem ganho — por isso tem balde próprio.
export const isGoalTransaction = (transaction, categories) => {
  if (transaction.category_id == null) return false
  const category = findCategory(categories, transaction.category_id)
  return Boolean(category && isSystemCategory(category))
}

const GROUP_ORDER = ['Despesas', 'Receitas', 'Metas']

export const getCategoryGroup = (category) => {
  if (isSystemCategory(category)) return 'Metas'
  return category.type === 'income' ? 'Receitas' : 'Despesas'
}

// Raízes rotuladas e ordenadas por grupo (Despesas, Receitas, Metas), para o filtro do
// histórico, que lista todos os tipos. A ordem original se mantém dentro de cada grupo.
export const getGroupedRootCategories = (categories) =>
  getRootCategories(categories)
    .map((category) => ({ ...category, group: getCategoryGroup(category) }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))

export const getSubcategories = (categories, parentId) =>
  categories.filter((c) => c.parent_id === parentId)

// Nome da categoria "macro": para subcategorias, devolve o nome do pai.
export const getParentCategoryName = (categories, catId) => {
  const cat = findCategory(categories, catId)
  if (!cat) return UNCATEGORIZED_LABEL
  if (cat.parent_id) {
    const parent = findCategory(categories, cat.parent_id)
    return parent ? parent.name : cat.name
  }
  return cat.name
}

// Um lançamento casa com o filtro se for da própria categoria ou de uma filha dela.
export const matchesCategoryFilter = (transaction, categories, filterCategoryId) => {
  if (!filterCategoryId) return true
  const cat = findCategory(categories, transaction.category_id)
  return sameId(transaction.category_id, filterCategoryId) || Boolean(cat && sameId(cat.parent_id, filterCategoryId))
}
