import { TestBed } from '@angular/core/testing';

import { ConfirmService } from './confirm.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a toast and dismisses it automatically', () => {
    const service = TestBed.inject(NotificationService);
    service.success('Guardado');
    expect(service.items().map((n) => n.message)).toEqual(['Guardado']);
    vi.advanceTimersByTime(4000);
    expect(service.items()).toEqual([]);
  });

  it('keeps errors longer than successes and never more than 4 on screen', () => {
    const service = TestBed.inject(NotificationService);
    service.error('Falló');
    vi.advanceTimersByTime(5000);
    expect(service.items().length).toBe(1);
    for (let i = 0; i < 5; i++) service.info(`Aviso ${i}`);
    expect(service.items().length).toBe(4);
    expect(service.items().at(-1)?.message).toBe('Aviso 4');
  });
});

describe('ConfirmService', () => {
  it('resolves with the user answer', async () => {
    const service = TestBed.inject(ConfirmService);
    const answer = service.ask({ title: '¿Seguro?', message: 'Texto' });
    expect(service.pending()?.title).toBe('¿Seguro?');
    service.answer(true);
    await expect(answer).resolves.toBe(true);
    expect(service.pending()).toBeNull();
  });

  it('cancels the previous question when a new one arrives', async () => {
    const service = TestBed.inject(ConfirmService);
    const first = service.ask({ title: 'Primera', message: '' });
    const second = service.ask({ title: 'Segunda', message: '' });
    await expect(first).resolves.toBe(false);
    service.answer(true);
    await expect(second).resolves.toBe(true);
  });
});
