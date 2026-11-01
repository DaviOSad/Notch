// A fita do mês: cada segmento é uma fatia da largura (`share`, em %), e `free` é o
// que sobrou da receita, desenhado como espaço vazio. Puramente visual — quem usa
// descreve o conteúdo (role="img" + aria-label) ou esconde (aria-hidden).
export default function TapeBar({ segments, free = 0, className = 'h-5' }) {
  return (
    <div className={`flex w-full gap-[3px] ${className}`}>
      {segments.map((segment, index) => (
        <div
          key={segment.name}
          className="fita-segmento animate-fita-cresce h-full rounded-md"
          style={{
            width: `${segment.share}%`,
            minWidth: 4,
            backgroundColor: segment.color,
            animationDelay: `${index * 70}ms`,
          }}
        />
      ))}
      {free > 0 && <div className="h-full rounded-md border border-dashed border-petroleo-linha" style={{ width: `${free}%` }} />}
    </div>
  )
}
