import MonthNavigator from './MonthNavigator'
import StatCard from './StatCard'
import { MONTHS_SHORT } from '../../lib/constants'
import { formatCurrency } from '../../lib/formatters'

export default function MonthSummary({
  currentDate,
  onChangeMonth,
  isPickerOpen,
  onTogglePicker,
  totalIncome,
  totalExpense,
  monthlyRemaining,
  accumulatedBalance,
  filterType,
  onFilterTypeChange,
}) {
  // Clicar de novo no card ativo limpa o filtro.
  const toggleType = (type) => onFilterTypeChange(filterType === type ? '' : type)

  return (
    <section className="relative w-full overflow-visible rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-white/5 p-6 shadow-2xl mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Resumo do Mês</h2>
        <MonthNavigator
          currentDate={currentDate}
          onChangeMonth={onChangeMonth}
          isPickerOpen={isPickerOpen}
          onTogglePicker={onTogglePicker}
        />
      </div>
      <div className="flex w-full gap-3">
        <StatCard title="Receitas" amount={totalIncome} colorClass="bg-emerald-500/10" borderColor="border-emerald-500/10" textColor="text-emerald-400" ringColor="ring-emerald-400/60" isActive={filterType === 'income'} onClick={() => toggleType('income')} />
        <StatCard title="Despesas" amount={totalExpense} colorClass="bg-rose-500/10" borderColor="border-rose-500/10" textColor="text-rose-400" ringColor="ring-rose-400/60" isActive={filterType === 'expense'} onClick={() => toggleType('expense')} />
        <StatCard title="Restante (Mês)" amount={monthlyRemaining} colorClass="bg-cyan-500/10" borderColor="border-cyan-500/10" textColor="text-cyan-400" />
      </div>

      {/* Diferente dos cards acima, este não é do mês: arrasta todo o histórico. */}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/5 pt-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 opacity-70">Saldo Acumulado</span>
          <span className="text-[10px] sm:text-xs text-slate-500">Tudo até {MONTHS_SHORT[currentDate.getMonth()]}/{currentDate.getFullYear()}</span>
        </div>
        <span className={`shrink-0 text-lg sm:text-xl font-bold ${accumulatedBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formatCurrency(accumulatedBalance)}
        </span>
      </div>
    </section>
  )
}
