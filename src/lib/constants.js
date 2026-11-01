// Constantes compartilhadas do dashboard.

// Cores das categorias na fita do mês, pensadas para o fundo petróleo. Ficam de fora
// o verde (receita) e o coral (despesa), que já têm significado na interface.
export const COLORS = ['#7FB7FF', '#C3A2FF', '#F28CB8', '#FFB38A', '#4FD1D9', '#E3D26F', '#9AA8FF', '#D68FD6']

export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Cotação fixa: não há consulta de câmbio ao vivo.
export const USD_RATE = 5.45

// Quantidade de lançamentos exibidos por página no histórico.
export const PAGE_SIZE = 15

// Categorias de manutenção criadas automaticamente pelas movimentações de metas.
export const GOAL_DEPOSIT_CATEGORY = 'Metas (Aportes)'
export const GOAL_WITHDRAWAL_CATEGORY = 'Metas (Resgates)'
export const SYSTEM_CATEGORY_NAMES = [GOAL_DEPOSIT_CATEGORY, GOAL_WITHDRAWAL_CATEGORY]

// Como as metas aparecem nos totais e na fita do mês (âmbar: dinheiro separado).
export const GOALS_LABEL = 'Metas'
export const GOALS_COLOR = '#F2A900'

export const UNCATEGORIZED_LABEL = 'Sem categoria'
export const UNCATEGORIZED_COLOR = '#6F8C87'