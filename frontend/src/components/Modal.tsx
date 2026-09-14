import { useEffect } from 'react'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="animate-fade-up bg-white border border-[#e8e8e8] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-[0.15em] mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
