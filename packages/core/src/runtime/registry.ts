import type { InsightRecord } from "@insight-flow/protocol";

export class InsightRegistry {
  private readonly records = new Map<string, InsightRecord>();

  upsert(record: InsightRecord): void {
    this.records.set(record.identity.id, record);
  }

  remove(identityId: string): void {
    this.records.delete(identityId);
  }

  get(identityId: string): InsightRecord | undefined {
    return this.records.get(identityId);
  }

  list(): InsightRecord[] {
    return Array.from(this.records.values());
  }

  has(identityId: string): boolean {
    return this.records.has(identityId);
  }
}
