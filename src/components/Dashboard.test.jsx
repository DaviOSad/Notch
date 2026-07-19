import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { vi } from 'vitest'

const mockUpdate = vi.fn(function() { return this })
const mockInsert = vi.fn(function() { return this })
const mockDelete = vi.fn(function() { return this })
const mockEq = vi.fn(function() { return this })

// Criamos 14 transações dummy para forçar a paginação (totalizando 16 itens).
const dummyTransactions = Array.from({ length: 14 }).map((_, i) => ({
  id: 101 + i, amount: 10, description: `Dummy ${i}`, expense_date: '2026-07-10',
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
            { id: 1, name: 'Alimentação', type: 'expense' },
            { id: 2, name: 'Transporte', type: 'expense' }
          ], 
          error: null 
        })
      } else if (table === 'expenses') {
        resolve({ 
          data: [
            { id: 99, amount: 150.50, description: 'Conta de Luz', expense_date: '2026-07-15', category_id: 1, categories: { name: 'Alimentação' }, type: 'expense', is_recurring: false },
            { id: 100, amount: 50.00, description: 'Uber', expense_date: '2026-07-16', category_id: 2, categories: { name: 'Transporte' }, type: 'expense', is_recurring: false },
            ...dummyTransactions
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

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { signOut: vi.fn(), updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    from: vi.fn((table) => createChainableMock(table))
  }
}))

describe('Dashboard Component - Bateria de Testes Completa', () => {
  const mockSession = { user: { id: 'test-user-id', email: 'teste@teste.com' } }

  beforeEach(() => { vi.clearAllMocks() })

  it('deve renderizar a tela inicial com dados mockados', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    
    expect(screen.getByText('Nexo')).toBeInTheDocument()
    expect(screen.getByText('Resumo do Mês')).toBeInTheDocument()
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
    expect(screen.getByText(/Uber/i)).toBeInTheDocument()
  })

  it('deve exibir no máximo 15 lançamentos e permitir carregar mais', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const editButtons = screen.getAllByTitle('Editar')
    expect(editButtons).toHaveLength(15)

    const loadMoreBtn = screen.getByRole('button', { name: /Carregar mais lançamentos/i })
    expect(loadMoreBtn).toBeInTheDocument()

    await user.click(loadMoreBtn)

    const allEditButtons = screen.getAllByTitle('Editar')
    expect(allEditButtons).toHaveLength(16)
    expect(screen.queryByRole('button', { name: /Carregar mais lançamentos/i })).not.toBeInTheDocument()
  })

  it('deve filtrar o histórico de lançamentos por categoria', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const filterSelect = screen.getAllByRole('combobox')[0]

    await user.selectOptions(filterSelect, 'Alimentação')
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument() 
    expect(screen.queryByText(/Uber/i)).not.toBeInTheDocument()   

    await user.selectOptions(filterSelect, 'Transporte')
    expect(screen.queryByText(/Conta de Luz/i)).not.toBeInTheDocument() 
    expect(screen.getByText(/Uber/i)).toBeInTheDocument()               

    await user.selectOptions(filterSelect, 'Todas as categorias')
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
    expect(screen.getByText(/Uber/i)).toBeInTheDocument()
  })

  it('deve validar formulário de novo lançamento (vazio)', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.click(screen.getByRole('button', { name: /Confirmar Lançamento/i }))

    expect(await screen.findByText('Preencha um valor maior que zero.')).toBeInTheDocument()
    expect(await screen.findByText('Selecione uma categoria.')).toBeInTheDocument()
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

  it('deve abrir o modal de edição, preencher os dados e salvar alterações', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    // Conta de Luz fica no índice 1 por causa da ordem cronológica
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

  it('deve adicionar uma nova categoria com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    
    const modalSelect = screen.getAllByRole('combobox')[1]
    await user.selectOptions(modalSelect, 'new') 
    
    await user.type(await screen.findByPlaceholderText('Nome da categoria'), 'Lazer')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ name: 'Lazer', type: 'expense' })]))
  })

  it('deve inserir um novo lançamento com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '500')

    const modalSelect = screen.getAllByRole('combobox')[1]
    await user.selectOptions(modalSelect, 'Alimentação') 
    
    const selectedValue = modalSelect.value
    await user.click(screen.getByRole('button', { name: /Confirmar Lançamento/i }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ amount: 500, category_id: selectedValue, type: 'expense' })
    ]))
  })
})