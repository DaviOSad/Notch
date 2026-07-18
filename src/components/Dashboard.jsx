import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

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

  const handleAddExpense = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    const { error } = await supabase.from('expenses').insert([
      {
        user_id: session.user.id,
        category_id: categoryId,
        amount: Number.parseFloat(amount),
        description,
        expense_date: expenseDate,
      },
    ])

    setIsSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setShowModal(false)
    setAmount('')
    setDescription('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    await fetchExpenses()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      alert(error.message)
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
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
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Período</p>
              <h2 className="text-lg font-semibold text-white">Controle mensal</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[220px] text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={goToNextMonth}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 p-5">
              <p className="text-sm text-slate-300">Total do mês</p>
              <p className="mt-2 text-3xl font-bold text-white">
                R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5">
              <p className="text-sm text-slate-300">Categorias</p>
              <p className="mt-2 text-3xl font-bold text-white">{categories.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Novo registro</p>
              <h2 className="text-lg font-semibold text-white">Adicionar gasto</h2>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Plus size={18} />
              Novo
            </button>
          </div>
          <p className="text-sm leading-6 text-slate-400">
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
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={68} outerRadius={108} paddingAngle={4} dataKey="value">
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Detalhes dos gastos</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {expenses.length} lançamentos
            </span>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <article key={expense.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-semibold text-white">{expense.categories?.name ?? 'Sem categoria'}</p>
                    <p className="text-sm text-slate-400">
                      {expense.description} • {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
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
              <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-400">
                Nenhum gasto encontrado para este mês.
              </div>
            )}
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <div className="mb-6">
              <p className="text-sm text-slate-400">Lançamento</p>
              <h2 className="text-2xl font-bold text-white">Novo gasto</h2>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Categoria</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                >
                  <option value="">Selecione...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Descrição</label>
                <input
                  type="text"
                  required
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
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
