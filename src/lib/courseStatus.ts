/** Shared lifecycle policy. Date-only values use the organisation's timezone. */
export type Lifecycle = 'Draft' | 'Upcoming' | 'Ongoing' | 'Completed' | 'Archived';
export function dateBoundary(value?: string, end = false): number | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const utc = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0,10) !== value) return undefined;
  }
  const zoned = !dateOnly && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value}+05:30` : value;
  const parsed = Date.parse(dateOnly ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}+05:30` : zoned);
  return Number.isFinite(parsed) ? parsed : undefined;
}
export function getEffectiveStatus(record: any, now = Date.now()): Lifecycle {
  if (!record) return 'Draft';
  const stored = record.storedStatus || record.status;
  if (record.publicationState === 'draft' || stored === 'Draft') return 'Draft';
  if (record.publicationState === 'archived' || stored === 'Archived' || stored === 'Closed') return 'Archived';
  const start = dateBoundary(record.startDate);
  const end = dateBoundary(record.endDate || (record.startDate && /^\d{4}-\d{2}-\d{2}$/.test(record.startDate) ? record.startDate : undefined), true);
  if (end !== undefined && now > end) return 'Completed';
  if (start !== undefined && now < start) return 'Upcoming';
  if (start !== undefined && end !== undefined && now >= start && now <= end) return 'Ongoing';
  if (start !== undefined && end === undefined && now >= start) return 'Ongoing';
  const manual = record.lifecycle || stored;
  if (['Upcoming', 'Ongoing', 'Completed'].includes(manual)) return manual;
  if (['Enrollment Open', 'Coming Soon', 'Enrolling Soon'].includes(manual)) return 'Upcoming';
  // Publication alone is not evidence that an activity is running.
  return 'Upcoming';
}
export function isNoticeVisible(item: any, now = Date.now()) {
  if (item.deleted || item.showInBulletin === false || ['Draft', 'Trash', 'Archived', 'Closed'].includes(item.status)) return false;
  const publish = dateBoundary(item.publishAt);
  const expires = dateBoundary(item.expiresAt, true);
  return (publish === undefined || publish <= now) && (expires === undefined || expires >= now);
}
/** Projects may be open-ended; a start date alone must not complete them that evening. */
export function getProjectStatus(record: any, now = Date.now()): Lifecycle | 'Suspended' {
  const status = record.storedStatus || record.status;
  const manual = getEffectiveStatus({ ...record, status, storedStatus: status, startDate: undefined, endDate: undefined }, now);
  if (['Draft','Archived'].includes(manual)) return manual;
  if (status === 'Suspended') return 'Suspended';
  const start = dateBoundary(record.startDate);
  const end = dateBoundary(record.endDate, true);
  if (end === undefined && manual === 'Completed') return 'Completed';
  if (end !== undefined && now > end) return 'Completed';
  if (start !== undefined && now < start) return 'Upcoming';
  if (start !== undefined && now >= start) return 'Ongoing';
  return manual;
}
