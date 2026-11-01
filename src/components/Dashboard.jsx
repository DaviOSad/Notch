import { useEffect, useMemo, useState } from 'react'
import { LogOut, Plus, Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'

import { useFinanceData } from '../hooks/useFinanceData'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

import {
  GOAL_DEPOSIT_CATEGORY,
  GOAL_WITHDRAWAL_CATEGORY,
  MONTHS_SHORT,
  PAGE_SIZE,
  USD_RATE,
} from '../lib/constants'
import { findCategory, matchesCategoryFilter } from '../lib/categories'
import { buildCategoryColorMap, matchesTypeFilter, spendByCategory, summarizeMonth } from '../lib/summary'
import { buildTransactionsCsv, downloadCsv } from '../lib/csv'
import { todayISO } from '../lib/dates'
import { formatCurrency } from '../lib/formatters'

import Logo from './ui/Logo'
import MonthSummary from './dashboard/MonthSummary'
import GoalsCarousel from './dashboard/GoalsCarousel'
import TransactionHistory from './dashboard/TransactionHistory'
import TransactionFormModal from './dashboard/modals/TransactionFormModal'
import TransactionDetailsModal from './dashboard/modals/TransactionDetailsModal'
import FundGoalModal from './dashboard/modals/FundGoalModal'
import SettingsModal from './dashboard/modals/SettingsModal'
import ConfirmDialog from './dashboard/modals/ConfirmDialog'
import ErrorDialog from './dashboard/modals/ErrorDialog'

export default function Dashboard({ session }) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('') // '' | 'income' | 'expense' | 'goals'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState(null)
  const [transactionDetails, setTransactionDetails] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [fundingGoal, setFundingGoal] = useState(null)
  const [fundType, setFundType] = useState('add')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const {
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
  } = useFinanceData(session, currentDate)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [currentDate, filterCategory, filterType, searchTerm])

  useBodyScrollLock(
    Boolean(showModal || showSettings || showMonthPicker || categoryToDelete || goalToDelete || errorMessage || fundingGoal || transactionDetails)
  )

  // --- DERIVADOS ---
  const { income: totalIncome, expense: totalExpense, goals: totalGoals, remaining: monthlyRemaining } = useMemo(
    () => summarizeMonth(transactions, categories),
    [transactions, categories]
  )
  const categoryColorMap = useMemo(() => buildCategoryColorMap(categories), [categories])
  const spend = useMemo(() => spendByCategory(transactions, categories), [transactions, categories])

  const filteredTransactions = transactions.filter((t) => {
    if (!matchesTypeFilter(t, filterType, categories)) return false
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

  // "Editar" dentro dos detalhes: troca a ficha de leitura pelo formulário.
  const editFromDetails = () => {
    const transaction = transactionDetails
    setTransactionDetails(null)
    openEditModal(transaction)
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
      const { error: refundError } = await registerGoalMovement({
        goal: goalToDelete,
        amount: refundAmount,
        type: 'income',
        categoryName: GOAL_WITHDRAWAL_CATEGORY,
        description: `Resgate Automático: ${goalToDelete.name} (Excluída)`,
      })
      if (refundError) {
        setErrorMessage(`Erro ao registrar o resgate de ${formatCurrency(refundAmount)} da meta excluída: ${refundError.message}. Lance esse valor como receita manualmente.`)
      }
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-pagina font-sans text-tinta">
      <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-5 md:max-w-6xl md:px-8 md:pb-12">

        <header className="mb-5 flex w-full items-center justify-between">
          <Logo as="h1" className="text-3xl" />
          <div className="-mr-2 flex items-center">
            <button onClick={() => setShowSettings(true)} aria-label="Configurações" title="Configurações" className="btn-icone text-neblina hover:bg-folha hover:text-tinta"><Settings size={21} /></button>
            <button onClick={() => supabase.auth.signOut()} aria-label="Sair" title="Sair" className="btn-icone text-neblina hover:bg-folha hover:text-saida"><LogOut size={21} /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10 md:items-start">
          <div className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-6">
            <MonthSummary
              currentDate={currentDate}
              onChangeMonth={setCurrentDate}
              isPickerOpen={showMonthPicker}
              onTogglePicker={setShowMonthPicker}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              totalGoals={totalGoals}
              showGoals={goals.length > 0 || totalGoals !== 0}
              monthlyRemaining={monthlyRemaining}
              accumulatedBalance={accumulatedBalance}
              spend={spend}
              colorMap={categoryColorMap}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
            />

            <GoalsCarousel
              goals={goals}
              onManageFunds={(goal, type) => { setFundingGoal(goal); setFundType(type) }}
              onDeleteGoal={setGoalToDelete}
            />
          </div>

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
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            onSelect={setTransactionDetails}
            onEdit={openEditModal}
            onDelete={handleDeleteTransaction}
          />
        </div>
      </div>

      <button
        onClick={() => setShowModal(true)}
        aria-label="Novo lançamento"
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center justify-center gap-2 rounded-full bg-caju px-[1.125rem] text-petroleo shadow-xl shadow-petroleo/30 transition-all hover:bg-caju-escuro active:scale-95 md:bottom-10 md:right-10 md:px-6"
      >
        <Plus size={26} />
        <span className="hidden font-semibold md:inline">Novo lançamento</span>
      </button>

      {transactionDetails && (
        <TransactionDetailsModal
          transaction={transactionDetails}
          categories={categories}
          onClose={() => setTransactionDetails(null)}
          onEdit={editFromDetails}
        />
      )}

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
          message={<>Tem certeza que deseja excluir <span className="font-bold text-tinta">"{categoryToDelete.name}"</span>?</>}
          isBusy={isSaving}
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={executeDeleteCategory}
        />
      )}

      {goalToDelete && (
        <ConfirmDialog
          title="Excluir meta"
          message={<>Tem certeza que deseja excluir a meta <span className="font-bold text-tinta">"{goalToDelete.name}"</span>?</>}
          isBusy={isSaving}
          onCancel={() => setGoalToDelete(null)}
          onConfirm={executeDeleteGoal}
        />
      )}

      {errorMessage && <ErrorDialog message={errorMessage} onClose={() => setErrorMessage('')} />}
    </div>
  )
}
