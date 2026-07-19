import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { vi } from 'vitest'

const mockUpdate = vi.fn(function() { return this })
const mockInsert = vi.fn(function() { return this })
const mockDelete = vi.fn(function() { return this })
const mockEq = vi.fn(function() { return this })

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
        resolve({ data: [{ id: Date.now(), name: 'Alimentação', type: 'expense' }], error: null })
      } else if (table === 'expenses') {
        resolve({ 
          data: [{ 
            id: 99, amount: 150.50, description: 'Conta de Luz', expense_date: '2026-07-15', 
            category_id: 1, categories: { name: 'Alimentação' }, type: 'expense', is_recurring: false 
          }], 
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
    
    // Atualizado para os novos textos da interface (Nexo e Resumo do Mês)
    expect(screen.getByText('Nexo')).toBeInTheDocument()
    expect(screen.getByText('Resumo do Mês')).toBeInTheDocument()
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
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

    await user.click(await screen.findByTitle('Editar'))
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

    await user.click(await screen.findByTitle('Excluir'))
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })

  it('deve adicionar uma nova categoria com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.selectOptions(screen.getByRole('combobox'), 'new') 
    await user.type(await screen.findByPlaceholderText('Nome da categoria'), 'Lazer')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ name: 'Lazer', type: 'expense' })]))
  })

  it('deve inserir um novo lançamento com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '500')

    const selectBox = screen.getByRole('combobox')
    await user.selectOptions(selectBox, 'Alimentação') 
    
    const dynamicCategoryId = screen.getByRole('option', { name: 'Alimentação' }).value
    await user.click(screen.getByRole('button', { name: /Confirmar Lançamento/i }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ amount: 500, category_id: dynamicCategoryId, type: 'expense' })]))
  })
})