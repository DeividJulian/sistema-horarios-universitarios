// Soft pastel family: a subject keeps the same colour in every view (fill and border are derived from it in the CSS)
const SUBJECT_COLORS = ['#60a5fa', '#4ade80', '#a78bfa', '#2dd4bf', '#f472b6', '#38bdf8', '#c084fc', '#86efac'];

export function subjectColor(subjectId: number): string {
  return SUBJECT_COLORS[subjectId % SUBJECT_COLORS.length];
}
