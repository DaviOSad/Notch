import { Search, X } from 'lucide-react'
import CategorySelect from './CategorySelect'
import TransactionItem from './TransactionItem'
import { getGroupedRootCategories } from '../../lib/categories'

const FILTER_CHIPS = {
  income: { label: 'Receitas', classes: 'border-entrada/30 bg-entrada/10 text-entrada hover:bg-entrada/20' },
  expense: { label: 'Despesas', classes: 'border-saida/30 bg-saida/10 text-saida hover:bg-saida/20' },
  goals: { label: 'Metas', classes: 'border-petroleo/30 bg-caju/20 text-petroleo hover:bg-caju/40' },
}

export default function TransactionHistory({
  categories,
  visibleTransactions,
  totalCount,
  visibleCount,
  onLoadMore,
  searchTerm,
  onSearchChange,
  filterCategory,
  onFilterChange,
  filterType,
  onFilterTypeChange,
  onSelect,
  onEdit,
  onDelete,
}) {
  const chip = FILTER_CHIPS[filterType]
  const hasFilters = Boolean(searchTerm || filterCategory || filterType)

  return (
    <section aria-labelledby="historico-titulo" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="historico-titulo" className="font-display text-xl font-bold tracking-tight">Histórico</h2>
        {chip && (
          <button
            type="button"
            onClick={() => onFilterTypeChange('')}
            aria-label={`Remover filtro: ${chip.label}`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${chip.classes}`}
          >
            {chip.label}
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neblina" />
          <input
            type="text"
            placeholder="Buscar lançamento..."
            aria-label="Buscar lançamento"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="campo pl-11"
          />
        </div>
        <CategorySelect
          categories={categories}
          parents={getGroupedRootCategories(categories)}
          value={filterCategory}
          onChange={onFilterChange}
          emptyLabel="Todas as categorias"
          parentHint="Tudo"
          className="sm:w-56"
        />
      </div>

      <div className="mt-4 border-y border-linha">
        {visibleTransactions.length > 0 ? (
          <div className="divide-y divide-linha">
            {visibleTransactions.map((t, idx) => (
              <TransactionItem key={`tx-${t.id}-${idx}`} transaction={t} categories={categories} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-neblina">
            {hasFilters ? 'Nenhum lançamento com esses filtros.' : 'Nenhum lançamento neste mês. Use o botão + para adicionar o primeiro.'}
          </p>
        )}
      </div>

      {visibleCount < totalCount && (
        <button onClick={onLoadMore} className="btn-neutro mt-4 w-full">
          Carregar mais lançamentos
        </button>
      )}
    </section>
  )
}
