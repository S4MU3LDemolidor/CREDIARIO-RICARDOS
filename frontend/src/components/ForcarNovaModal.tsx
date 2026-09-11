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
      <p className="text-sm text-gray-600 mb-3">
        Uma nova consulta sera cobrada (~R$ 2,34). Informe o motivo:
      </p>
      <textarea
        rows={3}
        placeholder="Ex.: documento atualizado, suspeita de fraude..."
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!motivo.trim()}
          className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg
                     hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          Confirmar nova consulta
        </button>
      </div>
    </Modal>
  )
}
