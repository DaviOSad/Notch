import { UNCATEGORIZED_LABEL } from './constants'

const HEADERS = ['Data', 'Categoria', 'Descricao', 'Tipo', 'Valor', 'Recorrente']

export function buildTransactionsCsv(transactions, categories) {
  const rows = [HEADERS.join(',')]

  transactions.forEach((t) => {
    const catName = categories.find((c) => c.id === t.category_id)?.name || UNCATEGORIZED_LABEL
    rows.push(
      `${t.expense_date},"${catName}","${t.description || ''}",${t.type === 'income' ? 'Receita' : 'Despesa'},${t.amount},${t.is_recurring ? 'Sim' : 'Nao'}`
    )
  })

  return rows.join('\n')
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
