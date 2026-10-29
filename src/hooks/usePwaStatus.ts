import { useSyncExternalStore } from 'react';
import { getOfflineState, getOnline, subscribePwa, type OfflineState } from '../pwa';

export function usePwaStatus(): { offlineState: OfflineState; online: boolean } {
  const offlineState = useSyncExternalStore(subscribePwa, getOfflineState);
  const online = useSyncExternalStore(subscribePwa, getOnline);
  return { offlineState, online };
}
