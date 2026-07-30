import { useState } from 'react'
import { blockInvalidChars } from '../../../lib/formatters'

// Formulário de aporte/resgate de uma meta. A gravação em si fica no Dashboard,
// que precisa refletir a movimentação também no histórico de lançamentos.
export default function FundGoalModal({ goal, fundType, isSaving, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)

  const isDeposit = fundType === 'add'

  const handleSubmit = (e) => {
    e.preventDefault()

    const normalized = String(amount).replace(',', '.')
    const amountValue = Number.parseFloat(normalized)
    if (!normalized || !(amountValue > 0)) return

    if (!isDeposit && amountValue > Number.parseFloat(goal.current_amount || 0)) {
      setError('Valor maior que o saldo atual.')
      return
    }

    onSubmit(amountValue)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full mx-4 max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="mb-2 text-xl font-bold text-white">{isDeposit ? 'Adicionar Saldo' : 'Retirar Saldo'}</h3>
        <p className="mb-4 text-sm text-slate-300">Qual valor você deseja {isDeposit ? 'alocar na' : 'retirar da'} meta <span className="font-bold text-white">"{goal.name}"</span>?</p>
        <form onSubmit={handleSubmit}>
          <div className="relative w-full mb-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">{goal.currency === 'USD' ? '$' : 'R$'}</span>
            <input
              type="number" min="0" step="any" onKeyDown={blockInvalidChars} value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null) }}
              autoFocus placeholder="0.00"
              className={`w-full appearance-none rounded-2xl bg-slate-950 py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:ring-1 ${isDeposit ? 'focus:ring-cyan-500/50' : 'focus:ring-rose-500/50'} ${error ? 'border border-rose-500' : ''}`}
            />
          </div>
          {error && <p className="text-xs font-medium text-rose-500 mb-4 px-1">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white">Cancelar</button>
            <button type="submit" disabled={isSaving} className={`flex-1 rounded-xl py-3 font-bold text-white ${isDeposit ? 'bg-cyan-500' : 'bg-rose-500'}`}>
              {isSaving ? 'Aguarde...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
