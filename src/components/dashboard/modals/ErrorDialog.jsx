import Modal from '../../ui/Modal'

export default function ErrorDialog({ message, onClose }) {
  return (
    <Modal variant="dialog" z="z-[70]" title="Atenção" titleClassName="text-saida" onClose={onClose}>
      <p className="mb-6 text-sm leading-relaxed text-neblina">{message}</p>
      <button onClick={onClose} className="btn-primario w-full">Entendi</button>
    </Modal>
  )
}
