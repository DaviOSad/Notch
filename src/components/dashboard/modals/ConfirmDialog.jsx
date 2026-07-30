export default function ConfirmDialog({ title, message, isBusy, onCancel, onConfirm, confirmLabel = 'Excluir' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full mx-4 max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
        <p className="mb-6 text-sm text-slate-300">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white">Cancelar</button>
          <button onClick={onConfirm} disabled={isBusy} className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white">{isBusy ? 'Aguarde...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
