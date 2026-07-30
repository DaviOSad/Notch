import { Globe, Target, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { USD_RATE } from '../../lib/constants'

export default function GoalCard({ goal, onManageFunds, onDeleteGoal }) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const isUSD = goal.currency === 'USD'
  const convertedAmount = isUSD ? goal.current_amount * USD_RATE : null

  return (
    <div className="flex-none w-64 rounded-3xl bg-slate-900/60 border border-white/5 p-5 snap-start relative overflow-hidden group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isUSD ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            {isUSD ? <Globe size={16} /> : <Target size={16} />}
          </div>
          <h4 className="font-bold text-white text-sm truncate">{goal.name}</h4>
        </div>
        <button onClick={() => onDeleteGoal(goal)} title="Excluir meta" className="text-slate-500 hover:text-rose-500 transition-colors p-1">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mb-3">
        <p className="text-xl font-bold text-white">{formatCurrency(goal.current_amount, goal.currency)}</p>
        <p className="text-xs text-slate-500 mt-0.5">de {formatCurrency(goal.target_amount, goal.currency)}</p>
        {isUSD && (
          <p className="text-xs font-medium text-indigo-400 mt-1 bg-indigo-500/10 inline-block px-2 py-0.5 rounded-md">
            ~ {formatCurrency(convertedAmount, 'BRL')}
          </p>
        )}
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
        <div className={`h-2 rounded-full transition-all duration-1000 ${isUSD ? 'bg-indigo-500' : 'bg-cyan-500'}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-400">{progress.toFixed(1)}% concluído</span>
        <div className="flex gap-1.5">
          <button onClick={() => onManageFunds(goal, 'remove')} className="text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg transition-colors">Retirar</button>
          <button onClick={() => onManageFunds(goal, 'add')} className="text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1.5 rounded-lg transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  )
}
