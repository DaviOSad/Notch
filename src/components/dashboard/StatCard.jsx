import { formatCurrency } from '../../lib/formatters'

export default function StatCard({ title, amount, colorClass, borderColor, textColor, ringColor, onClick, isActive = false }) {
  const content = (
    <>
      <p className={`text-[10px] sm:text-xs font-bold ${textColor} mb-1 uppercase tracking-wider opacity-70`}>{title}</p>
      <p className={`text-sm sm:text-lg font-bold ${textColor} truncate`}>{formatCurrency(amount)}</p>
    </>
  )

  // Sem onClick o card continua sendo um bloco estático (ex.: "Restante").
  if (!onClick) {
    return <div className={`flex-1 rounded-2xl ${colorClass} p-3 sm:p-4 border ${borderColor}`}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex-1 min-w-0 text-left rounded-2xl ${colorClass} p-3 sm:p-4 border ${borderColor} transition-all cursor-pointer hover:brightness-125 active:scale-95 ${isActive ? `ring-2 ${ringColor} ring-offset-2 ring-offset-slate-900` : ''}`}
    >
      {content}
    </button>
  )
}
