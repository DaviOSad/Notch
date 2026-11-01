// Helpers de data. As datas de lançamento são strings 'YYYY-MM-DD' (sem fuso),
// por isso a leitura usa meio-dia para evitar deslocamento de timezone.

// Partes locais, não toISOString (UTC): às 22h no Brasil o UTC já é o dia seguinte.
export const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const todayISO = () => toISODate(new Date())

export const parseTransactionDate = (isoDate) => new Date(isoDate + 'T12:00:00')

export const formatShortDate = (isoDate) => parseTransactionDate(isoDate).toLocaleDateString('pt-BR')

export const formatLongDate = (isoDate) =>
  parseTransactionDate(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate()

export const buildISODate = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

// Último dia do mês em ISO — usado como fim de recorrência, para a data gravada
// cobrir o mês inteiro independentemente do dia do vencimento.
export const endOfMonthISO = (year, month) => buildISODate(year, month, lastDayOfMonth(year, month))

// Distância em meses entre dois pontos (o dia é irrelevante): negativa se `to` vem antes.
export const monthsDiff = (fromYear, fromMonth, toYear, toMonth) =>
  (toYear - fromYear) * 12 + (toMonth - fromMonth)

// Mês/ano deslocados por N meses, normalizando a virada de ano.
export const shiftMonth = (year, month, offset) => {
  const shifted = new Date(year, month + offset, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() }
}

export const getMonthBounds = (date) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { startDate: toISODate(startDate), endDate: toISODate(endDate) }
}
