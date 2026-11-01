import MonthNavigator from './MonthNavigator'
import MonthTape from './MonthTape'
import { MONTHS_SHORT } from '../../lib/constants'
import { formatCurrency } from '../../lib/formatters'

// Receitas e Despesas funcionam como filtro do histórico; `tone` é só a cor do rótulo.
function TotalFilter({ label, amount, tone, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`min-w-0 rounded-xl px-4 py-3 text-left transition-colors ${isActive ? 'bg-espuma text-petroleo' : 'bg-petroleo-alto text-espuma hover:bg-petroleo-linha'}`}
    >
      <span className={`block text-sm font-medium ${isActive ? 'text-petroleo/70' : tone}`}>{label}</span>
      <span className="block truncate text-lg font-bold">{formatCurrency(amount)}</span>
    </button>
  )
}

// Metas não é receita nem despesa: é o líquido guardado (aportes − resgates). Linha própria
// e mais larga, e filtra o histórico como os outros dois.
function GoalsFilter({ amount, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`col-span-2 flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition-colors ${isActive ? 'bg-espuma text-petroleo' : 'bg-petroleo-alto text-espuma hover:bg-petroleo-linha'}`}
    >
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${isActive ? 'text-petroleo/70' : 'text-caju'}`}>Metas</span>
        <span className={`block text-sm ${isActive ? 'text-petroleo/70' : 'text-bruma'}`}>{amount < 0 ? 'Resgatado no mês' : 'Guardado no mês'}</span>
      </span>
      <span className="shrink-0 text-lg font-bold">{formatCurrency(Math.abs(amount))}</span>
    </button>
  )
}

export default function MonthSummary({
  currentDate,
  onChangeMonth,
  isPickerOpen,
  onTogglePicker,
  totalIncome,
  totalExpense,
  totalGoals,
  showGoals,
  monthlyRemaining,
  accumulatedBalance,
  spend,
  colorMap,
  filterType,
  onFilterTypeChange,
}) {
  // Clicar de novo no filtro ativo limpa o filtro.
  const toggleType = (type) => onFilterTypeChange(filterType === type ? '' : type)

  return (
    <section aria-labelledby="resumo-titulo" className="sobre-petroleo relative rounded-folha bg-petroleo p-6 text-espuma shadow-xl shadow-petroleo/20 md:p-7">
      <h2 id="resumo-titulo" className="sr-only">Resumo do mês</h2>

      <MonthNavigator
        currentDate={currentDate}
        onChangeMonth={onChangeMonth}
        isPickerOpen={isPickerOpen}
        onTogglePicker={onTogglePicker}
      />

      <p className="mt-7 text-sm text-bruma">Restante do mês</p>
      <p className={`font-display text-5xl font-extrabold leading-none tracking-tight ${monthlyRemaining < 0 ? 'text-saida-claro' : 'text-espuma'}`}>
        {formatCurrency(monthlyRemaining)}
      </p>

      <MonthTape spend={spend} income={totalIncome} goals={totalGoals} colorMap={colorMap} />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <TotalFilter label="Receitas" amount={totalIncome} tone="text-entrada-claro" isActive={filterType === 'income'} onClick={() => toggleType('income')} />
        <TotalFilter label="Despesas" amount={totalExpense} tone="text-saida-claro" isActive={filterType === 'expense'} onClick={() => toggleType('expense')} />
        {showGoals && <GoalsFilter amount={totalGoals} isActive={filterType === 'goals'} onClick={() => toggleType('goals')} />}
      </div>

      {/* Diferente do restante acima, este não é do mês: arrasta todo o histórico. */}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-petroleo-linha pt-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">Saldo Acumulado</span>
          <span className="text-sm text-bruma">Tudo até {MONTHS_SHORT[currentDate.getMonth()]}/{currentDate.getFullYear()}</span>
        </div>
        <span className={`shrink-0 font-display text-xl font-bold ${accumulatedBalance < 0 ? 'text-saida-claro' : 'text-entrada-claro'}`}>
          {formatCurrency(accumulatedBalance)}
        </span>
      </div>
    </section>
  )
}
