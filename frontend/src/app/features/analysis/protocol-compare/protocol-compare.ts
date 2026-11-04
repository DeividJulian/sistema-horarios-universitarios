import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { API_URL } from '../../../core/api/api-url';
import { AuthService } from '../../../core/auth/auth.service';
import { ScheduleRpcService, rpcErrorMessage } from '../../../core/rpc/schedule-rpc.service';

/** Measured requests of each protocol (the first one warms up the connection and is not counted). */
export const ROUNDS = 5;

export interface ProtocolResult {
  entries: number;
  /** Bytes of the response body, as the client receives it after decompressing */
  bytes: number;
  /** Bytes once compressed with gzip (what travels if the server compresses) */
  gzipBytes: number;
  /** Median of the request + decoding time, in milliseconds */
  medianMs: number;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function gzipSize(bytes: ArrayBuffer): Promise<number> {
  if (typeof CompressionStream === 'undefined') return 0;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

/**
 * REST (JSON) vs gRPC (Protobuf) with the same data: the weekly schedule, through GET /schedules and through
 * ListSchedule of the RPC service, with the same session. Measured in the browser, against the real server.
 */
@Component({
  selector: 'app-protocol-compare',
  imports: [DecimalPipe],
  templateUrl: './protocol-compare.html',
  styleUrl: './protocol-compare.css',
})
export class ProtocolCompare {
  private readonly auth = inject(AuthService);
  private readonly rpc = inject(ScheduleRpcService);

  protected readonly running = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly rest = signal<ProtocolResult | null>(null);
  protected readonly grpc = signal<ProtocolResult | null>(null);
  protected readonly rounds = ROUNDS;

  /** How many times smaller the Protobuf answer is. */
  protected readonly ratio = computed(() => {
    const rest = this.rest();
    const grpc = this.grpc();
    return rest && grpc && grpc.bytes ? rest.bytes / grpc.bytes : null;
  });

  protected async run(): Promise<void> {
    if (this.running()) return;
    this.running.set(true);
    this.error.set(null);
    try {
      this.rest.set(await this.measureRest());
      this.grpc.set(await this.measureGrpc());
    } catch (error) {
      this.error.set(rpcErrorMessage(error, 'No se pudo completar la comparación. Intenta de nuevo.'));
    } finally {
      this.running.set(false);
    }
  }

  private async measureRest(): Promise<ProtocolResult> {
    const times: number[] = [];
    let body = new ArrayBuffer(0);
    let entries = 0;
    for (let round = 0; round <= ROUNDS; round++) {
      const started = performance.now();
      const response = await fetch(`${API_URL}/schedules`, { headers: { Authorization: `Bearer ${this.auth.token()}` } });
      if (!response.ok) throw new Error(`GET /schedules respondió ${response.status}`);
      body = await response.arrayBuffer();
      entries = (JSON.parse(new TextDecoder().decode(body)) as unknown[]).length;
      if (round > 0) times.push(performance.now() - started);
    }
    return { entries, bytes: body.byteLength, gzipBytes: await gzipSize(body), medianMs: median(times) };
  }

  private async measureGrpc(): Promise<ProtocolResult> {
    const times: number[] = [];
    let bytes = 0;
    let entries = 0;
    let lastBody: ArrayBuffer | null = null;
    const client = this.rpc.measuredClient((size) => (bytes = size));
    for (let round = 0; round <= ROUNDS; round++) {
      const started = performance.now();
      const response = await client.listSchedule({});
      entries = response.entries.length;
      if (round > 0) times.push(performance.now() - started);
    }
    // The compressed size is computed on an encoded copy of the same message (the client already decoded it)
    const { toBinary } = await import('@bufbuild/protobuf');
    const { ListScheduleResponseSchema } = await import('../../../core/rpc/gen/horarios/v1/horarios_pb');
    const response = await client.listSchedule({});
    lastBody = toBinary(ListScheduleResponseSchema, response).slice().buffer as ArrayBuffer;
    return { entries, bytes, gzipBytes: await gzipSize(lastBody), medianMs: median(times) };
  }
}
