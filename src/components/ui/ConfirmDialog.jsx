import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title=" " size="sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center">
          <AlertTriangle size={22} className="text-[#DC2626]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
          {message && <p className="mt-1 text-sm text-[#475569]">{message}</p>}
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
