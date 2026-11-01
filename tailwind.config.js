/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Paleta do Nexo. Sobre a página clara usa-se `saida`/`entrada`; sobre o
      // petróleo, as versões `-claro` (mesmo significado, contraste refeito).
      colors: {
        pagina: '#E8EEEB',
        folha: '#F5F8F6',
        linha: '#C9D6D1',
        tinta: '#12282B',
        neblina: '#4C6763',
        petroleo: { DEFAULT: '#0E2A2D', alto: '#17393D', linha: '#2A5155' },
        espuma: '#EAF2EF',
        bruma: '#A9C4BF',
        caju: { DEFAULT: '#F2A900', escuro: '#D99700' },
        entrada: { DEFAULT: '#12754A', claro: '#72D6A3' },
        saida: { DEFAULT: '#B3362A', claro: '#FF9C8A' },
      },
      borderRadius: {
        folha: '28px',
      },
      keyframes: {
        'fita-cresce': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'sobe': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'surge': { from: { transform: 'scale(0.97)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'fita-cresce': 'fita-cresce 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sobe': 'sobe 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'surge': 'surge 160ms ease-out both',
      },
    },
  },
  plugins: [],
}
