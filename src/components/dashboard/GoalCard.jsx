import { Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { USD_RATE } from '../../lib/constants'

// Uma caixinha não é um cartão: é uma coluna da fileira, separada da vizinha por um
// fio vertical. O que importa (saldo e progresso) vem primeiro; as ações, por último.
export default function GoalCard({ goal, onManageFunds, onDeleteGoal }) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const isUSD = goal.currency === 'USD'

  return (
    <div className="w-56 flex-none snap-start border-l border-linha pl-4 pr-5 first:border-l-0 first:pl-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate pt-1 font-semibold" title={goal.name}>{goal.name}</h3>
        <button onClick={() => onDeleteGoal(goal)} title="Excluir meta" aria-label={`Excluir meta ${goal.name}`} className="btn-icone -mr-2 -mt-1 h-8 w-8 shrink-0 text-neblina hover:bg-folha hover:text-saida">
          <Trash2 size={16} />
        </button>
      </div>

      <p className="mt-2 font-display text-2xl font-bold tracking-tight">{formatCurrency(goal.current_amount, goal.currency)}</p>
      <p className="text-sm text-neblina">de {formatCurrency(goal.target_amount, goal.currency)}</p>
      {isUSD && <p className="text-sm font-medium text-neblina">~ {formatCurrency(goal.current_amount * USD_RATE, 'BRL')}</p>}

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso de ${goal.name}`}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-linha"
      >
        <div className="h-full rounded-full bg-petroleo transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-neblina">{progress.toFixed(1)}% concluído</p>

      <div className="mt-3 flex gap-2">
        <button onClick={() => onManageFunds(goal, 'remove')} className="btn-neutro !px-3 !py-1.5 text-xs">Retirar</button>
        <button onClick={() => onManageFunds(goal, 'add')} className="btn-primario !px-3 !py-1.5 text-xs">Guardar</button>
      </div>
    </div>
  )
}
