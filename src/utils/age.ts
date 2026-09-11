/**
 * PATIENT_AGE comes from the backend as a full "60 Y 2 M 4 D"-style string.
 * Simplify it to just the most significant unit: years if there's at least
 * one full year, else months, else days (for infants under a month old).
 */
export function simplifyAge(raw: string): string {
  if (!raw) return raw;

  const years = Number(/(\d+)\s*Y/i.exec(raw)?.[1] ?? 0);
  const months = Number(/(\d+)\s*M/i.exec(raw)?.[1] ?? 0);
  const days = Number(/(\d+)\s*D/i.exec(raw)?.[1] ?? 0);

  if (years > 0) return `${years} Y`;
  if (months > 0) return `${months} M`;
  if (days > 0) return `${days} D`;
  return raw;
}
