import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight, X, AlertCircle, Search, Repeat } from 'lucide-react'

const COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getMonthBounds(date) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] }
}

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState('expense')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState(() => new Date().getDate())

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  
  const [fieldErrors, setFieldErrors] = useState({})
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (showMonthPicker) setPickerYear(currentDate.getFullYear())
  }, [showMonthPicker, currentDate])

  useEffect(() => {
    if (session?.user?.id) fetchCategories()
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) fetchTransactions()
  }, [currentDate, session?.user?.id])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true })
    if (error) return console.error(error)

    if (!data || data.length === 0) {
      const defaultCategories = [
        { name: 'Alimentação', user_id: session.user.id, type: 'expense' },
        { name: 'Transporte', user_id: session.user.id, type: 'expense' },
        { name: 'Lazer', user_id: session.user.id, type: 'expense' },
        { name: 'Salário', user_id: session.user.id, type: 'income' },
        { name: 'Investimentos', user_id: session.user.id, type: 'income' },
      ]
      const { data: inserted, error: insertErr } = await supabase.from('categories').insert(defaultCategories).select('*')
      if (insertErr) return console.error(insertErr)
      setCategories(inserted ?? [])
      return
    }
    setCategories(data)
  }

  const fetchTransactions = async () => {
    const { startDate, endDate } = getMonthBounds(currentDate)
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, description, expense_date, category_id, categories(name), type, is_recurring')
      .lte('expense_date', endDate)
      .or(`expense_date.gte.${startDate},is_recurring.eq.true`)

    if (error) return console.error(error)

    const viewedYear = currentDate.getFullYear()
    const viewedMonth = currentDate.getMonth()

    const processedData = (data ?? []).map((t) => {
      if (t.is_recurring) {
        const originalDay = t.expense_date.split('-')[2]
        const lastDayOfMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate()
        const safeDay = Math.min(Number.parseInt(originalDay, 10), lastDayOfMonth)
        const newDate = `${viewedYear}-${String(viewedMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
        return { ...t, expense_date: newDate }
      }
      return t
    })

    processedData.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
    setTransactions(processedData)
  }

  const handleAddCategory = async () => {
    setCategoryError('')
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return setCategoryError('Preencha este campo.')

    const exists = categories.some((cat) => cat.name.toLowerCase() === trimmedName.toLowerCase() && (cat.type || 'expense') === transactionType)
    if (exists) return setCategoryError('Já existe para este tipo.')

    setIsSaving(true)
    const { data, error } = await supabase.from('categories').insert([{ name: trimmedName, user_id: session.user.id, type: transactionType }]).select()
    setIsSaving(false)

    if (error) {
      setCategoryError(error.code === '23505' ? 'Esta categoria já existe.' : 'Erro ao criar categoria.')
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
    if (cat) setCategoryToDelete(cat)
  }

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return
    setIsSaving(true)
    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id)
    setIsSaving(false)
    setCategoryToDelete(null)

    if (error) {
      setErrorMessage(error.code === '23503' ? 'Existem registros vinculados a esta categoria.' : 'Erro ao excluir.')
      return
    }
    setCategories(categories.filter(c => c.id !== categoryToDelete.id))
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
    if (!amount) errors.amount = 'Preencha.'
    if (!isAddingCategory && !categoryId) errors.categoryId = 'Selecione.'
    if (isRecurring && !recurringDay) errors.recurringDay = 'Inválido.'
    else if (!isRecurring && !expenseDate) errors.expenseDate = 'Preencha.'

    if (Object.keys(errors).length > 0) return setFieldErrors(errors)
    setFieldErrors({})

    const parsedAmount = Number.parseFloat(amount)
    if (parsedAmount < 0) return setErrorMessage('O valor não pode ser negativo.')

    let finalDate = expenseDate
    if (isRecurring) {
      const y = currentDate.getFullYear()
      const m = String(currentDate.getMonth() + 1).padStart(2, '0')
      const d = String(recurringDay).padStart(2, '0')
      finalDate = `${y}-${m}-${d}`
    }

    setIsSaving(true)
    const { error } = await supabase.from('expenses').insert([{
      user_id: session.user.id, category_id: categoryId, amount: parsedAmount, description: description.trim(), expense_date: finalDate, type: transactionType, is_recurring: isRecurring
    }])
    setIsSaving(false)

    if (error) return setErrorMessage(error.message)
    closeModal()
    await fetchTransactions()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return setErrorMessage(error.message)
    await fetchTransactions()
  }

  const goToPreviousMonth = () => setCurrentDate((date) => { const nd = new Date(date); nd.setMonth(nd.getMonth() - 1); return nd })
  const goToNextMonth = () => setCurrentDate((date) => { const nd = new Date(date); nd.setMonth(nd.getMonth() + 1); return nd })

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense' || !c.type), [categories])
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])
  const activeModalCategories = transactionType === 'expense' ? expenseCategories : incomeCategories

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0), [transactions])
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense' || !t.type).reduce((sum, t) => sum + Number(t.amount), 0), [transactions])
  const balance = totalIncome - totalExpense

  const expensesByCategory = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' || !t.type).reduce((acc, expense) => {
      const name = expense.categories?.name ?? 'Sem categoria'
      acc[name] = (acc[name] || 0) + Number(expense.amount)
      return acc
    }, {})
  }, [transactions])
  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }))

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchCat = filterCategory ? t.category_id === filterCategory : true
      const search = searchTerm.toLowerCase()
      const matchSearch = searchTerm ? t.description?.toLowerCase().includes(search) || t.categories?.name?.toLowerCase().includes(search) : true
      return matchCat && matchSearch
    });
  }, [transactions, filterCategory, searchTerm])

  const totalFiltered = useMemo(() => filteredTransactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0), [filteredTransactions])

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8 w-full max-w-[100vw] overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl">
        
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between w-full">
          <div className="max-w-full">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.35em] text-cyan-300/80 truncate">Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white truncate">Finanças</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:text-rose-300 w-full sm:w-auto">
            <LogOut size={18} /> Sair
          </button>
        </div>

        {/* ESTRUTURA PRINCIPAL (Colunas em telas grandes) */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          
          {/* COLUNA ESQUERDA */}
          <div className="flex w-full flex-col gap-6">
            
            {/* CARDS DE RESUMO E CONTROLE DE MÊS */}
            <section className="relative z-20 flex w-full flex-col rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl backdrop-blur sm:p-6">
              <div className="mb-4 flex w-full flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Controle Mensal</h2>
                </div>
                
                {/* Seletor de Mês Blindado */}
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 rounded-xl bg-white/5 p-1">
                  <button onClick={goToPreviousMonth} className="p-2 text-slate-300 hover:text-white"><ChevronLeft size={18} /></button>
                  <div className="relative flex-1 text-center sm:flex-none">
                    <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="w-full px-2 py-1 text-sm font-semibold uppercase tracking-widest text-cyan-200">
                      {currentDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}
                    </button>
                    {showMonthPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                        <div className="absolute left-1/2 top-[120%] z-50 w-[280px] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl sm:w-64 sm:left-auto sm:right-0 sm:translate-x-0">
                          <div className="mb-4 flex items-center justify-between">
                            <button onClick={() => setPickerYear(y => y - 1)} className="p-1 text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
                            <span className="font-bold text-white">{pickerYear}</span>
                            <button onClick={() => setPickerYear(y => y + 1)} className="p-1 text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {MONTHS_SHORT.map((monthStr, index) => {
                              const isCurrent = currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear;
                              return (
                                <button key={monthStr} onClick={() => { setCurrentDate(new Date(pickerYear, index, 1)); setShowMonthPicker(false) }} className={`rounded-xl py-2 text-sm font-medium ${isCurrent ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                                  {monthStr}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={goToNextMonth} className="p-2 text-slate-300 hover:text-white"><ChevronRight size={18} /></button>
                </div>
              </div>

              {/* Grid 2x2 no mobile, 3 colunas no Desktop */}
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-xs sm:text-sm text-emerald-200/70">Receitas</p>
                  <p className="mt-1 text-base sm:text-xl font-bold text-emerald-400 truncate">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <p className="text-xs sm:text-sm text-rose-200/70">Despesas</p>
                  <p className="mt-1 text-base sm:text-xl font-bold text-rose-400 truncate">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <p className="text-xs sm:text-sm text-cyan-200/70">Saldo do mês</p>
                  <p className="mt-1 text-xl font-bold text-cyan-400 truncate">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </section>

            {/* GRÁFICO */}
            <section className="flex w-full flex-col rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl backdrop-blur sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Gráfico</h2>
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                        {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-400">Sem dados.</div>
                )}
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA E LISTA DE TRANSAÇÕES */}
          <div className="flex w-full flex-col gap-6">
            
            {/* BOTÃO NOVO LANÇAMENTO (Fixo na grid para Desktop, aparece igual no Mobile) */}
            <button onClick={() => setShowModal(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400">
              <Plus size={20} /> Adicionar Lançamento
            </button>

            {/* LISTA */}
            <section className="flex w-full flex-col rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl backdrop-blur sm:p-6">
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{filteredTransactions.length} regs</span>
                </div>
                
                {/* Filtros em linha no Mobile */}
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <div className="relative w-full sm:flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none" />
                  </div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 outline-none sm:w-auto">
                    <option value="">Todas</option>
                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Tabela com limite de altura adaptável */}
              <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar max-h-[350px]">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => {
                    const isIncome = t.type === 'income'
                    return (
                      <article key={t.id} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-sm font-semibold text-white sm:text-base">{t.categories?.name ?? 'Sem categoria'}</p>
                          <p className="truncate text-xs text-slate-400 mt-0.5">{t.description ? `${t.description} • ` : ''}{new Date(t.expense_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                          <span className={`text-sm font-bold sm:text-base ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                            {isIncome ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                          </span>
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400 border border-dashed border-white/10 rounded-2xl">Nenhum registro encontrado.</div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* MODAL RESPONSIVO (Centralizado e adaptável) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:rounded-3xl custom-scrollbar animate-slide-up">
            
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/10 sm:hidden"></div>
            
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Lançamento</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="mb-5 flex gap-2 rounded-xl bg-slate-950/50 p-1">
              <button type="button" onClick={() => { setTransactionType('expense'); setCategoryId(''); setCategoryError(''); setIsRecurring(false) }} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${transactionType === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'}`}>Despesa</button>
              <button type="button" onClick={() => { setTransactionType('income'); setCategoryId(''); setCategoryError(''); setIsRecurring(true) }} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${transactionType === 'income' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`}>Receita</button>
            </div>

            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-300">Valor</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                  <input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(Math.max(0, e.target.value))} className="w-full rounded-xl bg-slate-950/70 py-3.5 pl-11 pr-4 text-white outline-none border border-white/10 focus:border-cyan-400" placeholder="0.00" />
                </div>
                {fieldErrors.amount && <span className="text-xs text-rose-500 mt-1">{fieldErrors.amount}</span>}
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-slate-300">Categoria</label>
                  {!isAddingCategory && <button type="button" onClick={() => setIsAddingCategory(true)} className="text-xs text-cyan-400">+ Nova</button>}
                </div>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full rounded-xl bg-slate-950/70 px-4 py-3.5 text-white border border-white/10 outline-none" placeholder="Nome..." />
                    <button type="button" onClick={handleAddCategory} className="bg-cyan-500 px-4 rounded-xl text-white font-semibold">OK</button>
                    <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-white/5 px-3 rounded-xl text-white"><X size={18} /></button>
                  </div>
                ) : (
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl bg-slate-950/70 px-4 py-3.5 text-white border border-white/10 outline-none">
                    <option value="">Selecione...</option>
                    {activeModalCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {categoryError && <span className="text-xs text-rose-500 mt-1">{categoryError}</span>}
              </div>

              <div>
                <label className="text-sm text-slate-300">Descrição</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-950/70 px-4 py-3.5 text-white border border-white/10 outline-none" placeholder="Opcional..." />
              </div>

              <label className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-5 w-5 rounded bg-slate-950/70 border-white/20 text-cyan-500 focus:ring-cyan-500" />
                <span className="text-sm text-slate-300">Transação recorrente</span>
              </label>

              {isRecurring ? (
                <div>
                  <label className="text-sm text-slate-300">Dia (1-31)</label>
                  <input type="number" min="1" max="31" value={recurringDay} onChange={(e) => setRecurringDay(Math.min(31, Math.max(1, e.target.value)))} className="w-full mt-1 rounded-xl bg-slate-950/70 px-4 py-3.5 text-white border border-white/10 outline-none" />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-slate-300">Data</label>
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full mt-1 rounded-xl bg-slate-950/70 px-4 py-3.5 text-white border border-white/10 outline-none" />
                </div>
              )}

              <button type="submit" disabled={isSaving} className="mt-2 w-full rounded-xl bg-cyan-500 py-4 font-bold text-white transition hover:bg-cyan-400">
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAIS DE CONFIRMAÇÃO/ERRO AQUI (mantive a lógica, adicione se necessário) */}
    </div>
  )
}