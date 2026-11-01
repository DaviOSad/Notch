import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import CategorySelect from '../CategorySelect'
import Field from '../../ui/Field'
import Modal from '../../ui/Modal'
import ConfirmDialog from './ConfirmDialog'
import { findCategory, isSystemCategory, sameId } from '../../../lib/categories'
import { endOfMonthISO, parseTransactionDate, shiftMonth, todayISO } from '../../../lib/dates'
import { blockInvalidChars } from '../../../lib/formatters'
import { countOccurrences } from '../../../lib/recurrence'
import { MONTHS_SHORT } from '../../../lib/constants'

// Atalhos de duração para o caso mais comum: parcelas com número fixo de meses.
const DURATION_SHORTCUTS = [3, 6, 12]

const monthLabel = (year, month) => `${MONTHS_SHORT[month]}/${year}`

// Campo vazio (ou lixo) = sem fim; o teto evita prazos absurdos digitados sem querer.
const clampDuration = (value) => {
  const months = Number.parseInt(value, 10)
  if (!Number.isFinite(months) || months < 1) return null
  return Math.min(months, 600)
}

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
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // As categorias de manutenção das metas não são escolhidas à mão (nem recebem filhas).
  const parentCategories = categories.filter((c) => !c.parent_id && c.type === transactionType && !isSystemCategory(c))

  // Ao editar o lançamento gerado por uma meta, a categoria dele continua visível na lista,
  // mas sem o "Excluir": apagá-la quebraria as próximas movimentações.
  const selectedCategory = categoryId ? findCategory(categories, categoryId) : null
  const selectedIsSystem = Boolean(selectedCategory && isSystemCategory(selectedCategory) && selectedCategory.type === transactionType)
  const pickerParents = selectedIsSystem ? [...parentCategories, selectedCategory] : parentCategories

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

  // Só pergunta se há algo digitado: fechar um formulário intocado não custa um clique.
  // Vale para Escape, fundo e botão X, que passam todos por `requestClose`.
  const isDirty = isGoal
    ? Boolean(goalName || goalTarget || goalDeadline)
    : amount !== (transactionToEdit ? transactionToEdit.amount.toString() : '')
      || description !== (transactionToEdit?.description || '')
      || String(categoryId) !== String(transactionToEdit?.category_id || '')
  const requestClose = () => (isDirty && !isSaving ? setConfirmDiscard(true) : onClose())

  const typeTabs = [
    { type: 'expense', label: 'Despesa' },
    { type: 'income', label: 'Receita' },
    { type: 'goal', label: 'Meta' },
  ]

  const chipClass = (active) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${active ? 'border-petroleo bg-petroleo text-espuma' : 'border-linha bg-white text-neblina hover:text-tinta'}`

  return (
    <>
    <Modal title={isGoal ? 'Criar Nova Meta' : (transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento')} onClose={requestClose}>
      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
        {!transactionToEdit && (
          <div role="group" aria-label="Tipo de lançamento" className="flex w-full rounded-xl bg-pagina p-1">
            {typeTabs.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                aria-pressed={transactionType === type}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${transactionType === type ? 'bg-petroleo text-espuma shadow-sm' : 'text-neblina hover:text-tinta'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isGoal ? (
          <>
            <Field
              label="Nome da Caixinha"
              type="text"
              value={goalName}
              onChange={(e) => { setGoalName(e.target.value); clearFieldError('goalName') }}
              placeholder="Ex: Viagem EUA - Agosto"
              error={formErrors.goalName}
            />
            <div className="flex gap-3">
              <Field
                wrapperClassName="flex-1"
                label="Objetivo"
                type="number" min="0" step="any" onKeyDown={blockInvalidChars}
                value={goalTarget}
                onChange={(e) => { setGoalTarget(e.target.value); clearFieldError('goalTarget') }}
                placeholder="0.00"
                error={formErrors.goalTarget}
              />
              <div className="flex w-28 flex-col gap-1.5">
                <label htmlFor="meta-moeda" className="rotulo">Moeda</label>
                <select id="meta-moeda" value={goalCurrency} onChange={(e) => setGoalCurrency(e.target.value)} className="campo font-semibold">
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <Field label="Data limite (opcional)" type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-neblina">R$</span>
                <input
                  type="number" min="0" step="any" onKeyDown={blockInvalidChars}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); clearFieldError('amount') }}
                  placeholder="0,00"
                  aria-label="Valor"
                  aria-invalid={formErrors.amount ? 'true' : undefined}
                  className="campo !py-4 !pl-12 font-display !text-3xl font-bold"
                />
              </div>
              {formErrors.amount && <span className="texto-erro">{formErrors.amount}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="rotulo">Categoria</span>
                {!isAddingCategory && selectedCategory && !selectedIsSystem && (
                  <button type="button" onClick={() => onRequestDeleteCategory(selectedCategory)} className="text-sm font-semibold text-saida hover:underline">
                    Excluir
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="flex w-full animate-surge flex-col gap-3 rounded-xl bg-pagina p-4">
                  <input type="text" value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError('') }} autoFocus placeholder="Nome da categoria" aria-label="Nome da categoria" className="campo" />
                  <select value={newCategoryParentId} onChange={(e) => setNewCategoryParentId(e.target.value)} aria-label="Categoria pai" className="campo">
                    <option value="">↳ Categoria Principal (Sem pai)</option>
                    {parentCategories.map((p, idx) => <option key={`new-parent-${p.id}-${idx}`} value={p.id}>Subcategoria de: {p.name}</option>)}
                  </select>
                  <div className="flex w-full gap-2">
                    <button type="button" onClick={handleAddCategory} className="btn-primario flex-1">Salvar Categoria</button>
                    <button type="button" onClick={resetCategoryForm} aria-label="Cancelar nova categoria" className="btn-neutro !px-3"><X size={18} /></button>
                  </div>
                  {categoryError && <span className="texto-erro">{categoryError}</span>}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex w-full gap-2">
                    <CategorySelect
                      categories={categories}
                      parents={pickerParents}
                      type={transactionType}
                      value={categoryId}
                      onChange={(id) => { setCategoryId(id); clearFieldError('categoryId') }}
                      placeholder="Selecione..."
                      parentHint="Geral"
                      hasError={Boolean(formErrors.categoryId)}
                      className="min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      data-testid="add-category-btn"
                      onClick={() => setIsAddingCategory(true)}
                      title="Criar nova categoria"
                      aria-label="Criar nova categoria"
                      className="btn-icone h-[46px] w-[46px] shrink-0 border border-linha bg-white text-petroleo hover:bg-pagina"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  {formErrors.categoryId && <span className="texto-erro">{formErrors.categoryId}</span>}
                </div>
              )}
            </div>

            <Field label="Descrição" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />

            <div className="flex flex-col gap-3">
              <Field
                label="Data"
                type="date"
                value={expenseDate}
                onChange={(e) => { setExpenseDate(e.target.value); clearFieldError('date') }}
                error={formErrors.date}
              />

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium">
                <input type="checkbox" checked={isRecurring} onChange={(e) => { setIsRecurring(e.target.checked); clearFieldError('date') }} className="h-4 w-4 rounded accent-petroleo" />
                Recorrente
              </label>

              {isRecurring && dayOfMonth && (
                <span className="text-sm text-neblina">
                  Repete todo dia {dayOfMonth}, a partir de {monthLabel(startYear, startMonth)}.
                </span>
              )}

              {isRecurring && (
                <div className="flex flex-col gap-3 border-l-2 border-linha pl-4">
                  <span className="rotulo">Prazo (opcional)</span>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDurationMonths(null)} aria-pressed={!durationMonths} className={chipClass(!durationMonths)}>
                      Sem fim
                    </button>
                    {DURATION_SHORTCUTS.map((months) => (
                      <button
                        key={`duracao-${months}`}
                        type="button"
                        onClick={() => setDurationMonths(months)}
                        aria-pressed={durationMonths === months}
                        className={chipClass(durationMonths === months)}
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
                      aria-label="Duração em meses"
                      className="campo !pr-20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neblina">meses</span>
                  </div>

                  <span className="text-sm text-neblina">
                    {durationMonths
                      ? `${durationMonths}x — de ${monthLabel(startYear, startMonth)} até ${monthLabel(lastMonth.year, lastMonth.month)}.`
                      : 'Repete todo mês, sem data para acabar.'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        <button type="submit" disabled={isSaving || isAddingCategory} className="btn-destaque mt-1 py-3.5 text-base">
          {isSaving ? 'Salvando...' : (transactionToEdit ? 'Salvar Alterações' : 'Confirmar')}
        </button>
      </form>
    </Modal>

    {confirmDiscard && (
      <ConfirmDialog
        title="Descartar alterações?"
        message="O que você preencheu ainda não foi salvo."
        confirmLabel="Descartar"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onClose}
      />
    )}
    </>
  )
}
