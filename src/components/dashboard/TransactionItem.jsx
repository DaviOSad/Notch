import { Pencil, Repeat, Trash2 } from 'lucide-react'
import CategoryPath from './CategoryPath'
import { isGoalTransaction } from '../../lib/categories'
import { formatShortDate } from '../../lib/dates'
import { formatCurrency } from '../../lib/formatters'

// Linha do extrato. Em dispositivos com hover, editar/excluir só aparecem ao passar o
// mouse ou ao focar a linha; no toque (inclusive tablets largos) ficam sempre visíveis.
const actionClass = 'btn-icone h-8 w-8 text-neblina sm:h-9 sm:w-9 hover:bg-pagina [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100'

export default function TransactionItem({ transaction, categories, onSelect, onEdit, onDelete }) {
  const t = transaction
  const isIncome = t.type === 'income'
  // Aporte/resgate de meta é dinheiro que só trocou de lugar: valor neutro, nem verde nem vermelho.
  const isGoal = isGoalTransaction(t, categories)
  // Nome para leitores de tela distinguirem uma linha da outra.
  const label = t.description || formatShortDate(t.expense_date)

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
      className="group flex w-full cursor-pointer items-center gap-3 px-1 py-3.5 transition-colors hover:bg-folha"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold">
          <CategoryPath categories={categories} categoryId={t.category_id} />
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-neblina">
          {t.description && <span className="truncate">{t.description}</span>}
          <span className="shrink-0">{formatShortDate(t.expense_date)}</span>
          {t.is_recurring && (
            <span title={recurrenceLabel} aria-label={recurrenceLabel} className="flex shrink-0 items-center">
              <Repeat size={13} />
            </span>
          )}
        </div>
      </div>

      <span className={`shrink-0 font-display text-base font-bold sm:text-lg ${isGoal ? 'text-petroleo' : isIncome ? 'text-entrada' : 'text-saida'}`}>
        {isIncome ? '+ ' : '- '}{formatCurrency(t.amount)}
      </span>

      <div className="-mr-1 flex shrink-0">
        <button onClick={actionHandler(() => onEdit(t))} className={actionClass} title="Editar" aria-label={`Editar lançamento: ${label}`}><Pencil size={17} /></button>
        <button onClick={actionHandler(() => onDelete(t.id))} className={`${actionClass} hover:text-saida`} title="Excluir" aria-label={`Excluir lançamento: ${label}`}><Trash2 size={17} /></button>
      </div>
    </div>
  )
}
