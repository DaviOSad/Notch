import { Pencil, Repeat, Trash2 } from 'lucide-react'
import CategoryPath from './CategoryPath'
import { formatCurrency } from '../../lib/formatters'

export default function TransactionItem({ transaction, categories, onEdit, onDelete }) {
  const t = transaction

  return (
    <div className="group flex w-full items-center justify-between rounded-2xl bg-slate-900/40 p-4 transition-colors hover:bg-slate-900/80 border border-white/5">
      <div className="flex flex-1 flex-col min-w-0 pr-4">
        <p className="flex min-w-0 items-center gap-1.5 text-base font-semibold text-slate-100">
          <CategoryPath categories={categories} categoryId={t.category_id} />
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="truncate text-xs text-slate-500">
            {t.description ? `${t.description} • ` : ''}
            {new Date(t.expense_date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </p>
          {t.is_recurring && <Repeat size={12} className="text-cyan-500/70 shrink-0 ml-1" />}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-base font-bold mr-1 ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-100'}`}>
          {t.type === 'income' ? '+ ' : '- '}{formatCurrency(t.amount)}
        </span>
        <button onClick={() => onEdit(t)} className="text-slate-600 hover:text-cyan-500 transition-colors p-1" title="Editar"><Pencil size={18} /></button>
        <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-rose-500 transition-colors p-1" title="Excluir"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}
