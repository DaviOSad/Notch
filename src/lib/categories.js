import { UNCATEGORIZED_LABEL } from './constants'

// Ids vindos de um <select> são strings, enquanto os do banco são números —
// compare sempre por aqui em vez de usar === direto.
export const sameId = (a, b) => String(a) === String(b)

export const findCategory = (categories, catId) => categories.find((c) => sameId(c.id, catId))

export const getRootCategories = (categories) => categories.filter((c) => !c.parent_id)

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
