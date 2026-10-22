import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../../core/api/api-url';
import { AiService } from '../../../core/api/ai.service';
import { ConflictOption, ConflictSuggestion } from '../../../core/models';
import { ConflictAdvisor } from './conflict-advisor';

const STATUS = { configurada: true, proveedor: 'groq', nombre_proveedor: 'Groq', modelo: 'openai/gpt-oss-20b' };

const OPTION: ConflictOption = {
  indice: 0,
  dia_semana: 'Martes',
  hora_inicio: '08:00:00',
  aula_id: 3,
  aula: 'Aula 101',
  aforo: 40,
  horas_muertas_grupo: 0,
  horas_muertas_profesor: 0,
  mismo_dia: false,
  misma_aula: true,
};

const SUGGESTION: ConflictSuggestion = {
  horario_id: 7,
  conflictos: ['Ana no está disponible el lunes a las 6:00 a. m.'],
  opciones: [OPTION, { ...OPTION, indice: 1, dia_semana: 'Jueves', aula_id: 4, aula: 'Lab 1', misma_aula: false }],
  recomendada: 0,
  explicacion: 'Ana no está disponible a esa hora; el martes a las 8 no hay cruces.',
  motivos: ['Sin horas muertas'],
  proveedor: 'Groq',
  modelo: 'openai/gpt-oss-20b',
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ConflictAdvisor);
  fixture.componentRef.setInput('entryId', 7);
  fixture.detectChanges();
  return { fixture, backend, page: fixture.nativeElement as HTMLElement };
}

const button = (page: HTMLElement, text: string) =>
  [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text));

describe('ConflictAdvisor', () => {
  it('shows the provider named by the server, the recommendation and the options; applying one emits it', async () => {
    const { fixture, backend, page } = setup();
    backend.expectOne(`${API_URL}/ai/status`).flush(STATUS);
    await fixture.whenStable();
    expect(page.textContent).toContain('Groq');

    button(page, 'Sugerir solución')!.click();
    backend.expectOne(`${API_URL}/ai/conflicts/7/suggestion`).flush(SUGGESTION);
    await fixture.whenStable();
    expect(page.textContent).toContain('el martes a las 8 no hay cruces');
    expect(page.querySelector('li.recommended')?.textContent).toContain('Aula 101');
    expect(page.querySelectorAll('.options li').length).toBe(2);

    let applied: ConflictOption | null = null;
    fixture.componentInstance.apply.subscribe((o) => (applied = o));
    button(page, 'Mover aquí')!.click();
    expect(applied).toEqual(OPTION);
  });

  it('without a key on the server the button says the AI is not configured', async () => {
    const { fixture, backend, page } = setup();
    backend.expectOne(`${API_URL}/ai/status`).flush({ ...STATUS, configurada: false });
    await fixture.whenStable();
    const disabled = button(page, 'IA no configurada')!;
    expect(disabled.disabled).toBe(true);
    expect(disabled.title).toContain('AI_API_KEY');
  });

  it('shows the backend message when the AI fails (limit, provider down)', async () => {
    const { fixture, backend, page } = setup();
    backend.expectOne(`${API_URL}/ai/status`).flush(STATUS);
    await fixture.whenStable();
    button(page, 'Sugerir solución')!.click();
    backend
      .expectOne(`${API_URL}/ai/conflicts/7/suggestion`)
      .flush({ detail: 'Se alcanzó el límite de uso de Groq.' }, { status: 429, statusText: 'Too Many Requests' });
    await fixture.whenStable();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('límite de uso de Groq');
  });

  it('asks for the status only once per session', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const ai = TestBed.inject(AiService);
    const backend = TestBed.inject(HttpTestingController);
    ai.loadStatus();
    ai.loadStatus();
    backend.expectOne(`${API_URL}/ai/status`).flush(STATUS);
    expect(ai.ready()).toBe(true);
    expect(ai.providerName()).toBe('Groq');
    ai.reset();
    expect(ai.status()).toBeNull();
  });
});
