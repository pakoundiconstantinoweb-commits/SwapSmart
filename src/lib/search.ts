/** Escape special chars for PostgREST ilike filters inside .or() */
export function toIlikePattern(term: string): string {
  const cleaned = term
    .trim()
    .replace(/[%_]/g, "")
    .replace(/,/g, " ")
    .slice(0, 80);
  if (!cleaned) return "";
  return `"%${cleaned.replace(/"/g, "")}%"`;
}
