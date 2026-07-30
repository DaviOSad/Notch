// Helpers de data. As datas de lançamento são strings 'YYYY-MM-DD' (sem fuso),
// por isso a leitura usa meio-dia para evitar deslocamento de timezone.

export const toISODate = (date) => date.toISOString().split('T')[0]

export const todayISO = () => toISODate(new Date())

export const parseTransactionDate = (isoDate) => new Date(isoDate + 'T12:00:00')

export const formatShortDate = (isoDate) => parseTransactionDate(isoDate).toLocaleDateString('pt-BR')

export const formatLongDate = (isoDate) =>
  parseTransactionDate(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate()

export const buildISODate = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const getMonthBounds = (date) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { startDate: toISODate(startDate), endDate: toISODate(endDate) }
}
