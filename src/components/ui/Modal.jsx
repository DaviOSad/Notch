import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Casca única dos modais. `sheet` sobe da base no celular e vira diálogo centrado a
 * partir de md; `dialog` é sempre centrado e compacto (confirmações e avisos).
 *
 * Cuida do que cada modal repetia ou esquecia: papel `dialog`, foco que entra e volta
 * para quem abriu, Tab preso dentro do painel e Escape para fechar. Modais aninhados
 * são irmãos na árvore (não filhos do painel), então o Escape fecha só o de cima.
 */
export default function Modal({
  title,
  onClose,
  variant = 'sheet',
  width = 'md:max-w-md',
  z = 'z-50',
  titleClassName = '',
  testId,
  children,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  // Lido durante a renderização: um campo com autoFocus já teria roubado o foco
  // quando o efeito rodasse, e o "voltar ao botão que abriu" apontaria para ele.
  const openerRef = useRef(document.activeElement)
  const isSheet = variant === 'sheet'

  useEffect(() => {
    const opener = openerRef.current
    const panel = panelRef.current
    // Campos com autoFocus já tomaram o foco; só puxa o painel se ninguém o fez.
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus() }
  }, [])

  const handleKeyDown = (e) => {
    // O seletor de categorias já usa o Escape para fechar a própria lista.
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={`fixed inset-0 ${z} flex justify-center ${isSheet ? 'items-end md:items-center md:p-6' : 'items-center p-4'}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-petroleo/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        onKeyDown={handleKeyDown}
        className={`custom-scrollbar relative max-h-[92vh] w-full overflow-y-auto bg-folha text-tinta shadow-2xl outline-none ${
          isSheet
            ? `${width} animate-sobe rounded-t-folha p-6 md:animate-surge md:rounded-folha md:p-8`
            : 'max-w-sm animate-surge rounded-folha p-6'
        }`}
      >
        {isSheet && <div aria-hidden="true" className="mx-auto mb-5 h-1 w-10 rounded-full bg-linha md:hidden" />}

        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className={`font-display text-2xl font-bold leading-tight tracking-tight ${titleClassName}`}>{title}</h2>
          {isSheet && (
            <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="btn-icone -mr-2 -mt-1 text-neblina hover:bg-pagina hover:text-tinta">
              <X size={22} />
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
