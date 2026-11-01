import Modal from '../../ui/Modal'

export default function ConfirmDialog({ title, message, isBusy, onCancel, onConfirm, confirmLabel = 'Excluir' }) {
  return (
    <Modal variant="dialog" z="z-[60]" title={title} onClose={onCancel}>
      <p className="mb-6 text-sm leading-relaxed text-neblina">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-neutro flex-1">Cancelar</button>
        <button onClick={onConfirm} disabled={isBusy} className="btn-perigo flex-1">{isBusy ? 'Aguarde...' : confirmLabel}</button>
      </div>
    </Modal>
  )
}
