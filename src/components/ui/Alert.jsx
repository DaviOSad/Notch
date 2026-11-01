import { AlertCircle, CheckCircle2, X } from 'lucide-react'

const TONES = {
  error: { Icon: AlertCircle, classes: 'border-saida/30 bg-saida/10 text-saida', role: 'alert' },
  success: { Icon: CheckCircle2, classes: 'border-entrada/30 bg-entrada/10 text-entrada', role: 'status' },
}

// Mensagem em linha (erro ou sucesso). Com `onDismiss` ganha um botão de fechar.
export default function Alert({ tone = 'error', onDismiss, className = '', children }) {
  const { Icon, classes, role } = TONES[tone]

  return (
    <div role={role} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${classes} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Fechar aviso" className="-mr-1 shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
