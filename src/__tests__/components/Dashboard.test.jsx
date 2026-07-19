import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../components/Dashboard'
import { vi } from 'vitest'

const mockUpdate = vi.fn(function() { return this })
const mockInsert = vi.fn(function() { return this })
const mockDelete = vi.fn(function() { return this })
const mockEq = vi.fn(function() { return this })

const dummyTransactions = Array.from({ length: 14 }).map((_, i) => ({
  id: 101 + i, amount: 10, description: `Dummy ${i}`, expense_date: '2026-07-01',
  category_id: 1, categories: { name: 'Alimentação' }, type: 'expense', is_recurring: false
}))

const createChainableMock = (table) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    then: (resolve) => {
      if (table === 'categories') {
        resolve({ 
          data: [
            { id: 1, name: 'Alimentação', type: 'expense', parent_id: null },
            { id: 2, name: 'Transporte', type: 'expense', parent_id: null },
            { id: 3, name: 'Serviços', type: 'expense', parent_id: null }
          ], 
          error: null 
        })
      } else if (table === 'expenses') {
        resolve({ 
          data: [
            { id: 99, amount: 150.50, description: 'Conta de Luz', expense_date: '2026-07-15', category_id: 1, type: 'expense', is_recurring: false },
            { id: 100, amount: 50.00, description: 'Uber', expense_date: '2026-07-16', category_id: 2, type: 'expense', is_recurring: false },
            { id: 500, amount: 120.00, description: 'Internet Recorrente', expense_date: '2025-01-05', category_id: 3, type: 'expense', is_recurring: true },
            ...dummyTransactions
          ], 
          error: null 
        })
      } else if (table === 'goals') {
        resolve({
          data: [
            { id: 1, name: 'Viagem EUA - Hardware', target_amount: 3000, current_amount: 500, currency: 'USD', deadline: '2026-08-15' },
            { id: 2, name: 'Reserva de Emergência', target_amount: 10000, current_amount: 2000, currency: 'BRL', deadline: null }
          ],
          error: null
        })
      } else {
        resolve({ data: [], error: null })
      }
    }
  }
  return builder;
}

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: { signOut: vi.fn(), updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    from: vi.fn((table) => createChainableMock(table))
  }
}))

describe('Dashboard Component - Bateria de Testes Completa', () => {
  const mockSession = { user: { id: 'test-user-id', email: 'teste@teste.com' } }

  beforeEach(() => { vi.clearAllMocks() })

  // --- 1. RENDERIZAÇÃO E HISTÓRICO ---
  it('deve renderizar a tela inicial com dados mockados', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    expect(screen.getByText('Nexo')).toBeInTheDocument()
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
  })

  it('deve processar e exibir transações recorrentes de datas passadas', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    expect(screen.getByText(/Internet Recorrente/i)).toBeInTheDocument()
  })

  it('deve exibir no máximo 15 lançamentos e permitir carregar mais', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    expect(screen.getAllByTitle('Editar')).toHaveLength(15)
    await user.click(screen.getByRole('button', { name: /Carregar mais lançamentos/i }))
    expect(screen.getAllByTitle('Editar')).toHaveLength(17) 
  })

  it('deve filtrar o histórico de lançamentos por categoria', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const filterSelect = screen.getAllByRole('combobox')[0]
    await user.selectOptions(filterSelect, '1') 
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument() 
    expect(screen.queryByText(/Uber/i)).not.toBeInTheDocument()   
  })

  // --- 2. METAS (CAIXINHAS) ---
  it('deve renderizar a seção de metas com conversão de moedas', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    expect(screen.getByText('Caixinhas & Metas')).toBeInTheDocument()
    expect(screen.getByText('Viagem EUA - Hardware')).toBeInTheDocument()
    expect(screen.getByText('~ R$ 2.725,00')).toBeInTheDocument()
    expect(screen.getByText('Reserva de Emergência')).toBeInTheDocument()
  })

  it('deve adicionar uma nova meta em dólar com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.click(screen.getByRole('button', { name: 'Meta' }))
    
    await user.type(screen.getByPlaceholderText('Ex: Viagem EUA - Agosto'), 'PC Novo')
    await user.type(screen.getByPlaceholderText('0.00'), '1500')
    
    const currencySelect = screen.getAllByRole('combobox')[1] 
    await user.selectOptions(currencySelect, 'USD')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'PC Novo', target_amount: 1500, currency: 'USD' })
    ]))
  })

  it('deve falhar a validação se a meta não tiver nome ou objetivo', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.click(screen.getByRole('button', { name: 'Meta' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Preencha o nome da meta.')).toBeInTheDocument()
    expect(await screen.findByText('Preencha um objetivo maior que zero.')).toBeInTheDocument()
  })

  it('deve adicionar saldo a uma meta', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const guardarBtns = screen.getAllByRole('button', { name: 'Guardar' })
    await user.click(guardarBtns[0])

    const input = screen.getByPlaceholderText('0.00')
    await user.type(input, '100')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 1)
    
    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ description: 'Aporte: Viagem EUA - Hardware', type: 'expense', amount: 545 })
    ]))
  })

  it('deve retirar saldo de uma meta com sucesso e criar registro', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const retirarBtns = screen.getAllByRole('button', { name: 'Retirar' })
    await user.click(retirarBtns[0])

    const input = screen.getByPlaceholderText('0.00')
    await user.type(input, '100')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 1)

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ description: 'Resgate: Viagem EUA - Hardware', type: 'income', amount: 545 })
    ]))
  })

  it('deve impedir a retirada de valor maior que o saldo da meta', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const retirarBtns = screen.getAllByRole('button', { name: 'Retirar' })
    await user.click(retirarBtns[0])

    const input = screen.getByPlaceholderText('0.00')
    await user.type(input, '10000') 
    
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Valor maior que o saldo atual.')).toBeInTheDocument()
  })

  it('deve excluir uma meta', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const deleteGoalBtns = screen.getAllByTitle('Excluir meta')
    await user.click(deleteGoalBtns[0])
    
    const confirmBtn = screen.getByText('Excluir', { selector: 'button' })
    await user.click(confirmBtn)

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 1)
  })

  // --- 3. VALIDAÇÃO E CONFIGURAÇÃO DE CONTA ---
  it('deve validar formulário de novo lançamento (vazio)', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })
    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Preencha um valor maior que zero.')).toBeInTheDocument()
  })

  it('deve validar formulário de configuração de conta (senhas não coincidem)', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('header button:first-of-type'))
    await user.click(screen.getByText('Alterar senha'))

    await user.type(screen.getByPlaceholderText('Nova senha'), 'senhaforte123')
    await user.type(screen.getByPlaceholderText('Confirmar nova senha'), 'senhaerrada321')

    await user.click(screen.getByRole('button', { name: /Salvar nova senha/i }))
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
  })

  // --- 4. EDIÇÃO, EXCLUSÃO E EXPORTAÇÃO ---
  it('deve abrir o modal de edição, preencher os dados e salvar alterações', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(screen.getAllByTitle('Editar')[1])
    expect(await screen.findByText('Editar Lançamento')).toBeInTheDocument()

    const amountInput = screen.getByPlaceholderText('0,00')
    expect(amountInput).toHaveValue(150.5) 
    
    await user.clear(amountInput)
    await user.type(amountInput, '200')
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/i }))

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })

  it('deve excluir um lançamento ao clicar na lixeira', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })
    await user.click(screen.getAllByTitle('Excluir')[1])
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })

  it('deve realizar a exportação dos dados para CSV', async () => {
    const user = userEvent.setup()
    global.URL.createObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('header button:first-of-type'))
    await user.click(screen.getByRole('button', { name: /Exportar Lançamentos/i }))

    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  // --- 5. CATEGORIAS E SUBCATEGORIAS ---
  it('deve adicionar uma nova categoria principal com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    expect(await screen.findByText('Novo Lançamento')).toBeInTheDocument()
    
    const addCatBtn = screen.getByTestId('add-category-btn')
    await user.click(addCatBtn)
    
    const input = await screen.findByPlaceholderText('Nome da categoria')
    await user.type(input, 'Lazer')
    await user.click(screen.getByRole('button', { name: 'Salvar Categoria' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'Lazer', type: 'expense', parent_id: null })
    ]))
  })

  it('deve adicionar uma nova subcategoria com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    
    const addCatBtn = screen.getByTestId('add-category-btn')
    await user.click(addCatBtn)
    
    const input = await screen.findByPlaceholderText('Nome da categoria')
    await user.type(input, 'Lanches')
    
    const parentSelects = screen.getAllByRole('combobox')
    fireEvent.change(parentSelects[1], { target: { value: '1' } })
    
    await user.click(screen.getByRole('button', { name: 'Salvar Categoria' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'Lanches', type: 'expense', parent_id: '1' })
    ]))
  })

  it('deve inserir um novo lançamento com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '500')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '1' } })
    
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ amount: 500, category_id: '1', type: 'expense' })
    ]))
  })
})