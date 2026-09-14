import { useState } from 'react'
import { Modal } from './Modal'

type ForcarNovaModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
}

export function ForcarNovaModal({ open, onClose, onConfirm }: ForcarNovaModalProps) {
  const [motivo, setMotivo] = useState('')

  function handleConfirm() {
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
    setMotivo('')
  }

  function handleClose() {
    setMotivo('')
    onClose()
  }

  return (
    <Modal open={open} title="Forçar nova consulta" onClose={handleClose}>
      <p className="text-sm text-[#888] mb-4 leading-relaxed">
        Uma nova consulta será cobrada <span className="text-[#bbb]">(~R$ 2,34)</span>. Informe o motivo:
      </p>
      <textarea
        rows={3}
        placeholder="Ex.: documento atualizado, suspeita de fraude..."
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        className="w-full bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111]
                   placeholder:text-[#ccc] resize-none
                   focus:outline-none focus:border-[#bbb]
                   transition-colors"
      />
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-[#aaa] hover:text-[#666] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!motivo.trim()}
          className="px-4 py-2 text-sm font-semibold bg-[#aa0000] text-white rounded-lg
                     hover:bg-[#cc0000] disabled:opacity-30 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
