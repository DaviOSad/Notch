import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { vi } from 'vitest'

// 1. Variáveis para espionar as chamadas ao Supabase
const mockUpdate = vi.fn(function() { return this })
const mockInsert = vi.fn(function() { return this })
const mockDelete = vi.fn(function() { return this })
const mockEq = vi.fn(function() { return this })

// 2. Construtor avançado do Mock do Supabase
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
      // Quando o Dashboard pedir as categorias...
      if (table === 'categories') {
        resolve({ data: [{ id: 1, name: 'Alimentação', type: 'expense' }], error: null })
      } 
      // Quando o Dashboard pedir o histórico de lançamentos...
      else if (table === 'expenses') {
        resolve({ 
          data: [{ 
            id: 99, 
            amount: 150.50, 
            description: 'Conta de Luz', 
            expense_date: '2026-07-15', 
            category_id: 1, 
            categories: { name: 'Alimentação' }, 
            type: 'expense', 
            is_recurring: false 
          }], 
          error: null 
        })
      } 
      else {
        resolve({ data: [], error: null })
      }
    }
  }
  return builder;
}

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    from: vi.fn((table) => createChainableMock(table))
  }
}))

describe('Dashboard Component - Bateria de Testes Completa', () => {
  const mockSession = { user: { id: 'test-user-id', email: 'teste@teste.com' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // BLOCO 1: RENDERIZAÇÃO E VALIDAÇÕES (EXISTENTES)
  // ==========================================
  
  it('deve renderizar a tela inicial com dados mockados', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    
    expect(screen.getByText('Finanças')).toBeInTheDocument()
    // Verifica se a "Conta de Luz" mockada apareceu no histórico
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
  })

  it('deve validar formulário de novo lançamento (vazio)', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const fabButton = document.querySelector('button.fixed.bottom-6')
    await user.click(fabButton)

    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    await user.click(submitBtn)

    expect(await screen.findByText('Preencha um valor maior que zero.')).toBeInTheDocument()
    expect(await screen.findByText('Selecione uma categoria.')).toBeInTheDocument()
  })

  it('deve validar formulário de configuração de conta (senhas não coincidem)', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const settingsButton = document.querySelector('header button:first-of-type')
    await user.click(settingsButton)
    await user.click(screen.getByText('Alterar senha'))

    const newPassInput = screen.getByPlaceholderText('Nova senha')
    const confirmPassInput = screen.getByPlaceholderText('Confirmar nova senha')

    await user.type(newPassInput, 'senhaforte123')
    await user.type(confirmPassInput, 'senhaerrada321')

    await user.click(screen.getByRole('button', { name: /Salvar nova senha/i }))
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
  })


  // ==========================================
  // BLOCO 2: NOVAS FEATURES (EDIÇÃO E EXCLUSÃO)
  // ==========================================

  it('deve abrir o modal de edição, preencher os dados e salvar alterações', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    // 1. Clica no botão de Editar do lançamento mockado (Conta de Luz)
    const editButton = await screen.findByTitle('Editar')
    await user.click(editButton)

    // 2. Verifica se o modal mudou para modo de Edição
    expect(await screen.findByText('Editar Lançamento')).toBeInTheDocument()

    // 3. Verifica se os valores vieram preenchidos corretamente
    const amountInput = screen.getByPlaceholderText('0,00')
    expect(amountInput).toHaveValue(150.5) 
    
    const descInput = screen.getByPlaceholderText('Opcional')
    expect(descInput).toHaveValue('Conta de Luz')

    // 4. Edita o valor
    await user.clear(amountInput)
    await user.type(amountInput, '200')

    // 5. Clica em Salvar Alterações
    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i })
    await user.click(saveBtn)

    // 6. Verifica se o UPDATE no banco foi chamado apontando para o ID 99
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })

  it('deve excluir um lançamento ao clicar na lixeira', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    // Clica no botão de Lixeira
    const deleteButton = await screen.findByTitle('Excluir')
    await user.click(deleteButton)

    // Verifica se a instrução DELETE foi enviada pro Supabase com o ID 99
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })


  // ==========================================
  // BLOCO 3: CRIAÇÃO DE CATEGORIAS E SUCESSO
  // ==========================================

  it('deve adicionar uma nova categoria com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    // Abre o modal de lançamento
    const fabButton = document.querySelector('button.fixed.bottom-6')
    await user.click(fabButton)

    // Seleciona a opção "+ Adicionar nova categoria"
    const selectBox = screen.getByRole('combobox')
    await user.selectOptions(selectBox, 'new') 

    // O input de nome da categoria deve aparecer
    const catInput = await screen.findByPlaceholderText('Nome da categoria')
    await user.type(catInput, 'Lazer')

    // Clica em Criar
    const createCatBtn = screen.getByRole('button', { name: 'Criar' })
    await user.click(createCatBtn)

    // Verifica se a instrução INSERT foi enviada para a tabela categorias
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Lazer', type: 'expense' })
      ])
    )
  })

  it('deve inserir um novo lançamento com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    // Abre modal
    await user.click(document.querySelector('button.fixed.bottom-6'))

    // Preenche dados
    const amountInput = screen.getByPlaceholderText('0,00')
    await user.type(amountInput, '500')

    const selectBox = screen.getByRole('combobox')
    await user.selectOptions(selectBox, '1') // Seleciona a categoria Alimentação (ID 1 do mock)

    // Submete
    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    await user.click(submitBtn)

    // Verifica se o Supabase recebeu o INSERT
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 500,
          category_id: '1',
          type: 'expense'
        })
      ])
    )
  })
})