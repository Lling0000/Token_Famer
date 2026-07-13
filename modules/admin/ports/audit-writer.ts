export interface AuditRecord {
  actorId: string;
  action: string;
  target: string;
  reason: string;
  before: unknown;
  after: unknown;
  occurredAt: Date;
}

export interface AuditWriter {
  append(record: AuditRecord): Promise<void>;
}
