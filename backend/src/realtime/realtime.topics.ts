// backend/src/realtime/realtime.topics.ts
export type ChangeTopic = string;

// Topics gruesos por entidad. Varias tablas pueden compartir topic
// (p.ej. charges/payments -> 'payments' porque refrescan la misma matriz).
const TABLE_TO_TOPIC: Record<string, ChangeTopic> = {
  students: 'students',
  families: 'families',
  guardians: 'families',
  enrollments: 'enrollments',
  groups: 'groups',
  schedule_slots: 'schedule_slots',
  rooms: 'schedule_slots',
  apoyo_assignments: 'apoyo',
  apoyo_slots: 'apoyo',
  attendance: 'attendance',
  task_records: 'tareas',
  payments: 'payments',
  charges: 'payments',
  payment_allocations: 'payments',
  sepa_batches: 'sepa',
  bank_accounts: 'sepa',
  student_documents: 'documents',
  document_types: 'documents',
  level_tests: 'level_tests',
  exam_sessions: 'examenes',
  exam_candidates: 'examenes',
  events: 'eventos',
  meeting_sheets: 'meetings',
  meeting_items: 'meetings',
  notebook_entries: 'notebook',
  notebook_sections: 'notebook',
  raffle_campaigns: 'raffles',
  raffle_books: 'raffles',
  taper_usage: 'taper',
  danza_assignments: 'danza',
  danza_fee_tiers: 'danza',
};

export const ALL_TOPICS: readonly string[] = Array.from(new Set(Object.values(TABLE_TO_TOPIC)));

/** All table names that appear in the table→topic map. */
export const ALL_SOURCE_TABLES: readonly string[] = Object.keys(TABLE_TO_TOPIC);

export function topicForTable(tableName: string): ChangeTopic | null {
  return Object.prototype.hasOwnProperty.call(TABLE_TO_TOPIC, tableName)
    ? TABLE_TO_TOPIC[tableName]
    : null;
}

export function isValidTopic(topic: string): boolean {
  return ALL_TOPICS.includes(topic);
}

/**
 * Returns the list of topics for which NONE of their source tables appears in
 * `triggeredTables`. A topic is "covered" if at least one of its source tables
 * fires a NOTIFY. Result is sorted and deduplicated.
 */
export function topicsWithoutTrigger(triggeredTables: string[]): string[] {
  const triggeredSet = new Set(triggeredTables);
  const missing = new Set<string>();
  for (const topic of ALL_TOPICS) {
    // Collect all source tables mapped to this topic
    const sources = Object.entries(TABLE_TO_TOPIC)
      .filter(([, t]) => t === topic)
      .map(([table]) => table);
    // If none of the source tables is in triggeredSet, the topic is missing
    const covered = sources.some((table) => triggeredSet.has(table));
    if (!covered) missing.add(topic);
  }
  return Array.from(missing).sort();
}
