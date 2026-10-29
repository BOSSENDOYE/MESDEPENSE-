import { BackupSection } from '../components/settings/BackupSection';
import { CategoryManager } from '../components/settings/CategoryManager';
import { OfflineStatus } from '../components/settings/OfflineStatus';
import { RecurringManager } from '../components/settings/RecurringManager';
import { PageHeader, mutedText } from '../components/ui';

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Réglages" />
      <OfflineStatus />
      <CategoryManager />
      <RecurringManager />
      <BackupSection />
      <p className={`px-2 text-center text-xs ${mutedText}`}>
        Mes Dépenses · données stockées uniquement sur cet appareil, fonctionne hors-ligne.
      </p>
    </div>
  );
}
