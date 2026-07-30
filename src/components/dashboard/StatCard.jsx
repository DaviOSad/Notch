import { formatCurrency } from '../../lib/formatters'

export default function StatCard({ title, amount, colorClass, borderColor, textColor }) {
  return (
    <div className={`flex-1 rounded-2xl ${colorClass} p-3 sm:p-4 border ${borderColor}`}>
      <p className={`text-[10px] sm:text-xs font-bold ${textColor} mb-1 uppercase tracking-wider opacity-70`}>{title}</p>
      <p className={`text-sm sm:text-lg font-bold ${textColor} truncate`}>{formatCurrency(amount)}</p>
    </div>
  )
}
