import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS_LONG, MONTHS_SHORT } from '../../lib/constants'

const arrowClass = 'btn-icone text-bruma hover:bg-petroleo-alto hover:text-espuma'

export default function MonthNavigator({ currentDate, onChangeMonth, isPickerOpen, onTogglePicker }) {
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    if (isPickerOpen) setPickerYear(currentDate.getFullYear())
  }, [isPickerOpen, currentDate])

  const shiftMonth = (offset) =>
    onChangeMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))

  return (
    <div
      className="relative flex items-center justify-between gap-2"
      onKeyDown={(e) => { if (e.key === 'Escape' && isPickerOpen) onTogglePicker(false) }}
    >
      <button
        type="button"
        onClick={() => onTogglePicker(!isPickerOpen)}
        aria-expanded={isPickerOpen}
        aria-haspopup="dialog"
        className="-ml-2 flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-petroleo-alto"
      >
        <span className="truncate font-display text-2xl font-bold tracking-tight">
          {MONTHS_LONG[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-bruma transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className="-mr-2 flex shrink-0">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className={arrowClass}><ChevronLeft size={20} /></button>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês" className={arrowClass}><ChevronRight size={20} /></button>
      </div>

      {isPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onTogglePicker(false)} />
          <div role="dialog" aria-label="Escolher mês" className="sobre-folha absolute left-0 top-full z-50 mt-3 w-72 max-w-full animate-surge rounded-2xl bg-folha p-4 text-tinta shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setPickerYear((y) => y - 1)} aria-label="Ano anterior" className="btn-icone text-neblina hover:bg-pagina"><ChevronLeft size={18} /></button>
              <span className="font-display text-lg font-bold">{pickerYear}</span>
              <button type="button" onClick={() => setPickerYear((y) => y + 1)} aria-label="Próximo ano" className="btn-icone text-neblina hover:bg-pagina"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((monthStr, index) => {
                const isCurrent = currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear
                return (
                  <button
                    type="button"
                    key={`month-${monthStr}-${index}`}
                    onClick={() => { onChangeMonth(new Date(pickerYear, index, 1)); onTogglePicker(false) }}
                    aria-pressed={isCurrent}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${isCurrent ? 'bg-petroleo text-espuma' : 'text-tinta hover:bg-pagina'}`}
                  >
                    {monthStr}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
