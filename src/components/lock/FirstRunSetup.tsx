import { useLock } from '../../hooks/useLock';
import { LockLayout } from './LockLayout';
import { PinSetup } from './PinSetup';

/** Premier lancement : création du code secret (ou « Plus tard »). */
export function FirstRunSetup() {
  const { savePin, skipSetup } = useLock();
  return (
    <LockLayout
      title="Bienvenue 👋"
      subtitle="Créez un code secret : il sera demandé à chaque ouverture pour protéger vos dépenses."
      footer={
        <button type="button" onClick={skipSetup} className="min-h-11 px-3 text-sm font-semibold text-emerald-50 underline">
          Plus tard (activable dans Réglages)
        </button>
      }
    >
      <PinSetup onDone={savePin} tone="brand" />
    </LockLayout>
  );
}
