import { OperatorFunction, map } from 'rxjs';
import * as z from 'zod/mini';

/**
 * The API answered with data that does not follow the contract. TypeScript types disappear at runtime: without
 * this check, `http.get<Teacher[]>()` would hand the screens whatever arrived, and the failure would show up later
 * as `undefined` somewhere far from the cause.
 */
export class ApiContractError extends Error {
  constructor(
    readonly endpoint: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(`Respuesta inesperada de ${endpoint}: ${issues.map((i) => `${i.path.join('.') || '(raíz)'} ${i.message}`).join('; ')}`);
    this.name = 'ApiContractError';
  }
}

/** Parses data that comes from outside (API or storage) with a schema: the result is typed and trustworthy, or it throws. */
export function parseOrThrow<T>(schema: z.ZodMiniType<T>, data: unknown, endpoint: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new ApiContractError(endpoint, result.error.issues);
    console.error('[contrato]', error.message, { endpoint, issues: result.error.issues, data });
    throw error;
  }
  return result.data;
}

/**
 * RxJS operator for the API services: parse, don't just validate. The schemas are generated from the contract
 * (core/api/generated/zod.gen.ts), so the check is exactly the one the backend promises.
 */
export function parseResponse<T>(schema: z.ZodMiniType<T>, endpoint: string): OperatorFunction<unknown, T> {
  return map((body) => parseOrThrow(schema, body, endpoint));
}
