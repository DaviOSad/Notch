export const formatCurrency = (value, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency }).format(value)
}

// Impede sinais e notação científica nos inputs numéricos.
export const blockInvalidChars = (e) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) {
    e.preventDefault()
  }
}