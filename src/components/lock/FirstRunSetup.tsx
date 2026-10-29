import { useLock } from '../../hooks/useLock';
import { LockLayout } from './LockLayout';
import { PinSetup } from './PinSetup';

/** Premier lancement : création du code secret (ou « Plus tard »). */
export function FirstRunSetup() {
  const { savePin, skipSetup } = useLock();
  return (
    <LockLayout
      eyebrow="Bienvenue 👋"
      title="Protégez vos dépenses"
      subtitle="Ce code sera demandé à chaque ouverture de l'application."
      footer={
        <button
          type="button"
          onClick={skipSetup}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-emerald-50 hover:bg-white/10"
        >
          Plus tard
        </button>
      }
    >
      <PinSetup onDone={savePin} tone="brand" />
    </LockLayout>
  );
}
