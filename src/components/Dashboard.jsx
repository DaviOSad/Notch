import { useEffect, useMemo, useState } from 'react'
import { LogOut, Plus, Settings, Wallet } from 'lucide-react'
import { supabase } from '../supabaseClient'

import { useFinanceData } from '../hooks/useFinanceData'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

import {
  COLORS,
  GOAL_DEPOSIT_CATEGORY,
  GOAL_WITHDRAWAL_CATEGORY,
  MONTHS_SHORT,
  PAGE_SIZE,
  UNCATEGORIZED_COLOR,
  UNCATEGORIZED_LABEL,
  USD_RATE,
} from '../lib/constants'
import { findCategory, getParentCategoryName, getRootCategories, matchesCategoryFilter } from '../lib/categories'
import { buildTransactionsCsv, downloadCsv } from '../lib/csv'
import { todayISO } from '../lib/dates'

import MonthSummary from './dashboard/MonthSummary'
import GoalsCarousel from './dashboard/GoalsCarousel'
import ExpensesChart from './dashboard/ExpensesChart'
import TransactionHistory from './dashboard/TransactionHistory'
import TransactionFormModal from './dashboard/modals/TransactionFormModal'
import FundGoalModal from './dashboard/modals/FundGoalModal'
import SettingsModal from './dashboard/modals/SettingsModal'
import ConfirmDialog from './dashboard/modals/ConfirmDialog'
import ErrorDialog from './dashboard/modals/ErrorDialog'

const isExpense = (t) => t.type === 'expense' || !t.type

export default function Dashboard({ session }) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [fundingGoal, setFundingGoal] = useState(null)
  const [fundType, setFundType] = useState('add')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const {
    transactions,
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
  } = useFinanceData(session, currentDate)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [currentDate, filterCategory, searchTerm])

  useBodyScrollLock(
    Boolean(showModal || showSettings || showMonthPicker || categoryToDelete || goalToDelete || errorMessage || fundingGoal)
  )

  // --- DERIVADOS ---
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions.filter(isExpense).reduce((sum, t) => sum + Number(t.amount), 0)
  const monthlyRemaining = totalIncome - totalExpense

  // Cores fixas por categoria macro, para o gráfico não trocar de cor a cada mês.
  const categoryColorMap = useMemo(() => {
    const parentNames = Array.from(new Set(getRootCategories(categories).map((c) => c.name))).sort()

    const map = {}
    parentNames.forEach((name, index) => { map[name] = COLORS[index % COLORS.length] })
    map[UNCATEGORIZED_LABEL] = UNCATEGORIZED_COLOR
    return map
  }, [categories])

  const chartData = useMemo(() => {
    const expensesByCategory = transactions.filter(isExpense).reduce((acc, expense) => {
      const parentName = getParentCategoryName(categories, expense.category_id)
      acc[parentName] = (acc[parentName] || 0) + Number(expense.amount)
      return acc
    }, {})
    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories])

  const filteredTransactions = transactions.filter((t) => {
    if (!matchesCategoryFilter(t, categories, filterCategory)) return false
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    const catName = findCategory(categories, t.category_id)?.name || ''
    return t.description?.toLowerCase().includes(search) || catName.toLowerCase().includes(search)
  })

  const visibleTransactions = filteredTransactions.slice(0, visibleCount)

  // --- AÇÕES ---
  const closeModal = () => {
    setShowModal(false)
    setTransactionToEdit(null)
    setErrorMessage('')
  }

  const openEditModal = (transaction) => {
    setTransactionToEdit(transaction)
    setShowModal(true)
  }

  const handleDeleteTransaction = async (id) => {
    const { error } = await deleteTransaction(id)
    if (error) return setErrorMessage('Erro ao excluir lançamento: ' + error.message)
    fetchTransactions()
  }

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return

    const hasChildren = categories.some((c) => c.parent_id === categoryToDelete.id)
    if (hasChildren) {
      setErrorMessage('Não é possível excluir esta categoria porque ela possui subcategorias vinculadas.')
      setCategoryToDelete(null)
      return
    }

    setIsSaving(true)
    const { error } = await deleteCategory(categoryToDelete.id)
    setIsSaving(false)
    setCategoryToDelete(null)

    if (error) {
      setErrorMessage(error.code === '23503'
        ? 'Não é possível excluir esta categoria pois há lançamentos associados a ela.'
        : 'Erro ao excluir categoria: ' + error.message)
    }
  }

  // Toda movimentação de meta também vira um lançamento, para aparecer no histórico
  // e nos totais do mês. As categorias de manutenção são criadas sob demanda.
  const registerGoalMovement = async ({ goal, amount, type, categoryName, description }) => {
    const category = await ensureCategory(categoryName, type)
    const effectiveAmount = goal.currency === 'USD' ? amount * USD_RATE : amount

    return insertTransaction({
      user_id: session.user.id,
      category_id: category.id,
      amount: effectiveAmount,
      description,
      expense_date: todayISO(),
      type,
      is_recurring: false,
    })
  }

  const executeDeleteGoal = async () => {
    if (!goalToDelete) return
    setIsSaving(true)

    const refundAmount = Number.parseFloat(goalToDelete.current_amount || 0)
    const { error } = await deleteGoal(goalToDelete.id)

    if (error) {
      setIsSaving(false)
      setErrorMessage('Erro ao excluir meta: ' + error.message)
      return
    }

    // Se havia dinheiro na meta, devolve para o Resumo do Mês.
    if (refundAmount > 0) {
      await registerGoalMovement({
        goal: goalToDelete,
        amount: refundAmount,
        type: 'income',
        categoryName: GOAL_WITHDRAWAL_CATEGORY,
        description: `Resgate Automático: ${goalToDelete.name} (Excluída)`,
      })
      await fetchTransactions()
      await fetchCategories()
    }

    setIsSaving(false)
    setGoalToDelete(null)
  }

  const handleFundGoal = async (amountValue) => {
    const isDeposit = fundType === 'add'
    const currentAmount = Number.parseFloat(fundingGoal.current_amount || 0)
    const newAmount = isDeposit ? currentAmount + amountValue : currentAmount - amountValue

    setIsSaving(true)

    const { error: goalError } = await updateGoalAmount(fundingGoal.id, newAmount)
    if (goalError) {
      setIsSaving(false)
      return setErrorMessage('Erro ao atualizar o saldo da meta: ' + goalError.message)
    }

    const { error: txError } = await registerGoalMovement({
      goal: fundingGoal,
      amount: amountValue,
      type: isDeposit ? 'expense' : 'income',
      categoryName: isDeposit ? GOAL_DEPOSIT_CATEGORY : GOAL_WITHDRAWAL_CATEGORY,
      description: `${isDeposit ? 'Aporte' : 'Resgate'}: ${fundingGoal.name}`,
    })

    setIsSaving(false)

    if (txError) {
      return setErrorMessage('Meta atualizada, mas houve erro ao gerar o histórico: ' + txError.message)
    }

    setFundingGoal(null)
    await fetchGoals()
    await fetchTransactions()
    await fetchCategories()
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) return
    const filename = `lancamentos_${MONTHS_SHORT[currentDate.getMonth()]}_${currentDate.getFullYear()}.csv`
    downloadCsv(filename, buildTransactionsCsv(transactions, categories))
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-cyan-500/30">
      <div className="mx-auto w-full max-w-lg md:max-w-5xl px-4 pt-6 pb-28 md:pb-12">

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

        <MonthSummary
          currentDate={currentDate}
          onChangeMonth={setCurrentDate}
          isPickerOpen={showMonthPicker}
          onTogglePicker={setShowMonthPicker}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          monthlyRemaining={monthlyRemaining}
        />

        <GoalsCarousel
          goals={goals}
          onManageFunds={(goal, type) => { setFundingGoal(goal); setFundType(type) }}
          onDeleteGoal={setGoalToDelete}
        />

        <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <ExpensesChart data={chartData} colorMap={categoryColorMap} />

          <TransactionHistory
            categories={categories}
            visibleTransactions={visibleTransactions}
            totalCount={filteredTransactions.length}
            visibleCount={visibleCount}
            onLoadMore={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterCategory={filterCategory}
            onFilterChange={setFilterCategory}
            onEdit={openEditModal}
            onDelete={handleDeleteTransaction}
          />
        </div>
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 transition-transform active:scale-90 md:bottom-10 md:right-10"><Plus size={28} /></button>

      {fundingGoal && (
        <FundGoalModal
          goal={fundingGoal}
          fundType={fundType}
          isSaving={isSaving}
          onClose={() => setFundingGoal(null)}
          onSubmit={handleFundGoal}
        />
      )}

      {showModal && (
        <TransactionFormModal
          transactionToEdit={transactionToEdit}
          categories={categories}
          currentDate={currentDate}
          userId={session?.user?.id}
          onClose={closeModal}
          onTransactionSaved={fetchTransactions}
          onGoalSaved={fetchGoals}
          onError={setErrorMessage}
          onRequestDeleteCategory={setCategoryToDelete}
          insertCategory={insertCategory}
          saveTransaction={saveTransaction}
          insertGoal={insertGoal}
        />
      )}

      {showSettings && (
        <SettingsModal
          session={session}
          onClose={() => setShowSettings(false)}
          onExportCSV={handleExportCSV}
        />
      )}

      {categoryToDelete && (
        <ConfirmDialog
          title="Excluir categoria"
          message={<>Tem certeza que deseja excluir <span className="font-bold text-white">"{categoryToDelete.name}"</span>?</>}
          isBusy={isSaving}
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={executeDeleteCategory}
        />
      )}

      {goalToDelete && (
        <ConfirmDialog
          title="Excluir meta"
          message={<>Tem certeza que deseja excluir a meta <span className="font-bold text-white">"{goalToDelete.name}"</span>?</>}
          isBusy={isSaving}
          onCancel={() => setGoalToDelete(null)}
          onConfirm={executeDeleteGoal}
        />
      )}

      {errorMessage && <ErrorDialog message={errorMessage} onClose={() => setErrorMessage('')} />}
    </div>
  )
}
