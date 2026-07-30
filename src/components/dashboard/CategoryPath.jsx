import { CornerDownRight } from 'lucide-react'
import { findCategory } from '../../lib/categories'
import { UNCATEGORIZED_LABEL } from '../../lib/constants'

// Exibe "Pai ↳ Filha" para subcategorias e apenas o nome para categorias raiz.
//
// Cada parte é um item flex com `truncate`: o pai (normalmente mais longo) encolhe
// primeiro e ganha reticências, em vez de o texto vazar para cima do valor em telas
// estreitas. O ícone leva `shrink-0` para não ser espremido até sumir.
export default function CategoryPath({ categories, categoryId }) {
  const cat = findCategory(categories, categoryId)
  if (!cat) return <span className="truncate">{UNCATEGORIZED_LABEL}</span>

  if (cat.parent_id) {
    const parent = findCategory(categories, cat.parent_id)
    return (
      <>
        <span className="truncate text-slate-400">{parent?.name || 'Pai excluido'}</span>
        <CornerDownRight size={14} className="text-slate-600 mx-0.5 shrink-0" />
        <span className="truncate">{cat.name}</span>
      </>
    )
  }
  return <span className="truncate">{cat.name}</span>
}
