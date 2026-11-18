import type { ApiErrorBody } from '../../shared/schemas.ts';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error: unknown = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Calls the API; resolves with the parsed JSON body, or rejects with an ApiError carrying field messages. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text !== '') {
    try {
      data = JSON.parse(text);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new ApiError(response.status, 'invalid_response', 'O servidor respondeu algo inesperado. Tente de novo.');
    }
  }
  if (!response.ok) {
    if (isApiErrorBody(data)) throw new ApiError(response.status, data.error.code, data.error.message, data.error.fields);
    throw new ApiError(response.status, 'http_error', 'Não foi possível falar com o servidor. Tente de novo.');
  }
  // The server owns these response shapes (src/shared/schemas.ts) and is the same codebase.
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Sem conexão. Verifique a internet e tente de novo.';
  throw error;
}
