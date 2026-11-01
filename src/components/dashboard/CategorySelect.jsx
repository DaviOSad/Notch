import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, CornerDownRight, Search } from 'lucide-react'
import { findCategory, getSubcategories, sameId } from '../../lib/categories'

// Busca tolerante a acentos e maiúsculas ("almoco" acha "Almoço").
const normalize = (text) =>
  (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const SEARCH_THRESHOLD = 8

/**
 * Seletor de categorias em substituição ao <select> nativo: a lista de opções do
 * navegador não aceita estilo, então aqui ela é um popover próprio, com busca,
 * navegação por teclado e a hierarquia pai/subcategoria desenhada de verdade.
 *
 * `type` (opcional) restringe as subcategorias a despesa/receita — o filtro do
 * histórico lista todas, o formulário lista só as do tipo em edição.
 * `emptyLabel` cria a primeira linha que limpa a seleção (ex.: "Todas as categorias").
 * `parentHint` é o rótulo curto da linha da categoria raiz ("Geral" no formulário,
 * onde ela é uma categoria em si; "Tudo" no filtro, onde ela inclui as filhas).
 */
export default function CategorySelect({
  categories,
  parents,
  type,
  value,
  onChange,
  placeholder = 'Selecione...',
  emptyLabel,
  parentHint,
  hasError = false,
  className = '',
  triggerClassName = 'rounded-xl border border-linha bg-white px-4 py-3 hover:border-neblina',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [openUpwards, setOpenUpwards] = useState(false)

  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const optionRefs = useRef([])

  // Lista achatada na ordem em que aparece na tela — é ela que o teclado percorre.
  const options = useMemo(() => {
    const list = emptyLabel ? [{ id: '', label: emptyLabel, isEmpty: true }] : []

    parents.forEach((parent) => {
      list.push({ id: parent.id, label: parent.name, isParent: true, group: parent.group })
      getSubcategories(categories, parent.id)
        .filter((sub) => !type || sub.type === type)
        .forEach((sub) => list.push({ id: sub.id, label: sub.name, parentId: parent.id, parentName: parent.name, group: parent.group }))
    })
    return list
  }, [categories, parents, type, emptyLabel])

  // Títulos de grupo (`parent.group`) só fazem sentido quando a lista mistura grupos;
  // o formulário, que mostra um tipo só, segue sem eles.
  const showGroups = useMemo(() => new Set(options.map((o) => o.group).filter(Boolean)).size > 1, [options])

  // Um pai continua na lista se ele ou qualquer filha casar com a busca, e vice-versa,
  // para a hierarquia não aparecer quebrada (filha órfã ou pai sem contexto).
  const visibleOptions = useMemo(() => {
    const query = normalize(search.trim())
    if (!query) return options

    const matches = (option) => normalize(option.label).includes(query)
    const matchedParentIds = new Set(
      options.filter((o) => o.parentId && matches(o)).map((o) => String(o.parentId))
    )
    const matchedParents = new Set(
      options.filter((o) => o.isParent && matches(o)).map((o) => String(o.id))
    )

    return options.filter((option) => {
      if (option.isEmpty) return false
      if (option.isParent) return matches(option) || matchedParentIds.has(String(option.id))
      return matches(option) || matchedParents.has(String(option.parentId))
    })
  }, [options, search])

  const selected = useMemo(() => {
    if (!value) return null
    const category = findCategory(categories, value)
    if (!category) return null
    const parent = category.parent_id ? findCategory(categories, category.parent_id) : null
    return { label: category.name, parentName: parent?.name }
  }, [categories, value])

  const close = () => {
    setIsOpen(false)
    setSearch('')
  }

  const open = () => {
    // Abre para cima quando não há espaço embaixo (modal em tela pequena).
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setOpenUpwards(window.innerHeight - rect.bottom < 300 && rect.top > 300)

    setIsOpen(true)
    setSearch('')
    setActiveIndex(Math.max(options.findIndex((o) => sameId(o.id, value)), 0))
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) close()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
  }, [isOpen])

  useLayoutEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [isOpen, activeIndex])

  const select = (option) => {
    onChange(option.isEmpty ? '' : String(option.id))
    close()
    triggerRef.current?.focus()
  }

  const moveActive = (step) => {
    if (visibleOptions.length === 0) return
    setActiveIndex((prev) => {
      const next = prev + step
      if (next < 0) return visibleOptions.length - 1
      if (next >= visibleOptions.length) return 0
      return next
    })
  }

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        open()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        close()
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(-1)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(visibleOptions.length - 1)
        break
      case 'Enter':
        event.preventDefault()
        if (visibleOptions[activeIndex]) select(visibleOptions[activeIndex])
        break
      default:
        break
    }
  }

  optionRefs.current = []

  return (
    <div ref={wrapperRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={hasError ? 'true' : undefined}
        onClick={() => (isOpen ? close() : open())}
        className={`flex w-full cursor-pointer items-center gap-2 text-left text-sm text-tinta transition-colors ${triggerClassName} ${hasError ? '!border-saida' : ''} ${isOpen ? '!border-petroleo ring-2 ring-petroleo/20' : ''}`}
      >
        <span className="flex min-w-0 flex-1 items-center">
          {selected ? (
            <>
              {selected.parentName && (
                <>
                  <span className="truncate text-neblina">{selected.parentName}</span>
                  <CornerDownRight size={13} className="mx-1 shrink-0 text-neblina/60" />
                </>
              )}
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <span className="truncate text-neblina">{emptyLabel || placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-neblina transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Ancorado à direita: em gatilhos estreitos a lista cresce para dentro da tela. */}
      {isOpen && (
        <div className={`absolute right-0 z-50 w-full min-w-[15rem] overflow-hidden rounded-2xl border border-linha bg-folha shadow-2xl shadow-petroleo/25 animate-surge ${openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {options.length > SEARCH_THRESHOLD && (
            <div className="relative border-b border-linha p-2">
              <Search size={15} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-neblina" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveIndex(0) }}
                placeholder="Buscar categoria..."
                aria-label="Buscar categoria" className="campo !py-2 !pl-9 !pr-3"
              />
            </div>
          )}

          <ul role="listbox" className="custom-scrollbar max-h-64 overflow-y-auto p-1.5">
            {visibleOptions.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-neblina">Nenhuma categoria encontrada.</li>
            )}

            {visibleOptions.map((option, index) => {
              const isSelected = option.isEmpty ? !value : sameId(option.id, value)
              const isActive = index === activeIndex

              // O título é desenhado junto da primeira opção visível do grupo; não é uma
              // opção, então não entra em `visibleOptions` nem na navegação por teclado.
              const startsGroup = showGroups && option.group && option.group !== visibleOptions[index - 1]?.group

              return (
                <Fragment key={`${option.isParent ? 'p' : 's'}-${option.id || 'empty'}`}>
                {startsGroup && <li role="presentation" className="px-3 pb-1 pt-3 text-xs font-semibold text-neblina">{option.group}</li>}
                <li
                  ref={(el) => { optionRefs.current[index] = el }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-tinta transition-colors ${option.parentId ? 'pl-7' : ''} ${option.isParent || isSelected ? 'font-semibold' : ''} ${isActive ? 'bg-pagina' : ''}`}
                >
                  {option.parentId && <CornerDownRight size={13} className="shrink-0 text-neblina/60" />}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.isParent && parentHint && (
                    <span className="shrink-0 text-xs text-neblina">{parentHint}</span>
                  )}
                  {isSelected && <Check size={15} className="shrink-0 text-petroleo" />}
                </li>
                </Fragment>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
