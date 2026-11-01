// Marca + nome: o N de public/icon.svg sem o fundo, com as hastes na cor do texto
// (some no escuro/claro sozinha) e a diagonal em caju.
export default function Logo({ as: Tag = 'p', className = '' }) {
  return (
    <Tag className={`flex items-center gap-2.5 font-display font-extrabold tracking-tight ${className}`}>
      <svg viewBox="130 120 252 272" className="h-[0.9em] w-auto" aria-hidden="true">
        <path d="M178 168 334 344" stroke="#F2A900" strokeWidth="64" fill="none" />
        <rect x="146" y="136" width="64" height="240" rx="14" fill="currentColor" />
        <rect x="302" y="136" width="64" height="240" rx="14" fill="currentColor" />
      </svg>
      <span>Notch</span>
    </Tag>
  )
}
