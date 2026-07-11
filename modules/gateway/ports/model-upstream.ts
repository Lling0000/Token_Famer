import type { TokenAmount } from '@token-farmer/primitives';

import type { ApiUsage } from '../domain/api-charge';

export interface ModelRequest {
  readonly requestId: string;
  readonly modelId: string;
  readonly body: unknown;
}

export interface ModelResponse {
  readonly body: unknown;
  readonly usage: ApiUsage;
}

export interface UsageReservationEstimate {
  readonly maximumCharge: TokenAmount;
}

export interface ModelUpstream {
  invoke(request: ModelRequest): Promise<ModelResponse>;
}
