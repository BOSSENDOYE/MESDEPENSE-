import { useState } from 'react';
import { deleteDatabase } from '../../db/database';
import { clearAllLocalData } from '../../utils/storage';
import { normalizeText } from '../../utils/text';
import { Modal } from '../Modal';
import { Button, FieldError, inputClass, labelClass } from '../ui';

const CONFIRM_WORD = 'EFFACER';

/** Code oublié : la seule issue est d'effacer les données de ce téléphone (puis restaurer une sauvegarde). */
export function ForgotPinDialog({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = normalizeText(typed) === normalizeText(CONFIRM_WORD);

  async function wipe() {
    setBusy(true);
    setError(null);
    try {
      await deleteDatabase();
      clearAllLocalData();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("L'effacement a échoué. Fermez les autres onglets de l'application puis réessayez.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Code oublié"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button variant="danger" block onClick={() => void wipe()} disabled={!confirmed || busy}>
            {busy ? 'Effacement…' : 'Tout effacer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p>
          Pour protéger vos dépenses, le code ne peut pas être récupéré. La seule solution est d'
          <strong>effacer toutes les données de l'application sur ce téléphone</strong>.
        </p>
        <p>
          Ensuite, vous pourrez créer un nouveau code et récupérer vos dépenses avec{' '}
          <strong>Réglages → Restaurer une sauvegarde</strong>, si vous avez un fichier de sauvegarde JSON.
        </p>
        <div>
          <label htmlFor="confirmation-effacement" className={labelClass}>
            Tapez {CONFIRM_WORD} pour confirmer
          </label>
          <input
            id="confirmation-effacement"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Modal>
  );
}
