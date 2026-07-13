import type { LeaderboardBoard } from '../domain/score';

export interface ScoreEvent {
  eventId: string;
  userId: string;
  board: LeaderboardBoard;
  scoreDelta: bigint;
  occurredAt: Date;
}

export interface ScoreEventSource {
  pullBatch(limit: number): Promise<readonly ScoreEvent[]>;
  acknowledge(eventIds: readonly string[]): Promise<void>;
}
