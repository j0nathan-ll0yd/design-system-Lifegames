import type { ResourceKey } from '@lifegames/portal-contract/constants';

// PollStatus is the display contract: produced by the consumer-owned poll engine and
// rendered by the DS-owned `updaters-status` presentational updater. `ResourceKey` now
// lives in @lifegames/portal-contract (it is `keyof typeof ENDPOINTS`, owned alongside
// ENDPOINTS); it is referenced here only to type `errorCounts`.
export interface PollStatus {
  connected: boolean;
  lastPollAt: string | null;
  errorCounts: Partial<Record<ResourceKey, number>>;
  wsConnected?: boolean;
}
