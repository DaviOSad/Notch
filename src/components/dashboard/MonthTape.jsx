import { useMemo } from 'react'
import TapeBar from '../ui/TapeBar'
import { GOALS_COLOR, UNCATEGORIZED_COLOR } from '../../lib/constants'
import { formatCurrency } from '../../lib/formatters'
import { buildSpendTape, withGoals } from '../../lib/summary'

const LEGEND_LIMIT = 6

// "O mês numa linha": a largura da fita é a receita do mês e cada categoria ocupa a
// sua fatia. O que não foi gasto fica como espaço vazio; se a despesa passa da
// receita a fita estoura (sem espaço livre) e o texto abaixo diz quanto.
export default function MonthTape({ spend: categorySpend, income: monthIncome, goals = 0, colorMap }) {
  // O guardado nas metas é uma fatia própria (âmbar), para a fita fechar com o restante.
  const { spend, income } = useMemo(() => withGoals(categorySpend, monthIncome, goals), [categorySpend, monthIncome, goals])
  const tape = useMemo(() => buildSpendTape(spend, income), [spend, income])
  const saved = goals > 0 ? goals : 0
  const expense = spend.reduce((total, s) => total + s.value, 0) - saved

  if (tape.segments.length === 0 && tape.free === 0) {
    return <p className="mt-6 text-sm text-bruma">Nenhum lançamento neste mês.</p>
  }

  const segments = tape.segments.map((s) => ({ ...s, color: s.isGoals ? GOALS_COLOR : (colorMap[s.name] || UNCATEGORIZED_COLOR) }))

  const used = `${formatCurrency(expense)} gastos${saved > 0 ? ` e ${formatCurrency(saved)} guardados nas metas` : ''}`
  let summary
  if (income === 0) summary = `${used}, sem receitas no mês.`
  else if (tape.overflow) summary = `Passou ${formatCurrency(expense + saved - income)} da receita do mês.`
  else summary = `${used} de ${formatCurrency(income)} recebidos.`

  // A chave muda com os dados: a fita volta a crescer quando o mês ou um lançamento muda.
  const dataKey = `${income}|${spend.map((s) => `${s.name}:${s.value}`).join(',')}`

  return (
    <div className="mt-6">
      <div key={dataKey} role="img" aria-label={summary}>
        <TapeBar segments={segments} free={tape.free} />
      </div>
      <p className={`mt-3 text-sm ${tape.overflow ? 'font-semibold text-saida-claro' : 'text-bruma'}`}>{summary}</p>

      {segments.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {segments.slice(0, LEGEND_LIMIT).map((s) => (
            <li key={s.name} className="flex max-w-full items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
              <span className="truncate text-espuma">{s.name}</span>
              <span className="shrink-0 text-bruma">{formatCurrency(s.value)}</span>
            </li>
          ))}
          {segments.length > LEGEND_LIMIT && (
            <li className="text-bruma">
              e mais {segments.length - LEGEND_LIMIT} {segments.length - LEGEND_LIMIT === 1 ? 'categoria' : 'categorias'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
