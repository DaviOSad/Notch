import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS_SHORT } from '../../lib/constants'

export default function MonthNavigator({ currentDate, onChangeMonth, isPickerOpen, onTogglePicker }) {
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    if (isPickerOpen) setPickerYear(currentDate.getFullYear())
  }, [isPickerOpen, currentDate])

  const shiftMonth = (offset) =>
    onChangeMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))

  return (
    <div className="relative flex items-center gap-1 rounded-full bg-black/20 px-1 py-1">
      <button onClick={() => shiftMonth(-1)} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"><ChevronLeft size={16} /></button>
      <button onClick={() => onTogglePicker(!isPickerOpen)} className="text-xs font-bold uppercase tracking-widest text-white w-24 text-center hover:text-cyan-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5">
        {MONTHS_SHORT[currentDate.getMonth()]} {currentDate.getFullYear()}
      </button>
      <button onClick={() => shiftMonth(1)} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"><ChevronRight size={16} /></button>
      {isPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onTogglePicker(false)} />
          <div className="absolute right-0 top-[120%] z-50 w-64 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => setPickerYear((y) => y - 1)} className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft size={18} /></button>
              <span className="font-bold text-white text-base">{pickerYear}</span>
              <button onClick={() => setPickerYear((y) => y + 1)} className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_SHORT.map((monthStr, index) => (
                <button
                  key={`month-${monthStr}-${index}`}
                  onClick={() => { onChangeMonth(new Date(pickerYear, index, 1)); onTogglePicker(false) }}
                  className={`rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                >
                  {monthStr}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
