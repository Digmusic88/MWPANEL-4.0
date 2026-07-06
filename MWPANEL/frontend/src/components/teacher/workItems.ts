export type WorkKind = 'tarea' | 'test' | 'actividad';

export interface WorkItem {
  id: string;
  kind: WorkKind;
  title: string;
  context: string;                       // tasks: "Asignatura · Grupo"; activities: "Grupo"
  valuationType: 'emoji' | 'score' | 'rubric';
  date: string | null;                   // tasks: dueDate; activities: assignedDate
  status: string;                        // tasks: status; activities: active|archived
  href: string;                          // management page for this kind
}

// Merge the two existing teacher list endpoints into one normalized, date-sorted list.
export function toWorkItems(rawTasks: any[], rawActivities: any[]): WorkItem[] {
  const taskItems: WorkItem[] = (rawTasks || []).map((t) => {
    const isTest = !!t.isTestYourself;
    const subject = t.subjectAssignment?.subject?.name;
    const group = t.subjectAssignment?.classGroup?.name;
    return {
      id: t.id,
      kind: isTest ? 'test' : 'tarea',
      title: t.title,
      context: [subject, group].filter(Boolean).join(' · '),
      valuationType: t.valuationType,
      date: t.dueDate ?? null,
      status: t.status,
      href: isTest ? '/teacher/test-yourself' : '/teacher/tasks',
    };
  });

  const activityItems: WorkItem[] = (rawActivities || []).map((a) => {
    const subject = a.subjectAssignment?.subject?.name;
    const group = a.classGroup?.name;
    return {
      id: a.id,
      kind: 'actividad' as const,
      title: a.name,
      context: [subject, group].filter(Boolean).join(' · '),
      valuationType: a.valuationType,
      date: a.assignedDate ?? null,
      status: a.isArchived ? 'archived' : 'active',
      href: '/teacher/activities',
    };
  });

  return [...taskItems, ...activityItems].sort((x, y) => {
    if (!x.date && !y.date) return 0;
    if (!x.date) return 1;
    if (!y.date) return -1;
    return y.date.localeCompare(x.date); // ISO strings → descending
  });
}
