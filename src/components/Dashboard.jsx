import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight, X, AlertCircle, Search, Repeat } from 'lucide-react'

const COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getMonthBounds(date) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Estados do formulário
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState('expense') // 'expense' ou 'income'
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState(() => new Date().getDate()) // Novo estado para o dia

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  
  const [fieldErrors, setFieldErrors] = useState({})

  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())

  // Estados dos filtros da lista
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (showMonthPicker) {
      setPickerYear(currentDate.getFullYear())
    }
  }, [showMonthPicker, currentDate])

  useEffect(() => {
    if (session?.user?.id) {
      fetchCategories()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions()
    }
  }, [currentDate, session?.user?.id])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    const existingCategories = data ?? []

    if (existingCategories.length === 0) {
      // Cadastra categorias padrões incluindo receitas se a conta for nova
      const defaultCategories = [
        { name: 'Alimentação', user_id: session.user.id, type: 'expense' },
        { name: 'Transporte', user_id: session.user.id, type: 'expense' },
        { name: 'Lazer', user_id: session.user.id, type: 'expense' },
        { name: 'Salário', user_id: session.user.id, type: 'income' },
        { name: 'Investimentos', user_id: session.user.id, type: 'income' },
      ]

      const { data: insertedCategories, error: insertError } = await supabase
        .from('categories')
        .insert(defaultCategories)
        .select('*')

      if (insertError) {
        console.error(insertError)
        return
      }

      setCategories(insertedCategories ?? [])
      return
    }

    setCategories(existingCategories)
  }

  const fetchTransactions = async () => {
    const { startDate, endDate } = getMonthBounds(currentDate)

    // Ajuste da Query: Pega transações dentro do mês OU transações recorrentes criadas ANTES ou DURANTE o mês
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, description, expense_date, category_id, categories(name), type, is_recurring')
      .lte('expense_date', endDate)
      .or(`expense_date.gte.${startDate},is_recurring.eq.true`)

    if (error) {
      console.error(error)
      return
    }

    const viewedYear = currentDate.getFullYear()
    const viewedMonth = currentDate.getMonth()

    // Lógica para projetar as transações recorrentes no mês atual visualizado
    const processedData = (data ?? []).map((t) => {
      if (t.is_recurring) {
        const originalDay = t.expense_date.split('-')[2]
        // Se for dia 31 e o mês tiver 28 dias, ele trava no dia 28
        const lastDayOfMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate()
        const safeDay = Math.min(Number.parseInt(originalDay, 10), lastDayOfMonth)
        
        const newDate = `${viewedYear}-${String(viewedMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
        return { ...t, expense_date: newDate }
      }
      return t
    })

    // Ordena do mais recente pro mais antigo (já que reescrevemos as datas das recorrentes)
    processedData.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))

    setTransactions(processedData)
  }

  const handleAddCategory = async () => {
    setCategoryError('')
    const trimmedName = newCategoryName.trim()
    
    if (!trimmedName) {
      setCategoryError('Preencha este campo.')
      return
    }

    // Verifica se já existe uma categoria com o mesmo nome PARA O MESMO TIPO
    const categoryExists = categories.some(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase() && (cat.type || 'expense') === transactionType
    )

    if (categoryExists) {
      setCategoryError('Esta categoria já existe para este tipo de registro.')
      return
    }

    setIsSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: trimmedName, user_id: session.user.id, type: transactionType }])
      .select()
    setIsSaving(false)

    if (error) {
      if (error.code === '23505') {
        setCategoryError('Esta categoria já existe.')
      } else {
        setCategoryError('Erro ao criar categoria.')
      }
    } else if (data) {
      setCategories((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(data[0].id)
      setNewCategoryName('')
      setIsAddingCategory(false)
    }
  }

  const confirmDeleteCategory = () => {
    if (!categoryId) return
    const cat = categories.find(c => c.id === categoryId)
    if (cat) {
      setCategoryToDelete(cat)
    }
  }

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return
    
    setIsSaving(true)
    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id)
    setIsSaving(false)
    setCategoryToDelete(null)

    if (error) {
      if (error.code === '23503') {
        setErrorMessage('Não é possível excluir esta categoria pois já existem registros vinculados a ela.')
      } else {
        setErrorMessage('Erro ao excluir categoria: ' + error.message)
      }
      return
    }

    const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id)
    setCategories(updatedCategories)
    setCategoryId('')
  }

  const closeModal = () => {
    setShowModal(false)
    setAmount('')
    setDescription('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setTransactionType('expense')
    setCategoryId('')
    setIsRecurring(false)
    setRecurringDay(new Date().getDate())
    setIsAddingCategory(false)
    setCategoryError('')
    setNewCategoryName('')
    setFieldErrors({})
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()

    const errors = {}
    if (!amount) errors.amount = 'Preencha este campo.'
    if (!isAddingCategory && !categoryId) errors.categoryId = 'Preencha este campo.'
    
    if (isRecurring && !recurringDay) {
      errors.recurringDay = 'Preencha o dia.'
    } else if (!isRecurring && !expenseDate) {
      errors.expenseDate = 'Preencha a data.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    const parsedAmount = Number.parseFloat(amount)
    if (parsedAmount < 0) {
      setErrorMessage('O valor não pode ser negativo.')
      return
    }

    let finalDate = expenseDate
    if (isRecurring) {
      // Cria a data usando o mês e ano atualmente selecionados na tela
      const y = currentDate.getFullYear()
      const m = String(currentDate.getMonth() + 1).padStart(2, '0')
      const d = String(recurringDay).padStart(2, '0')
      finalDate = `${y}-${m}-${d}`
    }

    setIsSaving(true)

    const { error } = await supabase.from('expenses').insert([
      {
        user_id: session.user.id,
        category_id: categoryId,
        amount: parsedAmount,
        description: description.trim(),
        expense_date: finalDate,
        type: transactionType,
        is_recurring: isRecurring
      },
    ])

    setIsSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    closeModal()
    await fetchTransactions()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    await fetchTransactions()
  }

  const goToPreviousMonth = () => {
    setCurrentDate((date) => {
      const nextDate = new Date(date)
      nextDate.setMonth(nextDate.getMonth() - 1)
      return nextDate
    })
  }

  const goToNextMonth = () => {
    setCurrentDate((date) => {
      const nextDate = new Date(date)
      nextDate.setMonth(nextDate.getMonth() + 1)
      return nextDate
    })
  }

  // --- CÁLCULOS E FILTROS ---

  // Divisão de categorias para as lógicas de filtro
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense' || !c.type), [categories])
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])
  const activeModalCategories = transactionType === 'expense' ? expenseCategories : incomeCategories

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  )

  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense' || !t.type).reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  )

  const balance = totalIncome - totalExpense

  const expensesByCategory = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' || !t.type)
      .reduce((accumulator, expense) => {
        const categoryName = expense.categories?.name ?? 'Sem categoria'
        accumulator[categoryName] = (accumulator[categoryName] || 0) + Number(expense.amount)
        return accumulator
      }, {})
  }, [transactions])

  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }))

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchCategory = filterCategory ? transaction.category_id === filterCategory : true
      const searchLower = searchTerm.toLowerCase()
      const matchSearch = searchTerm 
        ? transaction.description?.toLowerCase().includes(searchLower) || 
          transaction.categories?.name?.toLowerCase().includes(searchLower)
        : true

      return matchCategory && matchSearch
    });
  }, [transactions, filterCategory, searchTerm])

  const totalFiltered = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
    [filteredTransactions]
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Dashboard financeiro</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Meus gastos</h1>
          <p className="mt-1 text-sm text-slate-400">Acompanhe os valores do mês atual e detalhe por categoria.</p>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:text-rose-300 md:self-auto"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="relative z-20 flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Período</p>
              <h2 className="text-lg font-semibold text-white">Controle mensal</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="relative flex min-w-[200px] items-center justify-center">
                <button
                  onClick={() => setShowMonthPicker(!showMonthPicker)}
                  className="rounded-lg px-3 py-1.5 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-white/5 hover:text-cyan-300"
                >
                  {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </button>

                {showMonthPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMonthPicker(false)}
                    />
                    
                    <div className="absolute top-[120%] z-50 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <button
                          onClick={() => setPickerYear(y => y - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="font-bold text-white">{pickerYear}</span>
                        <button
                          onClick={() => setPickerYear(y => y + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS_SHORT.map((monthStr, index) => {
                          const isCurrent = currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear;
                          return (
                            <button
                              key={monthStr}
                              onClick={() => {
                                setCurrentDate(new Date(pickerYear, index, 1))
                                setShowMonthPicker(false)
                              }}
                              className={`rounded-xl py-2 text-sm font-medium transition ${
                                isCurrent 
                                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' 
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {monthStr}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={goToNextMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid w-full gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-sm text-emerald-200/70">Receitas</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
              <p className="text-sm text-rose-200/70">Despesas</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-rose-400">
                R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <p className="text-sm text-cyan-200/70">Saldo do mês</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-cyan-400">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">Novo registro</p>
              <h2 className="text-xl font-bold text-white">Lançamento</h2>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Plus size={18} />
              Novo
            </button>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Cadastre uma despesa ou receita, escolha a categoria e acompanhe seu saldo e a distribuição no gráfico.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-white">Despesas por categoria</h2>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-400">
              Nenhuma despesa neste mês.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Detalhes do mês</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {filteredTransactions.length} registros
                </span>
                {filterCategory && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${totalFiltered >= 0 ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                    R$ {Math.abs(totalFiltered).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Barra de Pesquisa */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400/60 sm:w-40"
                />
              </div>

              {/* Filtro Categoria Agrupado */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-cyan-400/60 sm:w-auto"
              >
                <option value="" className="bg-slate-900 text-slate-100">Todas as categorias</option>
                {expenseCategories.length > 0 && (
                  <optgroup label="Despesas" className="bg-slate-800 text-slate-400 font-semibold">
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id} className="bg-slate-900 text-slate-100 font-normal">
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {incomeCategories.length > 0 && (
                  <optgroup label="Receitas" className="bg-slate-800 text-slate-400 font-semibold">
                    {incomeCategories.map((category) => (
                      <option key={category.id} value={category.id} className="bg-slate-900 text-slate-100 font-normal">
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="max-h-[285px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income'
                return (
                  <article key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{transaction.categories?.name ?? 'Sem categoria'}</p>
                        {transaction.is_recurring && (
                          <span title="Lançamento Recorrente">
                            <Repeat size={14} className="text-cyan-400" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {transaction.description ? `${transaction.description} • ` : ''}{new Date(transaction.expense_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                        {isIncome ? '+ ' : '- '}R$ {Number(transaction.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                        aria-label="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="flex h-[285px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Principal: Novo Registro (z-50) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <div className="mb-6">
              <p className="text-sm text-slate-400">Lançamento</p>
              <h2 className="text-2xl font-bold text-white">Novo registro</h2>
            </div>

            {/* Alternador Despesa / Receita */}
            <div className="mb-6 flex gap-2 rounded-xl bg-slate-950/50 p-1">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('expense')
                  setCategoryId('')
                  setCategoryError('')
                  setIsRecurring(false) // Desmarca ao alternar para Despesa
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  transactionType === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType('income')
                  setCategoryId('')
                  setCategoryError('')
                  setIsRecurring(true) // Marca automaticamente ao alternar para Receita
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  transactionType === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Receita
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4" noValidate>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault()
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value
                      if (Number(val) < 0) return
                      setAmount(val)
                      if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: null }))
                    }}
                    className={`w-full rounded-xl border bg-slate-950/70 pl-11 pr-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      fieldErrors.amount ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {fieldErrors.amount && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.amount}</p>}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">Categoria de {transactionType === 'expense' ? 'Despesa' : 'Receita'}</label>
                  {!isAddingCategory && (
                    <div className="flex items-center gap-3">
                      {categoryId && (
                        <button
                          type="button"
                          onClick={confirmDeleteCategory}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-400 transition hover:text-rose-300"
                          title="Excluir categoria selecionada"
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
                      >
                        + Nova categoria
                      </button>
                    </div>
                  )}
                </div>

                {isAddingCategory ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => {
                          setNewCategoryName(e.target.value)
                          if (categoryError) setCategoryError('')
                        }}
                        className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 ${
                          categoryError ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                        }`}
                        placeholder={`Nome da ${transactionType === 'expense' ? 'despesa' : 'receita'}...`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={isSaving}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false)
                          setCategoryError('')
                          setNewCategoryName('')
                        }}
                        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-slate-300 transition hover:bg-white/10"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    {categoryError && <p className="text-xs font-medium text-rose-500">{categoryError}</p>}
                  </div>
                ) : (
                  <>
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value)
                        if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: null }))
                      }}
                      className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition ${
                        fieldErrors.categoryId ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-slate-100">Selecione...</option>
                      {activeModalCategories.map((category) => (
                        <option key={category.id} value={category.id} className="bg-slate-900 text-slate-100">
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.categoryId && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.categoryId}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Descrição <span className="font-normal text-slate-500">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
                  placeholder={
                    transactionType === 'expense'
                      ? 'Mercado, combustível, peças do PC...'
                      : 'Salário, bolsa de estágio, rendimentos...'
                  }
                />
              </div>

              {/* Checkbox de Recorrência colocado ANTES do campo de data/dia */}
              <label className="flex cursor-pointer items-center gap-3 py-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-slate-950/70 transition-all checked:border-cyan-500 checked:bg-cyan-500 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-1 focus:ring-offset-slate-900"
                  />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-900 opacity-0 transition-opacity peer-checked:opacity-100">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-300">
                  Marcar como transação recorrente
                </span>
              </label>

              {/* Alterna dinamicamente entre Data Completa e Apenas o Dia */}
              {isRecurring ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Dia do mês (1 a 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recurringDay}
                    onChange={(e) => {
                      let val = Number.parseInt(e.target.value)
                      if (val < 1) val = 1
                      if (val > 31) val = 31
                      setRecurringDay(val || '')
                      if (fieldErrors.recurringDay) setFieldErrors((prev) => ({ ...prev, recurringDay: null }))
                    }}
                    className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      fieldErrors.recurringDay ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                    }`}
                  />
                  {fieldErrors.recurringDay && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.recurringDay}</p>}
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Data</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => {
                      setExpenseDate(e.target.value)
                      if (fieldErrors.expenseDate) setFieldErrors((prev) => ({ ...prev, expenseDate: null }))
                    }}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition ${
                      fieldErrors.expenseDate ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                    }`}
                  />
                  {fieldErrors.expenseDate && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.expenseDate}</p>}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isAddingCategory}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (z-[60]) */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-bold text-white">Excluir categoria</h3>
            <p className="mb-6 text-sm text-slate-300">
              Tem certeza que deseja excluir a categoria <span className="font-semibold text-white">"{categoryToDelete.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteCategory}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isSaving ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro Global (z-[70]) */}
      {errorMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl shadow-rose-900/20">
            <div className="mb-3 flex items-center gap-2 text-rose-400">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-white">Aviso</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-300">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage('')}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white transition hover:bg-white/20"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}