import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import CategoryOptionGroups from '../CategoryOptionGroups'
import { findCategory, sameId } from '../../../lib/categories'
import { buildISODate, todayISO } from '../../../lib/dates'
import { blockInvalidChars } from '../../../lib/formatters'

// Modal multiuso: cria/edita despesa, receita e meta, alternando pelo `transactionType`.
// O estado do formulário vive aqui e é descartado ao fechar (o modal desmonta).
export default function TransactionFormModal({
  transactionToEdit,
  categories,
  currentDate,
  userId,
  onClose,
  onTransactionSaved,
  onGoalSaved,
  onError,
  onRequestDeleteCategory,
  insertCategory,
  saveTransaction,
  insertGoal,
}) {
  const [transactionType, setTransactionType] = useState(transactionToEdit?.type || 'expense')
  const [amount, setAmount] = useState(transactionToEdit ? transactionToEdit.amount.toString() : '')
  const [description, setDescription] = useState(transactionToEdit?.description || '')
  const [categoryId, setCategoryId] = useState(transactionToEdit?.category_id || '')
  const [isRecurring, setIsRecurring] = useState(transactionToEdit?.is_recurring || false)
  const [expenseDate, setExpenseDate] = useState(() =>
    transactionToEdit && !transactionToEdit.is_recurring ? transactionToEdit.expense_date : todayISO()
  )
  const [recurringDay, setRecurringDay] = useState(() =>
    transactionToEdit?.is_recurring
      ? Number.parseInt(transactionToEdit.expense_date.split('-')[2], 10)
      : new Date().getDate()
  )

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalCurrency, setGoalCurrency] = useState('BRL')
  const [goalDeadline, setGoalDeadline] = useState('')

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const parentCategories = categories.filter((c) => !c.parent_id && c.type === transactionType)

  // Se a categoria selecionada foi excluída no diálogo de confirmação, limpa a seleção.
  useEffect(() => {
    if (categoryId && !categories.some((c) => sameId(c.id, categoryId))) setCategoryId('')
  }, [categories, categoryId])

  const clearFieldError = (field) => setFormErrors((prev) => ({ ...prev, [field]: null }))

  const resetCategoryForm = () => {
    setIsAddingCategory(false)
    setNewCategoryName('')
    setNewCategoryParentId('')
    setCategoryError('')
    clearFieldError('categoryId')
  }

  const switchType = (type) => {
    setTransactionType(type)
    setFormErrors({})
    resetCategoryForm()
  }

  const handleAddCategory = async () => {
    setCategoryError('')
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return setCategoryError('Preencha o nome da categoria.')

    const isDuplicate = categories.some((cat) =>
      cat.name.toLowerCase() === trimmedName.toLowerCase() &&
      (cat.type || 'expense') === transactionType &&
      sameId(cat.parent_id, newCategoryParentId || null)
    )
    if (isDuplicate) return setCategoryError('Esta categoria já existe neste nível.')

    setIsSaving(true)
    const { data, error } = await insertCategory({
      name: trimmedName,
      user_id: userId,
      type: transactionType,
      parent_id: newCategoryParentId || null,
    })
    setIsSaving(false)

    if (error) return setCategoryError(error.message)
    if (!data) return

    setCategoryId(data.id)
    resetCategoryForm()
  }

  const submitGoal = async () => {
    const errors = {}
    if (!goalName.trim()) errors.goalName = 'Preencha o nome da meta.'
    if (!goalTarget || Number(goalTarget) <= 0) errors.goalTarget = 'Preencha um objetivo maior que zero.'

    if (Object.keys(errors).length > 0) return setFormErrors(errors)
    setFormErrors({})

    setIsSaving(true)
    const { error } = await insertGoal({
      user_id: userId,
      name: goalName.trim(),
      target_amount: Number.parseFloat(goalTarget),
      currency: goalCurrency,
      deadline: goalDeadline || null,
    })
    setIsSaving(false)

    if (error) return onError('Erro ao criar a meta: ' + error.message)

    onClose()
    onGoalSaved()
  }

  const submitTransaction = async () => {
    const errors = {}
    if (!amount || Number(amount) <= 0) errors.amount = 'Preencha um valor maior que zero.'
    if (!isAddingCategory && !categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (isRecurring && (!recurringDay || recurringDay < 1 || recurringDay > 31)) errors.date = 'Preencha um dia válido (1 a 31).'
    else if (!isRecurring && !expenseDate) errors.date = 'Preencha a data do lançamento.'

    if (Object.keys(errors).length > 0) return setFormErrors(errors)
    setFormErrors({})

    // Recorrentes são ancorados no mês visualizado, guardando só o dia do vencimento.
    const finalDate = isRecurring
      ? buildISODate(currentDate.getFullYear(), currentDate.getMonth(), recurringDay)
      : expenseDate

    setIsSaving(true)
    const { error } = await saveTransaction({
      user_id: userId,
      category_id: categoryId,
      amount: Number.parseFloat(amount),
      description: description.trim(),
      expense_date: finalDate,
      type: transactionType,
      is_recurring: isRecurring,
    }, transactionToEdit?.id)
    setIsSaving(false)

    if (error) return onError('Erro ao salvar lançamento: ' + error.message)

    onClose()
    onTransactionSaved()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    return transactionType === 'goal' ? submitGoal() : submitTransaction()
  }

  const isGoal = transactionType === 'goal'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-slate-900 p-6 md:rounded-3xl rounded-t-3xl shadow-2xl transition-transform animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-slate-700 md:hidden" />
        <h2 className="text-xl font-bold text-white mb-6">
          {isGoal ? 'Criar Nova Meta' : (transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento')}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
          {!transactionToEdit && (
            <div className="flex w-full rounded-xl bg-slate-950 p-1 mb-2">
              <button type="button" onClick={() => switchType('expense')} className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${transactionType === 'expense' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Despesa</button>
              <button type="button" onClick={() => switchType('income')} className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${transactionType === 'income' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Receita</button>
              <button type="button" onClick={() => switchType('goal')} className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${isGoal ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-500'}`}>Meta</button>
            </div>
          )}

          {isGoal ? (
            <>
              <div className="flex flex-col gap-2 w-full">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome da Caixinha</label>
                <input type="text" value={goalName} onChange={(e) => { setGoalName(e.target.value); clearFieldError('goalName') }} placeholder="Ex: Viagem EUA - Agosto" className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.goalName ? 'border border-rose-500' : ''}`} />
                {formErrors.goalName && <span className="text-xs font-medium text-rose-500">{formErrors.goalName}</span>}
              </div>
              <div className="flex gap-3 w-full">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objetivo</label>
                  <input
                    type="number" min="0" step="any" onKeyDown={blockInvalidChars}
                    value={goalTarget}
                    onChange={(e) => { setGoalTarget(e.target.value); clearFieldError('goalTarget') }}
                    placeholder="0.00"
                    className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.goalTarget ? 'border border-rose-500' : ''}`}
                  />
                  {formErrors.goalTarget && <span className="text-xs font-medium text-rose-500">{formErrors.goalTarget}</span>}
                </div>
                <div className="w-28 flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Moeda</label>
                  <select value={goalCurrency} onChange={(e) => setGoalCurrency(e.target.value)} className="w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Limite (Opcional)</label>
                <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1 w-full">
                <div className="relative w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">R$</span>
                  <input
                    type="number" min="0" step="any" onKeyDown={blockInvalidChars}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); clearFieldError('amount') }}
                    placeholder="0,00"
                    className={`w-full appearance-none rounded-2xl bg-slate-950 py-5 pl-12 pr-4 text-2xl font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500/50 ${formErrors.amount ? 'border border-rose-500' : ''}`}
                  />
                </div>
                {formErrors.amount && <span className="text-xs font-medium text-rose-500">{formErrors.amount}</span>}
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</label>
                  {!isAddingCategory && categoryId && (
                    <button type="button" onClick={() => onRequestDeleteCategory(findCategory(categories, categoryId))} className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>

                {isAddingCategory ? (
                  <div className="flex flex-col gap-3 w-full bg-slate-950/50 p-4 rounded-xl border border-white/5 animate-in fade-in zoom-in-95 mt-1">
                    <input type="text" value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError('') }} autoFocus placeholder="Nome da categoria" className="w-full appearance-none rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500" />
                    <select value={newCategoryParentId} onChange={(e) => setNewCategoryParentId(e.target.value)} className="w-full appearance-none rounded-xl bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500">
                      <option value="">↳ Categoria Principal (Sem pai)</option>
                      {parentCategories.map((p, idx) => <option key={`new-parent-${p.id}-${idx}`} value={p.id}>Subcategoria de: {p.name}</option>)}
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
                      <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); clearFieldError('categoryId') }} className={`flex-1 appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500 ${formErrors.categoryId ? 'border border-rose-500' : ''}`}>
                        <option value="" disabled>Selecione...</option>
                        <CategoryOptionGroups
                          categories={categories}
                          parents={parentCategories}
                          type={transactionType}
                          keyPrefix="opt"
                          mainOptionClassName="text-white font-semibold"
                        />
                      </select>

                      <div className="relative group shrink-0">
                        <button
                          type="button"
                          data-testid="add-category-btn"
                          onClick={() => setIsAddingCategory(true)}
                          className="flex items-center justify-center w-[52px] h-[52px] rounded-xl bg-slate-950 border border-transparent text-cyan-400 hover:bg-slate-900 hover:text-cyan-300 hover:border-white/5 transition-all outline-none"
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

              <div className="flex flex-col gap-2 w-full mt-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500" />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data / Frequência</label>
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input type="checkbox" checked={isRecurring} onChange={(e) => { setIsRecurring(e.target.checked); clearFieldError('date') }} className="h-4 w-4 rounded accent-cyan-500" />
                  <span className="text-xs text-slate-400">Recorrente</span>
                </label>
                {isRecurring
                  ? <input type="number" min="1" max="31" value={recurringDay} onChange={(e) => { setRecurringDay(e.target.value); clearFieldError('date') }} placeholder="Dia do vencimento" className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none ${formErrors.date ? 'border border-rose-500' : ''}`} />
                  : <input type="date" value={expenseDate} onChange={(e) => { setExpenseDate(e.target.value); clearFieldError('date') }} style={{ colorScheme: 'dark' }} className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none ${formErrors.date ? 'border border-rose-500' : ''}`} />}
                {formErrors.date && <span className="text-xs font-medium text-rose-500">{formErrors.date}</span>}
              </div>
            </>
          )}

          <button type="submit" disabled={isSaving || isAddingCategory} className={`mt-4 w-full rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${isGoal ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-cyan-500 hover:bg-cyan-400'}`}>
            {isSaving ? 'Salvando...' : (transactionToEdit ? 'Salvar Alterações' : 'Confirmar')}
          </button>
        </form>
      </div>
    </div>
  )
}
