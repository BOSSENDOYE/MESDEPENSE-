import { useState } from 'react';
import { Modal } from './Modal';
import { Button, FieldError } from './ui';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error(err);
      setError("L'opération a échoué. Réessayez.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={() => void handleConfirm()} disabled={busy}>
            {busy ? 'Patientez…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-base">{message}</p>
      {error && <FieldError>{error}</FieldError>}
    </Modal>
  );
}
