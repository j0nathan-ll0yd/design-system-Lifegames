import { ENDPOINTS } from '@lifegames/portal-contract/constants';

// Display contract shared by the consumer-owned poll engine (which produces the
// status) and the DS-owned `updaters-status` presentational updater (which renders
// it). It lives in the DS because a staying presentational updater depends on it;
// the data/transport/orchestration layer that fulfils it lives in the web app.
export type ResourceKey = keyof typeof ENDPOINTS;

export interface PollStatus {
  connected: boolean;
  lastPollAt: string | null;
  errorCounts: Partial<Record<ResourceKey, number>>;
  wsConnected?: boolean;
}
