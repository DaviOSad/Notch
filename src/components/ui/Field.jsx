import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Rótulo + campo + mensagem de erro, já ligados por id/aria. `hideLabel` mantém o
// rótulo para leitores de tela quando o layout é compacto demais para mostrá-lo.
// Campos `type="password"` ganham um olho para mostrar/ocultar o texto.
export default function Field({ label, error, hideLabel = false, wrapperClassName = '', className = '', type, ...inputProps }) {
  const id = useId()
  const errorId = `${id}-erro`
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && <label htmlFor={id} className={hideLabel ? 'sr-only' : 'rotulo'}>{label}</label>}
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={`campo ${isPassword ? 'pr-11' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neblina transition-colors hover:text-tinta"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span id={errorId} className="texto-erro">{error}</span>}
    </div>
  )
}
