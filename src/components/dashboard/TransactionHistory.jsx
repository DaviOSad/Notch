import { Search } from 'lucide-react'
import CategoryOptionGroups from './CategoryOptionGroups'
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
  onEdit,
  onDelete,
}) {
  return (
    <section className="w-full flex flex-col gap-4">
      <h3 className="text-lg font-bold text-white">Histórico</h3>
      <div className="flex flex-col sm:flex-row w-full gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Buscar lançamento..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/5 bg-slate-900/80 py-4 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
        </div>
        <select value={filterCategory} onChange={(e) => onFilterChange(e.target.value)} className="appearance-none rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all sm:w-48 cursor-pointer">
          <option value="">Todas as categorias</option>
          <CategoryOptionGroups categories={categories} parents={getRootCategories(categories)} keyPrefix="filter" />
        </select>
      </div>
      <div className="flex flex-col w-full gap-3 overflow-y-auto max-h-[50vh] md:max-h-[400px] pr-2 custom-scrollbar">
        {visibleTransactions.length > 0
          ? visibleTransactions.map((t, idx) => (
            <TransactionItem key={`tx-${t.id}-${idx}`} transaction={t} categories={categories} onEdit={onEdit} onDelete={onDelete} />
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
