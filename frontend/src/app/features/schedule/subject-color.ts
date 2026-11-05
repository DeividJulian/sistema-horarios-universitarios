// A subject keeps the same colour in every view: one of eight hues (tinted fill, light ink and a saturated edge)
const PAIRS = 8;

export function subjectTone(subjectId: number): number {
  return (subjectId % PAIRS) + 1;
}

/** CSS custom properties of the subject colour, for example var(--s3), var(--s3-ink) and var(--s3-edge). */
export function subjectColor(subjectId: number): { fill: string; ink: string; edge: string } {
  const n = subjectTone(subjectId);
  return { fill: `var(--s${n})`, ink: `var(--s${n}-ink)`, edge: `var(--s${n}-edge)` };
}
