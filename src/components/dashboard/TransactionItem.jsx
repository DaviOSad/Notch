import { Pencil, Repeat, Trash2 } from 'lucide-react'
import CategoryPath from './CategoryPath'
import { formatShortDate } from '../../lib/dates'
import { formatCurrency } from '../../lib/formatters'

export default function TransactionItem({ transaction, categories, onSelect, onEdit, onDelete }) {
  const t = transaction

  const recurrenceLabel = t.recurrence_end_date
    ? `Recorrente até ${formatShortDate(t.recurrence_end_date)}`
    : 'Recorrente'

  // Editar/excluir não devem abrir os detalhes junto.
  const actionHandler = (action) => (e) => { e.stopPropagation(); action() }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(t)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(t)}
      onKeyDown={handleKeyDown}
      className="group flex w-full cursor-pointer items-center justify-between rounded-2xl bg-slate-900/40 p-4 transition-colors hover:bg-slate-900/80 border border-white/5 outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50"
    >
      <div className="flex flex-1 flex-col min-w-0 pr-4">
        <p className="flex min-w-0 items-center gap-1.5 text-base font-semibold text-slate-100">
          <CategoryPath categories={categories} categoryId={t.category_id} />
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="truncate text-xs text-slate-500">
            {t.description ? `${t.description} • ` : ''}
            {formatShortDate(t.expense_date)}
          </p>
          {t.is_recurring && (
            <span title={recurrenceLabel} className="flex shrink-0 items-center ml-1">
              <Repeat size={12} className="text-cyan-500/70" />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-base font-bold mr-1 ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {t.type === 'income' ? '+ ' : '- '}{formatCurrency(t.amount)}
        </span>
        <button onClick={actionHandler(() => onEdit(t))} className="text-slate-600 hover:text-cyan-500 transition-colors p-1" title="Editar"><Pencil size={18} /></button>
        <button onClick={actionHandler(() => onDelete(t.id))} className="text-slate-600 hover:text-rose-500 transition-colors p-1" title="Excluir"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}
