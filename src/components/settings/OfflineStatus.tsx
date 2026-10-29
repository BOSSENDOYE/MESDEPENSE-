import { usePwaStatus } from '../../hooks/usePwaStatus';
import type { OfflineState } from '../../pwa';
import { Card, mutedText } from '../ui';

const MESSAGES: Record<OfflineState, { icon: string; title: string; text: string }> = {
  ready: {
    icon: '✅',
    title: 'Prête hors-ligne',
    text: "L'application est enregistrée sur ce téléphone : elle s'ouvre et fonctionne sans Internet.",
  },
  preparing: {
    icon: '⏳',
    title: 'Préparation du mode hors-ligne…',
    text: "Gardez Internet activé quelques secondes, jusqu'à l'affichage de « Prête hors-ligne ».",
  },
  error: {
    icon: '⚠️',
    title: 'Mode hors-ligne indisponible',
    text: "Le navigateur a refusé l'installation. Ouvrez le site dans Chrome (Android) ou Safari (iPhone), hors navigation privée, puis rechargez la page.",
  },
  unsupported: {
    icon: 'ℹ️',
    title: 'Mode hors-ligne non actif ici',
    text: "Il s'active sur la version déployée (Netlify) ou avec « npm run preview », pas en développement.",
  },
};

export function OfflineStatus() {
  const { offlineState, online } = usePwaStatus();
  const message = MESSAGES[offlineState];
  return (
    <Card>
      <h2 className="text-lg font-semibold">Mode hors-ligne</h2>
      <p className="mt-2 flex items-center gap-2 font-semibold" role="status">
        <span aria-hidden="true">{message.icon}</span> {message.title}
      </p>
      <p className={`mt-1 text-sm ${mutedText}`}>{message.text}</p>
      <p className={`mt-2 text-sm ${mutedText}`}>Réseau actuel : {online ? 'connecté' : 'aucune connexion'}.</p>
    </Card>
  );
}
