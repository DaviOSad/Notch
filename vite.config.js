import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Origem exata do projeto Supabase; se a variável faltar, cai no curinga do domínio.
const supabaseOrigin = (url) => {
  try {
    return new URL(url).origin
  } catch {
    return 'https://*.supabase.co'
  }
}

/**
 * O GitHub Pages não deixa configurar cabeçalhos, então a CSP entra como <meta> no
 * HTML gerado. O `connect-src` é o que importa aqui: mesmo que algum script hostil
 * chegue a rodar na página, o token da sessão não tem para onde ser enviado.
 *
 * Só no build: em desenvolvimento o Vite injeta script inline e abre WebSocket para
 * o HMR, que uma política restritiva bloquearia.
 */
const cspProducao = (connectSrc) => ({
  name: 'csp-producao',
  apply: 'build',
  transformIndexHtml() {
    const politica = [
      "default-src 'self'",
      "script-src 'self'",
      // Estilos inline são usados por bibliotecas de gráfico; scripts continuam restritos.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "manifest-src 'self'",
      `connect-src 'self' ${connectSrc}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
    ].join('; ')

    return [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: politica },
      injectTo: 'head-prepend',
    }]
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [react(), cspProducao(supabaseOrigin(loadEnv(mode, process.cwd(), '').VITE_SUPABASE_URL))],
  base: '/Finances-Dashboard/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.jsx',
    css: false,
  },
}))
