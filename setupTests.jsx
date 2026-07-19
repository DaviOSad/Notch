import '@testing-library/jest-dom'

// O Recharts precisa de um tamanho de tela real para renderizar o gráfico.
// Como estamos testando no terminal (JSDOM), fazemos um "mock" para ele não quebrar.
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
  }
})