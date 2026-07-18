import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react'

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
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  
  const [fieldErrors, setFieldErrors] = useState({})

  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())

  const [filterCategory, setFilterCategory] = useState('')

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
      fetchExpenses()
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
      const defaultCategories = [
        { name: 'Alimentação', user_id: session.user.id },
        { name: 'Transporte', user_id: session.user.id },
        { name: 'Lazer', user_id: session.user.id },
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
      setCategoryId(insertedCategories?.[0]?.id ?? '')
      return
    }

    setCategories(existingCategories)
    setCategoryId((current) => current || existingCategories[0]?.id || '')
  }

  const fetchExpenses = async () => {
    const { startDate, endDate } = getMonthBounds(currentDate)

    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, description, expense_date, category_id, categories(name)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setExpenses(data ?? [])
  }

  const handleAddCategory = async () => {
    setCategoryError('')
    const trimmedName = newCategoryName.trim()
    
    if (!trimmedName) {
      setCategoryError('Preencha este campo.')
      return
    }

    const categoryExists = categories.some(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (categoryExists) {
      setCategoryError('Esta categoria já existe.')
      return
    }

    setIsSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: trimmedName, user_id: session.user.id }])
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
        setErrorMessage('Não é possível excluir esta categoria pois já existem gastos vinculados a ela. Exclua os gastos primeiro.')
      } else {
        setErrorMessage('Erro ao excluir categoria: ' + error.message)
      }
      return
    }

    const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id)
    setCategories(updatedCategories)
    setCategoryId(updatedCategories.length > 0 ? updatedCategories[0].id : '')
  }

  const closeModal = () => {
    setShowModal(false)
    setAmount('')
    setDescription('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setIsAddingCategory(false)
    setCategoryError('')
    setNewCategoryName('')
    setFieldErrors({})
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()

    const errors = {}
    if (!amount) errors.amount = 'Preencha este campo.'
    if (!isAddingCategory && !categoryId) errors.categoryId = 'Preencha este campo.'
    if (!expenseDate) errors.expenseDate = 'Preencha este campo.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    const parsedAmount = Number.parseFloat(amount)
    if (parsedAmount < 0) {
      setErrorMessage('O valor do gasto não pode ser negativo.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase.from('expenses').insert([
      {
        user_id: session.user.id,
        category_id: categoryId,
        amount: parsedAmount,
        description: description.trim(),
        expense_date: expenseDate,
      },
    ])

    setIsSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    closeModal()
    await fetchExpenses()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    await fetchExpenses()
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

  const expensesByCategory = useMemo(() => {
    return expenses.reduce((accumulator, expense) => {
      const categoryName = expense.categories?.name ?? 'Sem categoria'
      accumulator[categoryName] = (accumulator[categoryName] || 0) + Number(expense.amount)
      return accumulator
    }, {})
  }, [expenses])

  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }))

  const totalMonth = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  )

  const filteredExpenses = useMemo(() => {
    if (!filterCategory) return expenses;
    return expenses.filter(expense => expense.category_id === filterCategory);
  }, [expenses, filterCategory])

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [filteredExpenses]
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

          <div className="mt-2 w-full">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 p-6">
              <p className="text-sm text-slate-300">Total do mês</p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">Novo registro</p>
              <h2 className="text-xl font-bold text-white">Adicionar gasto</h2>
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
            Cadastre um gasto, escolha a categoria e acompanhe a distribuição no gráfico.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-white">Gastos por categoria</h2>
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
              Nenhum gasto neste mês.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Detalhes dos gastos</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {filteredExpenses.length} lançamentos
                </span>
                {filterCategory && (
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                    R$ {totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-cyan-400/60 sm:w-auto"
            >
              <option value="" className="bg-slate-900 text-slate-100">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id} className="bg-slate-900 text-slate-100">
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[285px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <article key={expense.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-semibold text-white">{expense.categories?.name ?? 'Sem categoria'}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {expense.description ? `${expense.description} • ` : ''}{new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">R$ {Number(expense.amount).toFixed(2)}</span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                      aria-label="Excluir gasto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="flex h-[285px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
                Nenhum gasto encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Principal: Novo Gasto (z-50) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <div className="mb-6">
              <p className="text-sm text-slate-400">Lançamento</p>
              <h2 className="text-2xl font-bold text-white">Novo gasto</h2>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4" noValidate>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Valor (R$)</label>
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
                  className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    fieldErrors.amount ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                  }`}
                  placeholder="0.00"
                />
                {fieldErrors.amount && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.amount}</p>}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">Categoria</label>
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
                        placeholder="Nome da categoria..."
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
                      {categories.map((category) => (
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
                  placeholder="Mercado, combustível, cinema..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Data</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value)
                    if (fieldErrors.expenseDate) setFieldErrors((prev) => ({ ...prev, expenseDate: null }))
                  }}
                  className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition ${
                    fieldErrors.expenseDate ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-cyan-400/60'
                  }`}
                />
                {fieldErrors.expenseDate && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.expenseDate}</p>}
              </div>

              <div className="flex gap-3 pt-2">
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