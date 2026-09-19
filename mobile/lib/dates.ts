/** Parses API timestamps. Several endpoints send Postgres `::text`
 *  ("2026-09-19 10:46:12.5+00"), which Hermes' Date rejects — it needs the
 *  "T" separator and a "+00:00" offset. ISO strings pass through unchanged. */
export function parseDate(s: string): Date {
  return new Date(s.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
}
