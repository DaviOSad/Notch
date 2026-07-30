import { getSubcategories } from '../../lib/categories'

/**
 * Opções de um <select> de categorias: cada categoria raiz vira um <optgroup>
 * com a opção "(Geral)" e as subcategorias prefixadas por ↳.
 *
 * `type` (opcional) restringe as subcategorias a despesa/receita — o filtro do
 * histórico lista todas, o formulário lista só as do tipo em edição.
 */
export default function CategoryOptionGroups({ categories, parents, type, keyPrefix, mainOptionClassName }) {
  return parents.map((parent, idx) => {
    const subcategories = getSubcategories(categories, parent.id).filter(
      (sub) => !type || sub.type === type
    )

    return (
      <optgroup key={`${keyPrefix}-optg-${parent.id}-${idx}`} label={parent.name} className="bg-slate-900 font-bold text-white">
        <option key={`${keyPrefix}-main-${parent.id}-${idx}`} value={parent.id} className={mainOptionClassName}>
          {parent.name} (Geral)
        </option>
        {subcategories.map((sub, sIdx) => (
          <option key={`${keyPrefix}-sub-${sub.id}-${sIdx}`} value={sub.id} className="text-slate-300 font-normal">↳ {sub.name}</option>
        ))}
      </optgroup>
    )
  })
}
