import { useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { useToast } from '../../hooks/useToast';
import { AUTO_LOCK_CHOICES } from '../../utils/storage';
import { PinMessage, PinPad } from '../lock/PinPad';
import { PinSetup } from '../lock/PinSetup';
import { Modal } from '../Modal';
import { Button, Card, inputClass, labelClass, mutedText } from '../ui';

type Dialog = null | 'create' | 'verify-change' | 'change' | 'verify-disable';

export function SecuritySection() {
  const { pinLength, savePin, disablePin, lockNow, autoLockSeconds, setAutoLockSeconds } = useLock();
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const enabled = pinLength !== null;

  return (
    <Card>
      <h2 className="text-lg font-semibold">Sécurité</h2>
      {enabled ? (
        <>
          <p className="mt-2 font-semibold">✅ Code secret activé</p>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Le code est demandé à l'ouverture et après un passage en arrière-plan.
          </p>
          <div className="mt-3">
            <label htmlFor="delai-verrouillage" className={labelClass}>
              Verrouillage automatique
            </label>
            <select
              id="delai-verrouillage"
              value={autoLockSeconds}
              onChange={(e) => setAutoLockSeconds(Number(e.target.value))}
              className={`${inputClass} mt-1`}
            >
              {AUTO_LOCK_CHOICES.map((c) => (
                <option key={c.seconds} value={c.seconds}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2">
            <Button onClick={lockNow}>🔒 Verrouiller maintenant</Button>
            <Button variant="secondary" onClick={() => setDialog('verify-change')}>
              Modifier le code
            </Button>
            <Button variant="secondary" onClick={() => setDialog('verify-disable')}>
              Désactiver le code
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Protégez l'accès à vos dépenses avec un code secret de 4 à 6 chiffres, demandé à chaque ouverture.
          </p>
          <Button className="mt-3" block onClick={() => setDialog('create')}>
            Activer un code secret
          </Button>
        </>
      )}
      <p className={`mt-3 text-xs ${mutedText}`}>
        Le code bloque l'accès à l'application ; il n'est jamais enregistré en clair. En cas d'oubli, il faudra effacer les
        données du téléphone : gardez une sauvegarde JSON à jour.
      </p>

      {(dialog === 'create' || dialog === 'change') && (
        <Modal title={dialog === 'create' ? 'Activer un code' : 'Nouveau code'} onClose={() => setDialog(null)}>
          <PinSetup
            onDone={async (pin) => {
              await savePin(pin);
              setDialog(null);
              showToast(dialog === 'create' ? 'Code secret activé.' : 'Code modifié.');
            }}
          />
        </Modal>
      )}

      {(dialog === 'verify-change' || dialog === 'verify-disable') && (
        <VerifyPinModal
          title={dialog === 'verify-change' ? 'Code actuel' : 'Désactiver le code'}
          onClose={() => setDialog(null)}
          onVerified={() => {
            if (dialog === 'verify-change') {
              setDialog('change');
            } else {
              disablePin();
              setDialog(null);
              showToast('Code secret désactivé.');
            }
          }}
        />
      )}
    </Card>
  );
}

function VerifyPinModal({ title, onClose, onVerified }: { title: string; onClose: () => void; onVerified: () => void }) {
  const { checkPin, pinLength } = useLock();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit(pin: string) {
    setBusy(true);
    const result = await checkPin(pin);
    setBusy(false);
    if (result.ok) {
      onVerified();
      return;
    }
    setValue('');
    setError(result.error);
    setErrorKey((k) => k + 1);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <PinPad
        value={value}
        onChange={(v) => {
          setValue(v);
          setError(null);
        }}
        length={pinLength}
        onComplete={(pin) => void submit(pin)}
        disabled={busy}
        label="Code actuel"
        errorKey={errorKey}
        error={error !== null && value.length === 0}
        heading="Saisissez votre code actuel"
        message={
          error ? (
            <PinMessage tone="neutral" kind="error">
              {error}
            </PinMessage>
          ) : null
        }
      />
    </Modal>
  );
}
