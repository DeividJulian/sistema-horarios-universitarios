import { parseAiText } from './ai';

describe('parseAiText', () => {
  it('reads titles, paragraphs, bullets and numbered lists', () => {
    const blocks = parseAiText(
      '## Resumen\nEl horario está completo.\n\n## Causas\n- Juan Pérez tiene pocas horas\n- Falta un laboratorio\n\n## Sugerencias\n1. Agrega disponibilidad\n2. Crea un aula',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'heading', 'bullets', 'heading', 'numbers']);
    expect(blocks[3]).toEqual({
      kind: 'bullets',
      items: [[{ text: 'Juan Pérez tiene pocas horas', bold: false }], [{ text: 'Falta un laboratorio', bold: false }]],
    });
    expect(blocks[5].kind === 'numbers' && blocks[5].items.length).toBe(2);
  });

  it('marks **bold** text without using HTML', () => {
    const [block] = parseAiText('Revisa a **Juan Pérez** en Gestión <script>');
    expect(block).toEqual({
      kind: 'paragraph',
      segments: [
        { text: 'Revisa a ', bold: false },
        { text: 'Juan Pérez', bold: true },
        { text: ' en Gestión <script>', bold: false },
      ],
    });
  });
});
