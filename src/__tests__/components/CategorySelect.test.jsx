import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategorySelect from '../../components/dashboard/CategorySelect'
import { getGroupedRootCategories } from '../../lib/categories'

const categories = [
  { id: 1, name: 'Alimentação', type: 'expense', parent_id: null },
  { id: 2, name: 'Almoço', type: 'expense', parent_id: 1 },
  { id: 3, name: 'Salário', type: 'income', parent_id: null },
  { id: 4, name: 'Metas (Aportes)', type: 'expense', parent_id: null },
]

const open = async (props) => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<CategorySelect categories={categories} onChange={onChange} {...props} />)
  await user.click(screen.getByRole('combobox'))
  return { user, onChange, listbox: screen.getByRole('listbox') }
}

describe('CategorySelect — grupos', () => {
  it('mostra um título por grupo quando a lista mistura Despesas, Receitas e Metas', async () => {
    const { listbox } = await open({ parents: getGroupedRootCategories(categories), emptyLabel: 'Todas as categorias' })

    const headings = within(listbox).getAllByRole('presentation').map((el) => el.textContent)
    expect(headings).toEqual(['Despesas', 'Receitas', 'Metas'])
  })

  it('os títulos não entram na navegação nem contam como opções', async () => {
    const { listbox } = await open({ parents: getGroupedRootCategories(categories), emptyLabel: 'Todas as categorias' })

    // vazio + 3 raízes + 1 subcategoria
    expect(within(listbox).getAllByRole('option')).toHaveLength(5)
  })

  it('a subcategoria fica sob o título do pai, sem repeti-lo', async () => {
    const { listbox } = await open({ parents: getGroupedRootCategories(categories) })

    const labels = [...listbox.querySelectorAll('li')].map((el) => el.textContent)
    expect(labels.slice(0, 3)).toEqual(['Despesas', 'Alimentação', 'Almoço'])
  })

  it('sem mistura (só um grupo) não desenha títulos', async () => {
    const onlyExpenses = categories.filter((c) => c.type === 'expense' && c.name !== 'Metas (Aportes)')
    const { listbox } = await open({ categories: onlyExpenses, parents: getGroupedRootCategories(onlyExpenses) })

    expect(within(listbox).queryAllByRole('presentation')).toHaveLength(0)
  })

  it('continua emitindo o id como string ao escolher uma opção', async () => {
    const { user, onChange, listbox } = await open({ parents: getGroupedRootCategories(categories) })

    await user.click(within(listbox).getByRole('option', { name: /Salário/ }))
    expect(onChange).toHaveBeenCalledWith('3')
  })
})
