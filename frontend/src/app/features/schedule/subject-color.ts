// A subject keeps the same colour in every view: one of the eight «Plano» pairs (soft fill + dark ink of the same hue)
const PAIRS = 8;

export function subjectTone(subjectId: number): number {
  return (subjectId % PAIRS) + 1;
}

/** CSS custom properties of the subject colour, for example var(--s3) and var(--s3-ink). */
export function subjectColor(subjectId: number): { fill: string; ink: string } {
  const n = subjectTone(subjectId);
  return { fill: `var(--s${n})`, ink: `var(--s${n}-ink)` };
}
