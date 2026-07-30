import { Pencil, Repeat, X } from 'lucide-react'
import { findCategory } from '../../../lib/categories'
import { UNCATEGORIZED_LABEL } from '../../../lib/constants'
import { formatLongDate } from '../../../lib/dates'
import { formatCurrency } from '../../../lib/formatters'

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3">
    <dt className="shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="min-w-0 break-words text-right text-sm font-medium text-white">{value}</dd>
  </div>
)

// Ficha de leitura de um lançamento: mostra por extenso o que a linha do
// histórico precisa truncar (categoria, subcategoria, descrição, data e valor).
export default function TransactionDetailsModal({ transaction, categories, onClose, onEdit }) {
  const cat = findCategory(categories, transaction.category_id)
  const parent = cat?.parent_id ? findCategory(categories, cat.parent_id) : null

  const categoryName = parent ? (parent.name || 'Pai excluido') : (cat?.name || UNCATEGORIZED_LABEL)
  const subcategoryName = parent ? cat.name : null

  const isIncome = transaction.type === 'income'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div data-testid="transaction-details" className="relative w-full md:max-w-md bg-slate-900 p-6 md:rounded-3xl rounded-t-3xl shadow-2xl transition-transform animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-slate-700 md:hidden" />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Detalhes do Lançamento</h2>
          <button onClick={onClose} title="Fechar detalhes" className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="mb-5 rounded-2xl border border-white/5 bg-slate-950/50 p-5 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-70">
            {isIncome ? 'Receita' : 'Despesa'}
          </p>
          <p className={`text-3xl font-bold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
            {isIncome ? '+ ' : '- '}{formatCurrency(transaction.amount)}
          </p>
          {transaction.is_recurring && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400">
              <Repeat size={12} /> Recorrente
            </span>
          )}
        </div>

        <dl className="flex flex-col gap-3">
          <DetailRow label="Categoria" value={categoryName} />
          {subcategoryName && <DetailRow label="Subcategoria" value={subcategoryName} />}
          <DetailRow label="Descrição" value={transaction.description || '—'} />
          <DetailRow label="Data" value={formatLongDate(transaction.expense_date)} />
        </dl>

        <button onClick={onEdit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 text-base font-bold text-white transition-all active:scale-[0.98] hover:bg-cyan-400">
          <Pencil size={18} /> Editar
        </button>
      </div>
    </div>
  )
}
