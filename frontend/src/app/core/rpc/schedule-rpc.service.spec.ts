import { create, toBinary } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';

import { median } from '../../features/analysis/protocol-compare/protocol-compare';
import { ListScheduleResponseSchema, Weekday } from './gen/horarios/v1/horarios_pb';
import { rpcErrorMessage } from './schedule-rpc.service';

describe('RPC client', () => {
  it('shows the Spanish message the server sent (permission denied, impossible schedule)', () => {
    expect(rpcErrorMessage(new ConnectError('Solo un administrador puede generar el horario.', Code.PermissionDenied), 'x')).toBe(
      'Solo un administrador puede generar el horario.',
    );
  });

  it('explains a cancelled stream and a network failure', () => {
    expect(rpcErrorMessage(new ConnectError('', Code.Canceled), 'x')).toContain('el horario anterior se conserva');
    expect(rpcErrorMessage(new ConnectError('', Code.Unavailable), 'x')).toContain('No se pudo conectar');
    expect(rpcErrorMessage(new Error('boom'), 'Falló')).toBe('Falló');
  });

  it('the generated messages encode to compact Protobuf binary', () => {
    const message = create(ListScheduleResponseSchema, {
      entries: [{ id: 1, subjectId: 2, classroomId: 3, weekday: Weekday.LUNES, startHour: 8, endHour: 9 }],
    });
    const json = JSON.stringify([{ id: 1, materia_id: 2, aula_id: 3, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '09:00:00' }]);
    expect(toBinary(ListScheduleResponseSchema, message).byteLength).toBeLessThan(new TextEncoder().encode(json).byteLength / 5);
  });

  it('the comparison uses the median, robust to one slow request', () => {
    expect(median([10, 12, 400, 11, 13])).toBe(12);
    expect(median([10, 20])).toBe(15);
  });
});
