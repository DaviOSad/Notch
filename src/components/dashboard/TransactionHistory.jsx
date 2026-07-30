import { Search, X } from 'lucide-react'
import CategorySelect from './CategorySelect'
import TransactionItem from './TransactionItem'
import { getRootCategories } from '../../lib/categories'

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
  const isIncomeFilter = filterType === 'income'

  return (
    <section className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-white">Histórico</h3>
        {filterType && (
          <button
            type="button"
            onClick={() => onFilterTypeChange('')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${isIncomeFilter ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'}`}
          >
            {isIncomeFilter ? 'Receitas' : 'Despesas'}
            <X size={13} />
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row w-full gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Buscar lançamento..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/5 bg-slate-900/80 py-4 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
        </div>
        <CategorySelect
          categories={categories}
          parents={getRootCategories(categories)}
          value={filterCategory}
          onChange={onFilterChange}
          emptyLabel="Todas as categorias"
          parentHint="Tudo"
          className="sm:w-56"
          triggerClassName="rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4 hover:border-cyan-500/30"
        />
      </div>
      <div className="flex flex-col w-full gap-3 overflow-y-auto max-h-[50vh] md:max-h-[400px] pr-2 custom-scrollbar">
        {visibleTransactions.length > 0
          ? visibleTransactions.map((t, idx) => (
            <TransactionItem key={`tx-${t.id}-${idx}`} transaction={t} categories={categories} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
          ))
          : <div className="py-8 text-center text-sm text-slate-500">Nenhuma movimentação.</div>}
        {visibleCount < totalCount && (
          <button onClick={onLoadMore} className="w-full py-4 mt-1 text-sm font-semibold text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 rounded-2xl transition-all">
            Carregar mais lançamentos...
          </button>
        )}
      </div>
    </section>
  )
}
