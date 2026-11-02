import Logo from './Logo'
import TapeBar from './TapeBar'
import { COLORS } from '../../lib/constants'

// Fatias decorativas: a mesma fita do dashboard, só que sem dados.
const SAMPLE_TAPE = [
  { name: 'a', share: 34, color: COLORS[0] },
  { name: 'b', share: 22, color: COLORS[2] },
  { name: 'c', share: 14, color: COLORS[3] },
  { name: 'd', share: 8, color: COLORS[4] },
]

// Moldura das telas sem sessão (login, cadastro, recuperação, nova senha): painel
// petróleo com a marca ao lado do formulário — em cima dele no celular.
// `fading` esmaece (e afasta levemente) título, subtítulo e formulário durante a troca de modo.
export default function AuthLayout({ title, subtitle, footer, fading = false, children }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="sobre-petroleo flex flex-col justify-between bg-petroleo px-6 py-6 text-espuma md:px-12 md:py-14">
        <div>
          <Logo className="text-3xl md:text-4xl" />
          <TapeBar segments={SAMPLE_TAPE} free={22} className="mt-4 h-2.5 max-w-[12rem] md:hidden" />
        </div>

        <div className="hidden md:block" aria-hidden="true">
          <p className="mb-8 max-w-xs font-display text-4xl font-bold leading-[1.05] tracking-tight">
            O mês inteiro numa linha só.
          </p>
          <TapeBar segments={SAMPLE_TAPE} free={22} className="h-6" />
        </div>
      </aside>

      <main className="flex items-center px-6 py-10 md:px-16">
        <div className="w-full max-w-sm">
          <div className={`${fading ? 'translate-y-2 scale-[0.97] opacity-0 transition-all duration-300 motion-reduce:transition-none' : ''}`}>
            <h1 className="mb-2 font-display text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mb-8 min-h-[2.75rem] text-sm leading-relaxed text-neblina">{subtitle}</p>}
            {children}
          </div>
          {footer && <div className="mt-8 border-t border-linha pt-6">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
