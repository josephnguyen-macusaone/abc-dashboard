/**
 * Date serialization for filters/API using local calendar date.
 * Using toISOString().split('T')[0] yields UTC date, which can show the wrong
 * day (e.g. March 1 00:00 local in Asia becomes 2026-02-28 UTC and displays as Feb 28).
 */

/** Format a Date as YYYY-MM-DD in local time (for storing/sending date-only values). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string as local midnight (for display/filter state from stored strings). */
export function parseLocalDateString(s: string): Date {
  const [y, m, d] = s.split("-").map((part) => parseInt(part, 10));
  return new Date(y, m - 1, d);
}
