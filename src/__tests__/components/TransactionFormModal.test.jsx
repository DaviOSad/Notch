import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionFormModal from '../../components/dashboard/modals/TransactionFormModal'

const categories = [
  { id: 1, name: 'Alimentação', type: 'expense', parent_id: null },
  { id: 2, name: 'Metas (Aportes)', type: 'expense', parent_id: null },
  { id: 3, name: 'Salário', type: 'income', parent_id: null },
  { id: 4, name: 'Metas (Resgates)', type: 'income', parent_id: null },
]

const renderForm = (props = {}) => {
  const user = userEvent.setup()
  render(
    <TransactionFormModal
      categories={categories}
      currentDate={new Date(2026, 6, 1)}
      userId="u1"
      onClose={vi.fn()}
      onTransactionSaved={vi.fn()}
      onGoalSaved={vi.fn()}
      onError={vi.fn()}
      onRequestDeleteCategory={vi.fn()}
      insertCategory={vi.fn()}
      saveTransaction={vi.fn()}
      insertGoal={vi.fn()}
      {...props}
    />
  )
  return user
}

const optionNames = async (user) => {
  await user.click(screen.getByRole('combobox'))
  return within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
}

describe('TransactionFormModal — categorias de manutenção das metas', () => {
  it('não oferece Metas (Aportes) ao lançar uma despesa', async () => {
    const user = renderForm()
    const names = await optionNames(user)
    expect(names.join()).toContain('Alimentação')
    expect(names.join()).not.toContain('Metas')
  })

  it('não oferece Metas (Resgates) ao lançar uma receita', async () => {
    const user = renderForm()
    await user.click(screen.getByRole('button', { name: 'Receita' }))
    const names = await optionNames(user)
    expect(names.join()).toContain('Salário')
    expect(names.join()).not.toContain('Metas')
  })

  it('não permite criar subcategoria dentro delas', async () => {
    const user = renderForm()
    await user.click(screen.getByTestId('add-category-btn'))

    const parentSelect = screen.getByRole('combobox', { name: 'Categoria pai' })
    expect(within(parentSelect).getByText('Subcategoria de: Alimentação')).toBeInTheDocument()
    expect(within(parentSelect).queryByText(/Metas/)).not.toBeInTheDocument()
  })

  it('mostra a categoria de meta ao editar o lançamento gerado por ela, sem oferecer excluí-la', async () => {
    renderForm({
      transactionToEdit: { id: 9, amount: 100, description: 'Aporte: Viagem', category_id: 2, type: 'expense', expense_date: '2026-07-10', is_recurring: false },
    })

    expect(screen.getByRole('combobox')).toHaveTextContent('Metas (Aportes)')
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('segue oferecendo "Excluir" para categorias do usuário', () => {
    renderForm({
      transactionToEdit: { id: 8, amount: 30, description: '', category_id: 1, type: 'expense', expense_date: '2026-07-10', is_recurring: false },
    })

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })
})
