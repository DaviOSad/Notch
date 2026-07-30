export default function ErrorDialog({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full mx-4 max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl border border-rose-500/20 animate-in zoom-in-95">
        <h3 className="mb-2 text-xl font-bold text-rose-500">Atenção</h3>
        <p className="mb-6 text-sm text-slate-300 leading-relaxed">{message}</p>
        <button onClick={onClose} className="w-full rounded-xl bg-slate-800 py-3 font-semibold text-white">Entendi</button>
      </div>
    </div>
  )
}
