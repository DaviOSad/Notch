import { useId } from 'react'

// Rótulo + campo + mensagem de erro, já ligados por id/aria. `hideLabel` mantém o
// rótulo para leitores de tela quando o layout é compacto demais para mostrá-lo.
export default function Field({ label, error, hideLabel = false, wrapperClassName = '', className = '', ...inputProps }) {
  const id = useId()
  const errorId = `${id}-erro`

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && <label htmlFor={id} className={hideLabel ? 'sr-only' : 'rotulo'}>{label}</label>}
      <input
        id={id}
        className={`campo ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && <span id={errorId} className="texto-erro">{error}</span>}
    </div>
  )
}
