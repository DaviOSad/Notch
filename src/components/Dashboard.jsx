import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { LogOut, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, X, Search, Repeat, Wallet, Settings, User, Download, CornerDownRight } from 'lucide-react'

// --- CONSTANTES & HELPERS ---
const COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#3b82f6']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const getMonthBounds = (date) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] }
}

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// --- SUBCOMPONENTES DE UI PÚBLICOS ---
const StatCard = ({ title, amount, colorClass, borderColor, textColor }) => (
  <div className={`flex-1 rounded-2xl ${colorClass} p-3 sm:p-4 border ${borderColor}`}>
    <p className={`text-[10px] sm:text-xs font-bold ${textColor} mb-1 uppercase tracking-wider opacity-70`}>{title}</p>
    <p className={`text-sm sm:text-lg font-bold ${textColor} truncate`}>{formatCurrency(amount)}</p>
  </div>
)

const TransactionItem = ({ t, onEdit, onDelete, getCategoryPath }) => (
  <div className="group flex w-full items-center justify-between rounded-2xl bg-slate-900/40 p-4 transition-colors hover:bg-slate-900/80 border border-white/5">
    <div className="flex flex-1 flex-col min-w-0 pr-4">
      <p className="truncate text-base font-semibold text-slate-100 flex items-center gap-1.5">
        {getCategoryPath(t.category_id)}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <p className="truncate text-xs text-slate-500">
          {t.description ? `${t.description} • ` : ''}
          {new Date(t.expense_date + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>
        {t.is_recurring && <Repeat size={12} className="text-cyan-500/70 shrink-0 ml-1" />}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className={`text-base font-bold mr-1 ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-100'}`}>
        {t.type === 'income' ? '+ ' : '- '}{formatCurrency(t.amount)}
      </span>
      <button onClick={() => onEdit(t)} className="text-slate-600 hover:text-cyan-500 transition-colors p-1" title="Editar">
        <Pencil size={18} />
      </button>
      <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-rose-500 transition-colors p-1" title="Excluir">
        <Trash2 size={18} />
      </button>
    </div>
  </div>
)

// --- COMPONENTE PRINCIPAL ---
export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [visibleCount, setVisibleCount] = useState(15)
  
  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState('expense')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState(() => new Date().getDate())
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [formErrors, setFormErrors] = useState({})
  
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    setVisibleCount(15)
  }, [currentDate, filterCategory, searchTerm])

  useEffect(() => {
    document.body.style.overflow = (showModal || showSettings || showMonthPicker || categoryToDelete || errorMessage) ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [showModal, showSettings, showMonthPicker, categoryToDelete, errorMessage])

  useEffect(() => {
    if (showMonthPicker) setPickerYear(currentDate.getFullYear())
  }, [showMonthPicker, currentDate])

  useEffect(() => {
    if (session?.user?.id) { fetchCategories(); fetchTransactions() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, session?.user?.id])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true })
    if (error) return console.error(error)
    
    if (!data || data.length === 0) {
      const defaultCategories = [
        { name: 'Alimentação', user_id: session.user.id, type: 'expense', parent_id: null },
        { name: 'Transporte', user_id: session.user.id, type: 'expense', parent_id: null },
        { name: 'Salário', user_id: session.user.id, type: 'income', parent_id: null },
      ]
      const { data: inserted } = await supabase.from('categories').insert(defaultCategories).select('*')
      setCategories(inserted ?? [])
      return
    }
    setCategories(data)
  }

  const fetchTransactions = async () => {
    const { endDate } = getMonthBounds(currentDate)
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, description, expense_date, category_id, type, is_recurring')
      .lte('expense_date', endDate)

    if (error) return console.error(error)

    const viewedYear = currentDate.getFullYear()
    const viewedMonth = currentDate.getMonth()
    const currentMonthData = []

    ;(data ?? []).forEach((t) => {
      const tDate = new Date(t.expense_date + 'T12:00:00')
      let occurrences = 1
      
      if (t.is_recurring) {
        occurrences = (viewedYear - tDate.getFullYear()) * 12 + (viewedMonth - tDate.getMonth()) + 1
        if (occurrences < 0) occurrences = 0
        if (occurrences > 0) {
          const originalDay = t.expense_date.split('-')[2]
          const lastDayOfMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate()
          const safeDay = Math.min(Number.parseInt(originalDay, 10), lastDayOfMonth)
          currentMonthData.push({ ...t, expense_date: `${viewedYear}-${String(viewedMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}` })
        }
      } else {
        if (tDate.getFullYear() === viewedYear && tDate.getMonth() === viewedMonth) currentMonthData.push(t)
      }
    })
    
    currentMonthData.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
    setTransactions(currentMonthData)
  }

  const handleAddCategory = async () => {
    setCategoryError('')
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return setCategoryError('Preencha o nome da categoria.')

    const isDuplicate = categories.some((cat) => 
      cat.name.toLowerCase() === trimmedName.toLowerCase() && 
      (cat.type || 'expense') === transactionType &&
      cat.parent_id === (newCategoryParentId || null)
    )

    if (isDuplicate) return setCategoryError('Esta categoria já existe neste nível.')

    setIsSaving(true)
    const payload = { 
      name: trimmedName, 
      user_id: session.user.id, 
      type: transactionType,
      parent_id: newCategoryParentId || null 
    }
    
    const { data, error } = await supabase.from('categories').insert([payload]).select()
    setIsSaving(false)

    if (error) {
      setCategoryError(error.message)
    } else if (data) {
      setCategories((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(data[0].id)
      resetCategoryForm()
    }
  }

  const resetCategoryForm = () => {
    setIsAddingCategory(false)
    setNewCategoryName('')
    setNewCategoryParentId('')
    setCategoryError('')
    setFormErrors(prev => ({ ...prev, categoryId: null }))
  }

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return
    
    const hasChildren = categories.some(c => c.parent_id === categoryToDelete.id)
    if (hasChildren) {
      setErrorMessage('Não é possível excluir esta categoria porque ela possui subcategorias vinculadas.')
      setCategoryToDelete(null)
      return
    }

    setIsSaving(true)
    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id)
    setIsSaving(false)
    setCategoryToDelete(null)

    if (error) {
      setErrorMessage(error.code === '23503' ? 'Não é possível excluir esta categoria pois há lançamentos associados a ela.' : 'Erro ao excluir categoria: ' + error.message)
      return
    }
    setCategories(categories.filter(c => c.id !== categoryToDelete.id))
    setCategoryId('')
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!amount || Number(amount) <= 0) errors.amount = 'Preencha um valor maior que zero.'
    if (!isAddingCategory && !categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (isRecurring && (!recurringDay || recurringDay < 1 || recurringDay > 31)) errors.date = 'Preencha um dia válido (1 a 31).'
    else if (!isRecurring && !expenseDate) errors.date = 'Preencha a data do lançamento.'

    if (Object.keys(errors).length > 0) return setFormErrors(errors)
    setFormErrors({})

    const finalDate = isRecurring 
      ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(recurringDay).padStart(2, '0')}`
      : expenseDate

    const payload = {
      user_id: session.user.id, category_id: categoryId, amount: Number.parseFloat(amount), 
      description: description.trim(), expense_date: finalDate, type: transactionType, is_recurring: isRecurring
    }

    setIsSaving(true)
    transactionToEdit 
      ? await supabase.from('expenses').update(payload).eq('id', transactionToEdit.id)
      : await supabase.from('expenses').insert([payload])
    
    setIsSaving(false)
    closeModal()
    fetchTransactions()
  }

  const handleDelete = async (id) => {
    await supabase.from('expenses').delete().eq('id', id)
    fetchTransactions()
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setPasswordError(''); setPasswordSuccess('')

    if (newPassword.length < 8) return setPasswordError('A senha deve ter pelo menos 8 caracteres.')
    if (newPassword !== confirmPassword) return setPasswordError('As senhas não coincidem.')

    setIsUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsUpdatingPassword(false)

    if (error) setPasswordError('Erro ao atualizar: ' + error.message)
    else {
      setPasswordSuccess('Senha atualizada com sucesso!'); setNewPassword(''); setConfirmPassword('')
      setTimeout(() => { setIsChangingPassword(false); setPasswordSuccess('') }, 2000)
    }
  }

  const getCategoryPath = (catId) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return 'Sem categoria'
    
    if (cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id)
      return (
        <>
          <span className="text-slate-400">{parent?.name || 'Pai excluido'}</span>
          <CornerDownRight size={14} className="text-slate-600 mx-0.5" />
          <span>{cat.name}</span>
        </>
      )
    }
    return cat.name
  }

  const getParentCategoryName = (catId) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return 'Sem categoria'
    if (cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id)
      return parent ? parent.name : cat.name
    }
    return cat.name
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) return
    const headers = ['Data', 'Categoria', 'Descricao', 'Tipo', 'Valor', 'Recorrente']
    const csvRows = [headers.join(',')]
    
    transactions.forEach(t => {
      const catName = categories.find(c => c.id === t.category_id)?.name || 'Sem categoria'
      csvRows.push(`${t.expense_date},"${catName}","${t.description || ''}",${t.type === 'income' ? 'Receita' : 'Despesa'},${t.amount},${t.is_recurring ? 'Sim' : 'Nao'}`)
    })
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `lancamentos_${MONTHS_SHORT[currentDate.getMonth()]}_${currentDate.getFullYear()}.csv`
    a.click()
  }

  const openEditModal = (t) => {
    setTransactionToEdit(t); setTransactionType(t.type || 'expense'); setAmount(t.amount.toString())
    setCategoryId(t.category_id || ''); setDescription(t.description || ''); setIsRecurring(t.is_recurring || false)
    if (t.is_recurring) setRecurringDay(parseInt(t.expense_date.split('-')[2], 10))
    else setExpenseDate(t.expense_date)
    setFormErrors({}); setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false); setTransactionToEdit(null); setAmount(''); setDescription(''); setCategoryId('')
    resetCategoryForm(); setErrorMessage(''); setFormErrors({})
    setTransactionType('expense'); setIsRecurring(false); setRecurringDay(new Date().getDate())
  }

  const closeSettings = () => {
    setShowSettings(false); setIsChangingPassword(false); setPasswordError(''); setPasswordSuccess(''); setNewPassword(''); setConfirmPassword('')
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense' || !t.type).reduce((sum, t) => sum + Number(t.amount), 0)
  const monthlyRemaining = totalIncome - totalExpense

  // --- NOVA LÓGICA DE CORES FIXAS ---
  // Cria um mapa garantindo que a mesma categoria sempre receba a mesma cor
  const categoryColorMap = useMemo(() => {
    const parentNames = Array.from(
      new Set(categories.filter(c => !c.parent_id).map(c => c.name))
    ).sort()
    
    const map = {}
    parentNames.forEach((name, index) => {
      map[name] = COLORS[index % COLORS.length]
    })
    map['Sem categoria'] = '#475569' // Cor fixa (cinza escuro) para lançamentos órfãos
    return map
  }, [categories])

  const chartData = useMemo(() => {
    const expensesByCategory = transactions.filter(t => t.type === 'expense' || !t.type).reduce((acc, expense) => {
      const parentName = getParentCategoryName(expense.category_id)
      acc[parentName] = (acc[parentName] || 0) + Number(expense.amount)
      return acc
    }, {})
    return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories])

  const filteredTransactions = transactions.filter(t => {
    const search = searchTerm.toLowerCase()
    
    let matchCategory = true
    if (filterCategory) {
      const tCat = categories.find(c => c.id === t.category_id)
      matchCategory = String(t.category_id) === String(filterCategory) || (tCat && String(tCat.parent_id) === String(filterCategory))
    }

    const tCatName = categories.find(c => c.id === t.category_id)?.name || ''
    const matchSearch = searchTerm ? t.description?.toLowerCase().includes(search) || tCatName.toLowerCase().includes(search) : true
    
    return matchCategory && matchSearch
  })

  const visibleTransactions = filteredTransactions.slice(0, visibleCount)

  const parentCategories = categories.filter(c => !c.parent_id && c.type === transactionType)

  return (
    <div className="relative min-h-screen w-full bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-cyan-500/30">
      <div className="mx-auto w-full max-w-lg md:max-w-5xl px-4 pt-6 pb-28 md:pb-12">
        
        {/* HEADER */}
        <header className="flex w-full items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400"><Wallet size={20} /></div>
            <h1 className="text-xl font-bold leading-none tracking-tight">Nexo</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"><Settings size={20} /></button>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-xl hover:bg-white/5"><LogOut size={20} /></button>
          </div>
        </header>

        {/* SUMMARY SECTION */}
        <section className="relative w-full overflow-visible rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-white/5 p-6 shadow-2xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Resumo do Mês</h2>
            
            <div className="relative flex items-center gap-1 rounded-full bg-black/20 px-1 py-1">
              <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"><ChevronLeft size={16} /></button>
              <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="text-xs font-bold uppercase tracking-widest text-white w-24 text-center hover:text-cyan-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5">
                {MONTHS_SHORT[currentDate.getMonth()]} {currentDate.getFullYear()}
              </button>
              <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"><ChevronRight size={16} /></button>
              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute right-0 top-[120%] z-50 w-64 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                    <div className="mb-4 flex items-center justify-between">
                      <button onClick={() => setPickerYear(y => y - 1)} className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft size={18} /></button>
                      <span className="font-bold text-white text-base">{pickerYear}</span>
                      <button onClick={() => setPickerYear(y => y + 1)} className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {MONTHS_SHORT.map((monthStr, index) => (
                        <button
                          key={monthStr}
                          onClick={() => { setCurrentDate(new Date(pickerYear, index, 1)); setShowMonthPicker(false) }}
                          className={`rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          {monthStr}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex w-full gap-3">
            <StatCard title="Receitas" amount={totalIncome} colorClass="bg-emerald-500/10" borderColor="border-emerald-500/10" textColor="text-emerald-400" />
            <StatCard title="Despesas" amount={totalExpense} colorClass="bg-rose-500/10" borderColor="border-rose-500/10" textColor="text-rose-400" />
            <StatCard title="Restante (Mês)" amount={monthlyRemaining} colorClass="bg-cyan-500/10" borderColor="border-cyan-500/10" textColor="text-cyan-400" />
          </div>
        </section>

        <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* CHART SECTION */}
          {chartData.length > 0 && (
            <section className="w-full h-fit rounded-3xl bg-slate-900/50 border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-6">Despesas Macro</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                        const RADIAN = Math.PI / 180; const radius = outerRadius + 15
                        const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN)
                        return (
                          <text x={x} y={y} fill="#cbd5e1" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="500">
                            <tspan x={x} dy="-0.5em">{name}</tspan><tspan x={x} dy="1.2em">{formatCurrency(value)}</tspan>
                          </text>
                        );
                      }}>
                      {/* Cor atualizada para usar o mapeamento fixo */}
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={categoryColorMap[entry.name] || COLORS[i % COLORS.length]} style={{ outline: 'none' }} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* HISTORY SECTION */}
          <section className="w-full flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white">Histórico</h3>
            
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Buscar lançamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/5 bg-slate-900/80 py-4 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
              
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)} 
                className="appearance-none rounded-2xl border border-white/5 bg-slate-900/80 px-4 py-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all sm:w-48 cursor-pointer"
              >
                <option value="">Todas as categorias</option>
                {categories.filter(c => !c.parent_id).map(parent => (
                  <optgroup key={parent.id} label={parent.name} className="bg-slate-900 font-bold text-white">
                    <option value={parent.id}>{parent.name} (Geral)</option>
                    {categories.filter(sub => sub.parent_id === parent.id).map(sub => (
                      <option key={sub.id} value={sub.id} className="text-slate-300 font-normal">
                         ↳ {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex flex-col w-full gap-3 overflow-y-auto max-h-[50vh] md:max-h-[400px] pr-2 custom-scrollbar">
              {visibleTransactions.length > 0 
                ? visibleTransactions.map((t) => <TransactionItem key={t.id} t={t} onEdit={openEditModal} onDelete={handleDelete} getCategoryPath={getCategoryPath} />)
                : <div className="py-8 text-center text-sm text-slate-500">Nenhuma movimentação.</div>}
              
              {visibleCount < filteredTransactions.length && (
                <button 
                  onClick={() => setVisibleCount(prev => prev + 15)}
                  className="w-full py-4 mt-1 text-sm font-semibold text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 rounded-2xl transition-all"
                >
                  Carregar mais lançamentos...
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* FAB BTN */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 transition-transform active:scale-90 md:bottom-10 md:right-10"><Plus size={28} /></button>

      {/* TRANSACTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full md:max-w-md bg-slate-900 p-6 md:rounded-3xl rounded-t-3xl shadow-2xl transition-transform animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-slate-700 md:hidden" />
            <h2 className="text-xl font-bold text-white mb-6">{transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
            <form onSubmit={handleAddTransaction} noValidate className="flex flex-col gap-5 w-full">
              <div className="flex w-full rounded-xl bg-slate-950 p-1">
                <button type="button" onClick={() => { setTransactionType('expense'); setIsRecurring(false); setCategoryId(''); setFormErrors({}); resetCategoryForm() }} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${transactionType === 'expense' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Despesa</button>
                <button type="button" onClick={() => { setTransactionType('income'); setIsRecurring(true); setCategoryId(''); setFormErrors({}); resetCategoryForm() }} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${transactionType === 'income' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Receita</button>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <div className="relative w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">R$</span>
                  <input type="number" step="any" value={amount} onChange={(e) => { setAmount(e.target.value); setFormErrors(prev => ({ ...prev, amount: null })) }} placeholder="0,00" className={`w-full appearance-none rounded-2xl bg-slate-950 py-5 pl-12 pr-4 text-2xl font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500/50 ${formErrors.amount ? 'border border-rose-500' : ''}`} />
                </div>
                {formErrors.amount && <span className="text-xs font-medium text-rose-500">{formErrors.amount}</span>}
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</label>
                  {!isAddingCategory && categoryId && <button type="button" onClick={() => setCategoryToDelete(categories.find(c => c.id === categoryId))} className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors">Excluir</button>}
                </div>
                
                {isAddingCategory ? (
                  <div className="flex flex-col gap-3 w-full bg-slate-950/50 p-4 rounded-xl border border-white/5 animate-in fade-in zoom-in-95">
                    <input type="text" value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError('') }} autoFocus placeholder="Nome da categoria" className="w-full appearance-none rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500" />
                    
                    <select value={newCategoryParentId} onChange={(e) => setNewCategoryParentId(e.target.value)} className="w-full appearance-none rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500">
                      <option value="">↳ Categoria Principal (Sem pai)</option>
                      {parentCategories.map(p => (
                        <option key={p.id} value={p.id}>Subcategoria de: {p.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2 w-full mt-1">
                      <button type="button" onClick={handleAddCategory} className="flex-1 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white hover:bg-cyan-400 transition-colors">Salvar Categoria</button>
                      <button type="button" onClick={resetCategoryForm} className="rounded-xl bg-slate-800 px-4 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><X size={18} /></button>
                    </div>
                    {categoryError && <span className="text-xs font-medium text-rose-500">{categoryError}</span>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex gap-2 w-full">
                      <select 
                        value={categoryId} 
                        onChange={(e) => { setCategoryId(e.target.value); setFormErrors(prev => ({ ...prev, categoryId: null })) }} 
                        className={`flex-1 appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500 ${formErrors.categoryId ? 'border border-rose-500' : ''}`}
                      >
                        <option value="" disabled>Selecione...</option>
                        
                        {parentCategories.map(parent => (
                          <optgroup key={parent.id} label={parent.name} className="bg-slate-900 font-bold text-white">
                            <option value={parent.id} className="text-white font-semibold">{parent.name} (Geral)</option>
                            {categories.filter(sub => sub.parent_id === parent.id && sub.type === transactionType).map(sub => (
                              <option key={sub.id} value={sub.id} className="text-slate-300 font-normal">
                                ↳ {sub.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      <div className="relative group shrink-0">
                        <button 
                          type="button" 
                          onClick={() => setIsAddingCategory(true)} 
                          className="flex items-center justify-center h-full aspect-square w-12 rounded-xl bg-slate-950 border border-transparent text-cyan-400 hover:bg-slate-900 hover:text-cyan-300 hover:border-white/5 transition-all outline-none"
                        >
                          <Plus size={20} />
                        </button>
                        
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity w-max bg-slate-800 text-xs font-medium text-white px-3 py-2 rounded-lg shadow-xl border border-white/10 z-50">
                          Criar nova categoria
                        </div>
                      </div>
                    </div>
                    {formErrors.categoryId && <span className="text-xs font-medium text-rose-500">{formErrors.categoryId}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data / Frequência</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => { setIsRecurring(e.target.checked); setFormErrors(prev => ({ ...prev, date: null })) }} className="h-4 w-4 rounded accent-cyan-500" />
                    <span className="text-xs text-slate-400">Recorrente</span>
                  </label>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  {isRecurring ? <input type="number" min="1" max="31" value={recurringDay} onChange={(e) => { setRecurringDay(e.target.value); setFormErrors(prev => ({ ...prev, date: null })) }} placeholder="Dia do vencimento" className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none ${formErrors.date ? 'border border-rose-500' : ''}`} /> : <input type="date" value={expenseDate} onChange={(e) => { setExpenseDate(e.target.value); setFormErrors(prev => ({ ...prev, date: null })) }} style={{ colorScheme: 'dark' }} className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none ${formErrors.date ? 'border border-rose-500' : ''}`} />}
                  {formErrors.date && <span className="text-xs font-medium text-rose-500">{formErrors.date}</span>}
                </div>
              </div>
              <button type="submit" disabled={isSaving || isAddingCategory} className="mt-4 w-full rounded-2xl bg-cyan-500 py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50">
                {isSaving ? 'Salvando...' : (transactionToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeSettings} />
          <div className="relative w-full md:max-w-lg bg-slate-900 p-6 md:rounded-3xl rounded-t-3xl shadow-2xl transition-transform animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Configurações</h2>
              <button onClick={closeSettings} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={16} /> Perfil</h3>
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-4">
                  <div><p className="text-xs text-slate-400 mb-1">E-mail conectado</p><p className="text-sm font-medium text-white">{session?.user?.email || 'Usuário'}</p></div>
                  <div className="h-px w-full bg-white/5" />
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Senha</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white tracking-[0.2em] mt-1">••••••••</p>
                      <button onClick={() => setIsChangingPassword(!isChangingPassword)} className={`text-xs font-bold transition-colors ${isChangingPassword ? 'text-slate-400 hover:text-slate-300' : 'text-cyan-400 hover:text-cyan-300'}`}>{isChangingPassword ? 'Cancelar' : 'Alterar senha'}</button>
                    </div>
                  </div>
                  {isChangingPassword && (
                    <form onSubmit={handleUpdatePassword} noValidate className="mt-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                      <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess('') }} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none border border-white/5" placeholder="Nova senha" />
                      <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess('') }} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none border border-white/5" placeholder="Confirmar nova senha" />
                      {passwordError && <span className="text-xs font-medium text-rose-500 px-1">{passwordError}</span>}
                      {passwordSuccess && <span className="text-xs font-medium text-emerald-500 px-1">{passwordSuccess}</span>}
                      <button type="submit" disabled={isUpdatingPassword} className="mt-1 w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-white transition-colors">{isUpdatingPassword ? 'Atualizando...' : 'Salvar nova senha'}</button>
                    </form>
                  )}
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Download size={16} /> Dados</h3>
                <button onClick={handleExportCSV} className="w-full flex items-center justify-between bg-slate-950/50 hover:bg-slate-800 rounded-2xl p-4 border border-white/5 transition-colors group">
                  <div className="flex flex-col items-start"><span className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Exportar Lançamentos</span><span className="text-xs text-slate-400">Baixar histórico deste mês em .csv</span></div>
                  <Download size={18} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* AUX MODALS */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setCategoryToDelete(null)} />
          <div className="relative w-full mx-4 max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="mb-2 text-xl font-bold text-white">Excluir categoria</h3>
            <p className="mb-6 text-sm text-slate-300">Tem certeza que deseja excluir <span className="font-bold text-white">"{categoryToDelete.name}"</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setCategoryToDelete(null)} className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white">Cancelar</button>
              <button onClick={executeDeleteCategory} disabled={isSaving} className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white">{isSaving ? 'Aguarde...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setErrorMessage('')} />
          <div className="relative w-full mx-4 max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl border border-rose-500/20 animate-in zoom-in-95">
            <h3 className="mb-2 text-xl font-bold text-rose-500">Atenção</h3>
            <p className="mb-6 text-sm text-slate-300 leading-relaxed">{errorMessage}</p>
            <button onClick={() => setErrorMessage('')} className="w-full rounded-xl bg-slate-800 py-3 font-semibold text-white">Entendi</button>
          </div>
        </div>
      )}
    </div>
  )
}