import { buildISODate, lastDayOfMonth, parseTransactionDate } from './dates'

// Um lançamento recorrente é gravado como UMA única linha. A ocorrência do mês
// visualizado é sintetizada aqui, em memória — não há materialização no banco.
// O dia é limitado ao último dia do mês (ex.: dia 31 em fevereiro vira 28/29).
const buildOccurrenceForMonth = (transaction, viewedYear, viewedMonth) => {
  const originalDay = Number.parseInt(transaction.expense_date.split('-')[2], 10)
  const safeDay = Math.min(originalDay, lastDayOfMonth(viewedYear, viewedMonth))
  return { ...transaction, expense_date: buildISODate(viewedYear, viewedMonth, safeDay) }
}

const byDateThenCreationDesc = (a, b) => {
  const timeA = new Date(a.expense_date).getTime()
  const timeB = new Date(b.expense_date).getTime()
  if (timeA !== timeB) return timeB - timeA

  const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
  const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
  return createdB - createdA
}

/**
 * Recebe as linhas cruas de `expenses` (com `expense_date <= fim do mês visto`)
 * e devolve os lançamentos do mês visualizado, já ordenados.
 *
 * - Recorrentes: incluídos se já começaram, com a data projetada no mês visto.
 * - Não recorrentes: incluídos apenas se caem dentro do mês visto.
 */
export function buildMonthTransactions(rows, viewedDate) {
  const viewedYear = viewedDate.getFullYear()
  const viewedMonth = viewedDate.getMonth()

  const monthTransactions = []

  ;(rows ?? []).forEach((transaction) => {
    const originalDate = parseTransactionDate(transaction.expense_date)

    if (transaction.is_recurring) {
      const monthsElapsed =
        (viewedYear - originalDate.getFullYear()) * 12 + (viewedMonth - originalDate.getMonth())
      if (monthsElapsed >= 0) {
        monthTransactions.push(buildOccurrenceForMonth(transaction, viewedYear, viewedMonth))
      }
      return
    }

    if (originalDate.getFullYear() === viewedYear && originalDate.getMonth() === viewedMonth) {
      monthTransactions.push(transaction)
    }
  })

  return monthTransactions.sort(byDateThenCreationDesc)
}
