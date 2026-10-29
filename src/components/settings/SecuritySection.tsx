import { useEffect, useState } from 'react';
import { useLock } from '../../hooks/useLock';
import { useToast } from '../../hooks/useToast';
import { useUserName } from '../../hooks/useUserName';
import { biometricName, describeBiometricError, isAppleDevice, isBiometricAvailable } from '../../utils/biometric';
import { FaceIdIcon, FingerprintIcon } from '../Icons';
import { AUTO_LOCK_CHOICES } from '../../utils/storage';
import { PinMessage, PinPad } from '../lock/PinPad';
import { PinSetup } from '../lock/PinSetup';
import { Modal } from '../Modal';
import { Button, Card, inputClass, labelClass, mutedText } from '../ui';

type Dialog = null | 'create' | 'verify-change' | 'change' | 'verify-disable' | 'verify-biometric' | 'enable-biometric';

export function SecuritySection() {
  const {
    pinLength,
    savePin,
    disablePin,
    lockNow,
    autoLockSeconds,
    setAutoLockSeconds,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useLock();
  const [userName] = useUserName();
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const enabled = pinLength !== null;
  const bioName = biometricName();
  const BiometricIcon = isAppleDevice() ? FaceIdIcon : FingerprintIcon;

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Appelé directement par le toucher sur le bouton : Safari l'exige pour Face ID.
  async function enroll() {
    setEnrolling(true);
    setBiometricError(null);
    try {
      await enableBiometric(userName);
      setDialog(null);
      showToast('Déverrouillage biométrique activé.');
    } catch (err) {
      console.error(err);
      setBiometricError(describeBiometricError(err));
    } finally {
      setEnrolling(false);
    }
  }

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
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <BiometricIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Déverrouiller avec {bioName}</p>
                <p className={`text-sm ${mutedText}`}>
                  {biometricAvailable === false
                    ? 'Non disponible sur ce téléphone ou ce navigateur.'
                    : biometricEnabled
                      ? 'Activé. Le code reste utilisable en secours.'
                      : 'Plus rapide que le code, qui reste disponible.'}
                </p>
              </div>
              {biometricAvailable && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={biometricEnabled}
                  aria-label={`Déverrouiller avec ${bioName}`}
                  onClick={() => {
                    if (biometricEnabled) {
                      disableBiometric();
                      showToast('Déverrouillage biométrique désactivé.');
                    } else {
                      setBiometricError(null);
                      setDialog('verify-biometric');
                    }
                  }}
                  className="flex h-11 w-14 shrink-0 items-center justify-center"
                >
                  <span
                    className={`relative h-7 w-12 rounded-full transition-colors ${biometricEnabled ? 'bg-emerald-700 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all dark:bg-slate-950 ${biometricEnabled ? 'left-6' : 'left-1'}`}
                    />
                  </span>
                </button>
              )}
            </div>
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

      {dialog === 'enable-biometric' && (
        <Modal
          title="Déverrouillage biométrique"
          onClose={() => setDialog(null)}
          footer={
            <Button block onClick={() => void enroll()} disabled={enrolling}>
              <BiometricIcon width={22} height={22} /> {enrolling ? 'En attente du téléphone…' : 'Activer maintenant'}
            </Button>
          }
        >
          <div className="space-y-3">
            <p>
              Votre téléphone va vous demander {isAppleDevice() ? 'Face ID ou Touch ID' : 'votre empreinte (ou votre visage)'}{' '}
              pour l'associer à Mes Dépenses.
            </p>
            <p className={`text-sm ${mutedText}`}>
              Rien ne quitte votre téléphone : l'application garde seulement une clé créée par le téléphone. Votre code
              secret reste utilisable à tout moment.
            </p>
            {biometricError && <PinMessage kind="error">{biometricError}</PinMessage>}
          </div>
        </Modal>
      )}

      {(dialog === 'verify-change' || dialog === 'verify-disable' || dialog === 'verify-biometric') && (
        <VerifyPinModal
          title={
            dialog === 'verify-change' ? 'Code actuel' : dialog === 'verify-disable' ? 'Désactiver le code' : 'Déverrouillage biométrique'
          }
          onClose={() => setDialog(null)}
          onVerified={() => {
            if (dialog === 'verify-change') {
              setDialog('change');
            } else if (dialog === 'verify-biometric') {
              setDialog('enable-biometric');
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
            <PinMessage kind="error">
              {error}
            </PinMessage>
          ) : null
        }
      />
    </Modal>
  );
}
