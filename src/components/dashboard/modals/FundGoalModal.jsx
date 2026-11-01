import { useState } from 'react'
import Modal from '../../ui/Modal'
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
    <Modal variant="dialog" z="z-[60]" title={isDeposit ? 'Adicionar Saldo' : 'Retirar Saldo'} onClose={onClose}>
      <p className="mb-5 text-sm leading-relaxed text-neblina">
        Qual valor você deseja {isDeposit ? 'alocar na' : 'retirar da'} meta <span className="font-bold text-tinta">"{goal.name}"</span>?
      </p>
      <form onSubmit={handleSubmit}>
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-neblina">{goal.currency === 'USD' ? '$' : 'R$'}</span>
          <input
            type="number" min="0" step="any" onKeyDown={blockInvalidChars} value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null) }}
            autoFocus placeholder="0.00"
            aria-label="Valor"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'fund-erro' : undefined}
            className="campo !py-4 !pl-12 font-display !text-2xl font-bold"
          />
        </div>
        {error && <p id="fund-erro" className="texto-erro mt-2">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-neutro flex-1">Cancelar</button>
          <button type="submit" disabled={isSaving} className={`flex-1 ${isDeposit ? 'btn-primario' : 'btn-perigo'}`}>
            {isSaving ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
