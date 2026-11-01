import { Pencil, Repeat } from 'lucide-react'
import Modal from '../../ui/Modal'
import { findCategory, isGoalTransaction } from '../../../lib/categories'
import { UNCATEGORIZED_LABEL } from '../../../lib/constants'
import { formatLongDate } from '../../../lib/dates'
import { formatCurrency } from '../../../lib/formatters'

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-6 py-3">
    <dt className="shrink-0 text-sm text-neblina">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
  </div>
)

// Ficha de leitura de um lançamento: mostra por extenso o que a linha do
// histórico precisa truncar (categoria, subcategoria, descrição, data e valor).
export default function TransactionDetailsModal({ transaction, categories, onClose, onEdit }) {
  const cat = findCategory(categories, transaction.category_id)
  const parent = cat?.parent_id ? findCategory(categories, cat.parent_id) : null

  const categoryName = parent ? (parent.name || 'Pai excluído') : (cat?.name || UNCATEGORIZED_LABEL)
  const subcategoryName = parent ? cat.name : null

  const isIncome = transaction.type === 'income'
  const isGoal = isGoalTransaction(transaction, categories)
  const kindLabel = isGoal ? (isIncome ? 'Resgate de meta' : 'Aporte em meta') : (isIncome ? 'Receita' : 'Despesa')

  return (
    <Modal title="Detalhes do Lançamento" onClose={onClose} testId="transaction-details">
      <div className="mb-4">
        <p className="text-sm text-neblina">{kindLabel}</p>
        <p className={`font-display text-4xl font-extrabold tracking-tight ${isGoal ? 'text-petroleo' : isIncome ? 'text-entrada' : 'text-saida'}`}>
          {isIncome ? '+ ' : '- '}{formatCurrency(transaction.amount)}
        </p>
        {transaction.is_recurring && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pagina px-3 py-1 text-sm font-medium text-neblina">
            <Repeat size={14} /> Recorrente
          </span>
        )}
      </div>

      <dl className="divide-y divide-linha border-y border-linha">
        <DetailRow label="Categoria" value={categoryName} />
        {subcategoryName && <DetailRow label="Subcategoria" value={subcategoryName} />}
        <DetailRow label="Descrição" value={transaction.description || '—'} />
        <DetailRow label="Data" value={formatLongDate(transaction.expense_date)} />
        {transaction.is_recurring && (
          <DetailRow
            label="Prazo"
            value={transaction.recurrence_end_date
              ? `Até ${formatLongDate(transaction.recurrence_end_date)}`
              : 'Sem data para acabar'}
          />
        )}
      </dl>

      <button onClick={onEdit} className="btn-primario mt-6 w-full py-3.5 text-base">
        <Pencil size={18} /> Editar
      </button>
    </Modal>
  )
}
