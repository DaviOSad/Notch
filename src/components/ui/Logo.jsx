// O nome com o N de public/icon.svg no lugar da letra: hastes na cor do texto (seguem
// o claro/escuro sozinhas) e diagonal em caju. A altura do N é a das maiúsculas da fonte.
export default function Logo({ as: Tag = 'p', className = '' }) {
  return (
    <Tag aria-label="Notch" className={`font-display font-extrabold tracking-tight ${className}`}>
      <svg viewBox="146 136 220 240" className="mr-[0.03em] inline-block h-[0.72em] w-auto align-baseline" aria-hidden="true">
        <path d="M178 168 334 344" stroke="#F2A900" strokeWidth="64" fill="none" />
        <rect x="146" y="136" width="64" height="240" rx="14" fill="currentColor" />
        <rect x="302" y="136" width="64" height="240" rx="14" fill="currentColor" />
      </svg>
      <span aria-hidden="true">otch</span>
    </Tag>
  )
}
