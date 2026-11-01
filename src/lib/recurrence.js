import { buildISODate, lastDayOfMonth, monthsDiff, parseTransactionDate } from './dates'

/**
 * Recorrência com prazo: `recurrence_end_date` marca o ÚLTIMO mês cobrado
 * (o dia é ignorado, a comparação é sempre de mês/ano). Sem a data, repete
 * indefinidamente, como antes.
 */
export const hasEndedBy = (endDate, viewedYear, viewedMonth) => {
  if (!endDate) return false
  const end = parseTransactionDate(endDate)
  return monthsDiff(end.getFullYear(), end.getMonth(), viewedYear, viewedMonth) > 0
}

// Quantas ocorrências existem entre o mês inicial e o fim (inclusive nas duas pontas).
export const countOccurrences = (startYear, startMonth, endDate) => {
  if (!endDate) return null
  const end = parseTransactionDate(endDate)
  return monthsDiff(startYear, startMonth, end.getFullYear(), end.getMonth()) + 1
}

// Um lançamento recorrente é gravado como UMA única linha. A ocorrência do mês
// visualizado é sintetizada aqui, em memória — não há materialização no banco.
// O dia é limitado ao último dia do mês (ex.: dia 31 em fevereiro vira 28/29).
const buildOccurrenceForMonth = (transaction, viewedYear, viewedMonth) => {
  const originalDay = Number.parseInt(transaction.expense_date.split('-')[2], 10)
  const safeDay = Math.min(originalDay, lastDayOfMonth(viewedYear, viewedMonth))
  // `original_date` mantém o início da série: editar uma ocorrência não pode reancorá-la.
  return { ...transaction, expense_date: buildISODate(viewedYear, viewedMonth, safeDay), original_date: transaction.expense_date }
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
 * - Recorrentes: incluídos se já começaram e ainda não passaram do prazo
 *   (`recurrence_end_date`), com a data projetada no mês visto.
 * - Não recorrentes: incluídos apenas se caem dentro do mês visto.
 */
export function buildMonthTransactions(rows, viewedDate) {
  const viewedYear = viewedDate.getFullYear()
  const viewedMonth = viewedDate.getMonth()

  const monthTransactions = []

  ;(rows ?? []).forEach((transaction) => {
    const originalDate = parseTransactionDate(transaction.expense_date)

    if (transaction.is_recurring) {
      const monthsElapsed = monthsDiff(
        originalDate.getFullYear(), originalDate.getMonth(), viewedYear, viewedMonth
      )
      if (monthsElapsed >= 0 && !hasEndedBy(transaction.recurrence_end_date, viewedYear, viewedMonth)) {
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

/**
 * Saldo acumulado até o fim do mês visualizado: soma tudo o que já aconteceu,
 * não só o mês visto. As mesmas linhas de `buildMonthTransactions` servem aqui
 * (a consulta já corta em `expense_date <= fim do mês visto`); as recorrentes
 * entram multiplicadas pelo número de ocorrências, sem materializar nenhuma.
 */
export function computeAccumulatedBalance(rows, viewedDate) {
  const viewedYear = viewedDate.getFullYear()
  const viewedMonth = viewedDate.getMonth()

  return (rows ?? []).reduce((balance, transaction) => {
    // Sem `type` a linha é despesa, como no resto do app.
    const signedAmount = (transaction.type === 'income' ? 1 : -1) * Number(transaction.amount)
    if (!transaction.is_recurring) return balance + signedAmount

    const start = parseTransactionDate(transaction.expense_date)
    // A série para no mês do prazo, quando ele vem antes do mês visualizado.
    const stoppedEarly = hasEndedBy(transaction.recurrence_end_date, viewedYear, viewedMonth)
    const end = stoppedEarly ? parseTransactionDate(transaction.recurrence_end_date) : null

    const occurrences = monthsDiff(
      start.getFullYear(), start.getMonth(),
      end ? end.getFullYear() : viewedYear,
      end ? end.getMonth() : viewedMonth
    ) + 1

    return occurrences > 0 ? balance + signedAmount * occurrences : balance
  }, 0)
}
