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
      caption="Ce code sera demandé à chaque ouverture."
      footer={
        <button
          type="button"
          onClick={skipSetup}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          Plus tard
        </button>
      }
    >
      <PinSetup onDone={savePin} />
    </LockLayout>
  );
}
