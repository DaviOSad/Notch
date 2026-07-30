import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getMonthBounds } from '../lib/dates'
import { buildMonthTransactions, computeAccumulatedBalance } from '../lib/recurrence'

const byNameAsc = (a, b) => a.name.localeCompare(b.name)

const defaultCategoriesFor = (userId) => [
  { name: 'Alimentação', user_id: userId, type: 'expense', parent_id: null },
  { name: 'Transporte', user_id: userId, type: 'expense', parent_id: null },
  { name: 'Salário', user_id: userId, type: 'income', parent_id: null },
]

/**
 * Camada de dados do dashboard: concentra as leituras e escritas no Supabase
 * (categorias, lançamentos e metas) para o mês visualizado.
 *
 * Não há cache/invalidação automática — após cada mutação o chamador decide
 * quais `fetch*` reexecutar, como no fluxo original.
 */
export function useFinanceData(session, currentDate) {
  const [transactions, setTransactions] = useState([])
  const [accumulatedBalance, setAccumulatedBalance] = useState(0)
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])

  const userId = session?.user?.id

  // --- LEITURAS ---
  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    if (error) return console.error(error)
    setGoals(data || [])
  }, [])

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true })
    if (error) return console.error(error)

    // Usuário novo: cria as categorias padrão no primeiro carregamento.
    if (!data || data.length === 0) {
      const { data: inserted } = await supabase
        .from('categories')
        .insert(defaultCategoriesFor(userId))
        .select('*')
      setCategories(inserted ?? [])
      return
    }
    setCategories(data)
  }, [userId])

  const fetchTransactions = useCallback(async () => {
    const { endDate } = getMonthBounds(currentDate)
    // `select('*')` de propósito: pedir colunas pelo nome faz a query inteira falhar
    // (e o mês aparecer vazio) se o banco ainda não tiver alguma delas.
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .lte('expense_date', endDate)

    if (error) return console.error(error)
    setTransactions(buildMonthTransactions(data, currentDate))
    setAccumulatedBalance(computeAccumulatedBalance(data, currentDate))
  }, [currentDate])

  useEffect(() => {
    if (userId) {
      fetchCategories()
      fetchTransactions()
      fetchGoals()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, userId])

  // --- CATEGORIAS ---
  const insertCategory = useCallback(async (payload) => {
    const { data, error } = await supabase.from('categories').insert([payload]).select()
    if (error || !data || data.length === 0) return { data: null, error }

    setCategories((prev) => {
      // Defensivo: se o banco devolver um id já presente, evita chaves duplicadas.
      if (prev.some((c) => c.id === data[0].id)) {
        return [...prev, { ...data[0], id: Date.now() }].sort(byNameAsc)
      }
      return [...prev, data[0]].sort(byNameAsc)
    })

    return { data: data[0], error: null }
  }, [])

  const deleteCategory = useCallback(async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id))
    return { error }
  }, [])

  // Busca a categoria de manutenção pelo nome/tipo, criando-a se ainda não existir.
  // Em último caso cai numa categoria qualquer do mesmo tipo para não perder o registro.
  const ensureCategory = useCallback(async (name, type) => {
    let category = categories.find((c) => c.name === name && c.type === type)
    if (category) return category

    const { data } = await supabase.from('categories').insert([{ name, type, user_id: userId }]).select()
    if (data && data.length > 0) category = data[0]

    if (!category) {
      category = categories.find((c) => c.type === type && !c.parent_id) || categories[0]
    }
    return category
  }, [categories, userId])

  // --- LANÇAMENTOS ---
  const insertTransaction = useCallback(async (payload) => {
    const { error } = await supabase.from('expenses').insert([payload])
    return { error }
  }, [])

  const saveTransaction = useCallback(async (payload, editingId) => {
    const { error } = editingId
      ? await supabase.from('expenses').update(payload).eq('id', editingId)
      : await supabase.from('expenses').insert([payload])
    return { error }
  }, [])

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    return { error }
  }, [])

  // --- METAS ---
  const insertGoal = useCallback(async (payload) => {
    const { error } = await supabase.from('goals').insert([payload])
    return { error }
  }, [])

  const updateGoalAmount = useCallback(async (id, currentAmount) => {
    const { error } = await supabase.from('goals').update({ current_amount: currentAmount }).eq('id', id)
    return { error }
  }, [])

  const deleteGoal = useCallback(async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) setGoals((prev) => prev.filter((g) => g.id !== id))
    return { error }
  }, [])

  return {
    transactions,
    accumulatedBalance,
    categories,
    goals,
    fetchTransactions,
    fetchCategories,
    fetchGoals,
    insertCategory,
    deleteCategory,
    ensureCategory,
    insertTransaction,
    saveTransaction,
    deleteTransaction,
    insertGoal,
    updateGoalAmount,
    deleteGoal,
  }
}
