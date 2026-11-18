export type ErrorCode =
  | 'invalid_input'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'no_family';

const STATUS: Record<ErrorCode, 400 | 401 | 403 | 404 | 409 | 429> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  no_family: 409,
};

/** An error the API turns into a client response; anything else becomes a 500. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields: Record<string, string> | undefined;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fields = fields;
  }

  get status(): 400 | 401 | 403 | 404 | 409 | 429 {
    return STATUS[this.code];
  }
}
