/** GET /ai/status: whether the server has ANTHROPIC_API_KEY. */
export interface AiStatus {
  disponible: boolean;
  modelo: string | null;
}

/** POST /ai/explain */
export interface AiExplanation {
  explicacion: string;
  modelo: string;
}

/** A piece of a line: plain or bold text. */
export interface AiSegment {
  text: string;
  bold: boolean;
}

/** The answer split into blocks that the template renders safely (no innerHTML). */
export type AiBlock =
  | { kind: 'heading'; segments: AiSegment[] }
  | { kind: 'paragraph'; segments: AiSegment[] }
  | { kind: 'bullets'; items: AiSegment[][] }
  | { kind: 'numbers'; items: AiSegment[][] };

function segments(line: string): AiSegment[] {
  // **bold** marks alternate: odd parts are bold
  return line
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((s) => s.text.length > 0);
}

/** Turns Claude's light Markdown (titles, bullets, numbered lists, bold) into blocks. */
export function parseAiText(text: string): AiBlock[] {
  const blocks: AiBlock[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const number = line.match(/^\d+[.)]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (heading) {
      blocks.push({ kind: 'heading', segments: segments(heading[1]) });
    } else if (bullet) {
      if (last?.kind === 'bullets') last.items.push(segments(bullet[1]));
      else blocks.push({ kind: 'bullets', items: [segments(bullet[1])] });
    } else if (number) {
      if (last?.kind === 'numbers') last.items.push(segments(number[1]));
      else blocks.push({ kind: 'numbers', items: [segments(number[1])] });
    } else {
      blocks.push({ kind: 'paragraph', segments: segments(line) });
    }
  }
  return blocks;
}
