import { render, screen, act, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../components/Dashboard'
import { vi } from 'vitest'

const mockUpdate = vi.fn(function() { return this })
const mockInsert = vi.fn(function() { return this })
const mockDelete = vi.fn(function() { return this })
const mockEq = vi.fn(function() { return this })

const dummyTransactions = Array.from({ length: 14 }).map((_, i) => ({
  id: 101 + i, amount: 10, description: `Dummy ${i}`, expense_date: '2026-07-01',
  // O primeiro usa a subcategoria (4 = Almoço), para cobrir o caminho "pai ↳ filha".
  category_id: i === 0 ? 4 : 1, categories: { name: 'Alimentação' }, type: 'expense', is_recurring: false, created_at: '2026-07-01T10:00:00Z'
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
            { id: 3, name: 'Serviços', type: 'expense', parent_id: null },
            { id: 4, name: 'Almoço', type: 'expense', parent_id: 1 }
          ],
          error: null 
        })
      } else if (table === 'expenses') {
        resolve({ 
          data: [
            { id: 99, amount: 150.50, description: 'Conta de Luz', expense_date: '2026-07-15', category_id: 1, type: 'expense', is_recurring: false, created_at: '2026-07-15T12:00:00Z' },
            { id: 100, amount: 50.00, description: 'Uber', expense_date: '2026-07-16', category_id: 2, type: 'expense', is_recurring: false, created_at: '2026-07-16T12:00:00Z' },
            { id: 500, amount: 120.00, description: 'Internet Recorrente', expense_date: '2025-01-05', category_id: 3, type: 'expense', is_recurring: true, created_at: '2025-01-05T12:00:00Z' },
            ...dummyTransactions
          ], 
          error: null 
        })
      } else if (table === 'goals') {
        resolve({
          data: [
            { id: 1, name: 'Viagem EUA - Hardware', target_amount: 3000, current_amount: 500, currency: 'USD', deadline: '2026-08-15' },
            { id: 2, name: 'Reserva de Emergência', target_amount: 10000, current_amount: 2000, currency: 'BRL', deadline: null },
            { id: 3, name: 'Meta Vazia', target_amount: 1000, current_amount: 0, currency: 'BRL', deadline: null }
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

  // Os dados mockados são de julho/2026 e o Dashboard abre no mês corrente: sem fixar
  // o relógio, os testes quebram assim que o calendário sai desse mês. Só `Date` é
  // falsificado, para não travar os timers do user-event.
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 6, 20, 12))
  })
  afterEach(() => { vi.useRealTimers() })

  // O seletor de categorias é um dropdown próprio (não um <select> nativo): abre ao
  // clicar no combobox e a opção é escolhida clicando na linha da lista.
  const pickCategory = async (user, comboboxIndex, optionName) => {
    await user.click(screen.getAllByRole('combobox')[comboboxIndex])
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }))
  }

  // --- 1. RENDERIZAÇÃO E HISTÓRICO ---
  it('deve renderizar a tela inicial com dados mockados', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })
    expect(screen.getByText('Nexo')).toBeInTheDocument()
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
  })

  // O valor exato é coberto em __tests__/lib/recurrence.test.js; aqui basta garantir
  // que o resumo mostra o acumulado e que ele não repete o restante do mês.
  it('deve exibir o saldo acumulado no resumo do mês', async () => {
    await act(async () => { render(<Dashboard session={mockSession} />) })

    expect(screen.getByText('Saldo Acumulado')).toBeInTheDocument()
    expect(screen.getByText(/^Tudo até /)).toBeInTheDocument()
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

    await pickCategory(user, 0, /Alimentação/)
    expect(screen.getByText(/Conta de Luz/i)).toBeInTheDocument()
    expect(screen.queryByText(/Uber/i)).not.toBeInTheDocument()   
  })

  // --- 1.1 DETALHES DO LANÇAMENTO ---
  const openDetailsOf = async (user, text) => {
    await user.click(screen.getByText(text).closest('[role="button"]'))
    return screen.findByTestId('transaction-details')
  }

  it('deve abrir os detalhes ao clicar em um lançamento', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const panel = await openDetailsOf(user, /Conta de Luz/)

    expect(within(panel).getByText('Alimentação')).toBeInTheDocument()
    expect(within(panel).getByText('Conta de Luz')).toBeInTheDocument()
    expect(within(panel).getByText('15 de julho de 2026')).toBeInTheDocument()
    expect(within(panel).getByText('- R$ 150,50')).toBeInTheDocument()
    // Categoria raiz não deve exibir a linha de subcategoria.
    expect(within(panel).queryByText('Subcategoria')).not.toBeInTheDocument()
  })

  it('deve exibir categoria e subcategoria separadamente nos detalhes', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const panel = await openDetailsOf(user, /Dummy 0/)

    expect(within(panel).getByText('Subcategoria')).toBeInTheDocument()
    expect(within(panel).getByText('Alimentação')).toBeInTheDocument()
    expect(within(panel).getByText('Almoço')).toBeInTheDocument()
  })

  it('deve sinalizar nos detalhes que o lançamento é recorrente', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const panel = await openDetailsOf(user, /Internet Recorrente/)

    expect(within(panel).getByText('Recorrente')).toBeInTheDocument()
    expect(within(panel).getByText('Internet Recorrente')).toBeInTheDocument()
  })

  it('não deve abrir os detalhes ao clicar nos botões de ação da linha', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(screen.getAllByTitle('Editar')[1])

    expect(await screen.findByText('Editar Lançamento')).toBeInTheDocument()
    expect(screen.queryByTestId('transaction-details')).not.toBeInTheDocument()
  })

  it('deve ir dos detalhes para o formulário de edição', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const panel = await openDetailsOf(user, /Conta de Luz/)
    await user.click(within(panel).getByRole('button', { name: 'Editar' }))

    expect(await screen.findByText('Editar Lançamento')).toBeInTheDocument()
    expect(screen.queryByTestId('transaction-details')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('0,00')).toHaveValue(150.5)
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

  // --- NOVO TESTE: Exclusão COM dinheiro (gera resgate) ---
  it('deve excluir uma meta com saldo e resgatar o valor para o saldo principal', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const deleteGoalBtns = screen.getAllByTitle('Excluir meta')
    await user.click(deleteGoalBtns[0]) // ID 1 - Viagem EUA (500 USD)
    
    const confirmBtn = screen.getByText('Excluir', { selector: 'button' })
    await user.click(confirmBtn)

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 1)
    
    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ description: 'Resgate Automático: Viagem EUA - Hardware (Excluída)', type: 'income', amount: 2725 })
    ]))
  })

  // --- NOVO TESTE: Exclusão SEM dinheiro (NÃO gera resgate) ---
  it('deve excluir uma meta vazia sem gerar registro de resgate', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const deleteGoalBtns = screen.getAllByTitle('Excluir meta')
    await user.click(deleteGoalBtns[2]) // ID 3 - Meta Vazia (0 BRL)
    
    mockInsert.mockClear() // Limpamos os inserts prévios para checar se o delete gera algo
    
    const confirmBtn = screen.getByText('Excluir', { selector: 'button' })
    await user.click(confirmBtn)

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 3)
    
    // Como a meta tinha saldo 0, nenhum resgate deve ser injetado no banco
    expect(mockInsert).not.toHaveBeenCalled()
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

  // --- 4.1 SELETOR DE CATEGORIAS ---
  it('deve permitir escolher uma subcategoria no seletor de categorias', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '80')

    await pickCategory(user, 1, /Almoço/)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ category_id: '4' })
    ]))
  })

  it('deve fechar o seletor de categorias com Escape sem escolher nada', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    const trigger = screen.getAllByRole('combobox')[0]
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveTextContent('Todas as categorias')
  })

  // O id vindo do seletor é string e o do banco é número: a busca da categoria
  // precisa comparar sem depender do tipo, senão o botão "Excluir" não faz nada.
  it('deve abrir a confirmação ao excluir a categoria escolhida no formulário', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))

    await pickCategory(user, 1, /Alimentação/)

    await user.click(screen.getByText('Excluir', { selector: 'button' }))

    expect(await screen.findByText('Excluir categoria')).toBeInTheDocument()
    expect(screen.getByText('"Alimentação"')).toBeInTheDocument()
  })

  it('deve inserir um novo lançamento com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '500')

    await pickCategory(user, 1, /Alimentação/)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ amount: 500, category_id: '1', type: 'expense', recurrence_end_date: null })
    ]))
  })

  // Compra parcelada: recorrente com prazo de 6 meses a partir do mês visualizado.
  it('deve gravar o prazo de um lançamento recorrente pelo atalho de duração', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '300')
    await pickCategory(user, 1, /Alimentação/)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '6x' }))

    // Último dia do 6º mês contado a partir do atual (o mês visualizado ao abrir).
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 6, 0)
    const pad = (n) => String(n).padStart(2, '0')
    const expectedEnd = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`

    expect(screen.getByText(/^6x —/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ is_recurring: true, recurrence_end_date: expectedEnd })
    ]))
  })

  // O fim é sempre data inicial + duração, então mexer na data inicial move o prazo.
  it('deve mover o prazo junto ao mudar a data inicial do recorrente', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '6x' }))

    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2027-01-15' } })

    expect(screen.getByText('6x — de Jan/2027 até Jun/2027.')).toBeInTheDocument()
    expect(screen.getByText('Repete todo dia 15, a partir de Jan/2027.')).toBeInTheDocument()
  })

  it('deve aceitar uma duração digitada em meses e gravar o fim correspondente', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '250')
    await pickCategory(user, 1, /Alimentação/)
    await user.click(screen.getByRole('checkbox'))

    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2027-03-20' } })
    await user.type(screen.getByPlaceholderText('Sem fim'), '10')

    expect(screen.getByText('10x — de Mar/2027 até Dez/2027.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ expense_date: '2027-03-20', recurrence_end_date: '2027-12-31' })
    ]))
  })

  it('deve manter o recorrente sem prazo quando a opção "Sem fim" está ativa', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '90')
    await pickCategory(user, 1, /Alimentação/)
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByText('Repete todo mês, sem data para acabar.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ is_recurring: true, recurrence_end_date: null })
    ]))
  })
  // --- DESCARTAR FORMULÁRIO ---
  it('deve fechar o formulário intocado com Escape, sem pedir confirmação', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    expect(screen.getByRole('dialog', { name: 'Novo Lançamento' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deve pedir confirmação antes de descartar um formulário preenchido', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<Dashboard session={mockSession} />) })

    await user.click(document.querySelector('button.fixed.bottom-6'))
    await user.type(screen.getByPlaceholderText('0,00'), '42')
    await user.keyboard('{Escape}')

    expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()

    // Cancelar mantém o formulário e o que foi digitado.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('0,00')).toHaveValue(42)

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})