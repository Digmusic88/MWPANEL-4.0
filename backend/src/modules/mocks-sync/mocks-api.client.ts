import { Injectable } from '@nestjs/common';
import { DesiredGroup, DesiredExamCall } from './desired-state';

export type ReconcileReport = {
  academicYearId: number;
  groups: { externalId: string; mockGroupId: number }[];
  students: { externalId: string; mockUserId: number }[];
  examCalls?: { externalId: string; mockExamCallId: number }[];
  created: number;
  renamed: number;
  enrolled: number;
  unenrolled: number;
  adopted: number;
  examCallsCreated?: number;
  examCallsLinked?: number;
  incidencias: string[];
};

@Injectable()
export class MocksApiClient {
  private readonly url = process.env.MOCKS_SYNC_URL || 'http://cambridge-mocks-app:3001';
  private readonly key = process.env.MOCKS_SYNC_KEY || '';

  async reconcile(payload: { academicYear: string; groups: DesiredGroup[]; examCalls?: DesiredExamCall[] }): Promise<ReconcileReport> {
    const res = await fetch(`${this.url}/api/sync/reconcile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sync-key': this.key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mocks reconcile HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as ReconcileReport;
  }
}
