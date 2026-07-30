import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import CategorySelect from '../CategorySelect'
import { findCategory, sameId } from '../../../lib/categories'
import { endOfMonthISO, monthsDiff, parseTransactionDate, shiftMonth, todayISO } from '../../../lib/dates'
import { blockInvalidChars } from '../../../lib/formatters'
import { countOccurrences } from '../../../lib/recurrence'
import { MONTHS_SHORT } from '../../../lib/constants'

// Atalhos de duração para o caso mais comum: parcelas com número fixo de meses.
const DURATION_SHORTCUTS = [3, 6, 12]

const monthLabel = (year, month) => `${MONTHS_SHORT[month]}/${year}`

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
  // Em recorrentes editados a data recebida é a ocorrência projetada no mês visto,
  // então ela já traz o dia certo do vencimento.
  const [expenseDate, setExpenseDate] = useState(transactionToEdit?.expense_date || todayISO())
  // Duração da recorrência em meses; null = sem fim. A data final não é digitada:
  // sai sempre de data inicial + duração (ver `recurrenceEnd` abaixo).
  const [durationMonths, setDurationMonths] = useState(() => {
    if (!transactionToEdit?.recurrence_end_date) return null
    const start = parseTransactionDate(transactionToEdit.expense_date)
    const months = countOccurrences(start.getFullYear(), start.getMonth(), transactionToEdit.recurrence_end_date)
    return months > 0 ? months : null
  })

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

  // A recorrência começa na própria data do lançamento, e o prazo é contado a partir
  // dela — mudar a data inicial move o fim junto, sem nada para ressincronizar.
  // Com a data em branco, o mês visualizado serve de base só para a prévia.
  const startDate = expenseDate ? parseTransactionDate(expenseDate) : currentDate
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth()
  const dayOfMonth = expenseDate ? startDate.getDate() : null

  // Último mês cobrado: a duração inclui o mês inicial (3 meses = mês atual + 2).
  const lastMonth = durationMonths ? shiftMonth(startYear, startMonth, durationMonths - 1) : null
  const recurrenceEnd = lastMonth ? endOfMonthISO(lastMonth.year, lastMonth.month) : ''

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
    if (!expenseDate) errors.date = 'Preencha a data do lançamento.'

    if (Object.keys(errors).length > 0) return setFormErrors(errors)
    setFormErrors({})

    // Recorrente ou não, a data gravada é a escolhida: em recorrentes ela vira o
    // início da série e o dia de vencimento das ocorrências seguintes.
    const finalDate = expenseDate

    setIsSaving(true)
    const { error } = await saveTransaction({
      user_id: userId,
      category_id: categoryId,
      amount: Number.parseFloat(amount),
      description: description.trim(),
      expense_date: finalDate,
      type: transactionType,
      is_recurring: isRecurring,
      recurrence_end_date: isRecurring && recurrenceEnd ? recurrenceEnd : null,
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
                      <CategorySelect
                        categories={categories}
                        parents={parentCategories}
                        type={transactionType}
                        value={categoryId}
                        onChange={(id) => { setCategoryId(id); clearFieldError('categoryId') }}
                        placeholder="Selecione..."
                        parentHint="Geral"
                        hasError={Boolean(formErrors.categoryId)}
                        className="flex-1 min-w-0"
                      />

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
                <input type="date" value={expenseDate} onChange={(e) => { setExpenseDate(e.target.value); clearFieldError('date') }} style={{ colorScheme: 'dark' }} className={`w-full appearance-none rounded-xl bg-slate-950 px-4 py-3.5 text-sm text-white outline-none ${formErrors.date ? 'border border-rose-500' : ''}`} />
                {formErrors.date && <span className="text-xs font-medium text-rose-500">{formErrors.date}</span>}
                {isRecurring && dayOfMonth && (
                  <span className="text-xs text-slate-500">
                    Repete todo dia {dayOfMonth}, a partir de {monthLabel(startYear, startMonth)}.
                  </span>
                )}

                {isRecurring && (
                  <div className="mt-2 flex flex-col gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-4">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prazo (Opcional)</label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDurationMonths(null)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${!durationMonths ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                      >
                        Sem fim
                      </button>
                      {DURATION_SHORTCUTS.map((months) => (
                        <button
                          key={`duracao-${months}`}
                          type="button"
                          onClick={() => setDurationMonths(months)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${durationMonths === months ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                        >
                          {months}x
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full">
                      <input
                        type="number" min="1" max="600" step="1" onKeyDown={blockInvalidChars}
                        value={durationMonths ?? ''}
                        onChange={(e) => setDurationMonths(clampDuration(e.target.value))}
                        placeholder="Sem fim"
                        className="w-full appearance-none rounded-xl bg-slate-900 py-3 pl-4 pr-20 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">meses</span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {durationMonths
                        ? `${durationMonths}x — de ${monthLabel(startYear, startMonth)} até ${monthLabel(lastMonth.year, lastMonth.month)}.`
                        : 'Repete todo mês, sem data para acabar.'}
                    </span>
                  </div>
                )}
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
