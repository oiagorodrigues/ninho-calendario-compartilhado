type Row = Record<string, unknown> | undefined;

function column(row: Row, key: string): unknown {
  if (row === undefined) throw new Error(`Expected a row with column ${key}`);
  return row[key];
}

export function readString(row: Row, key: string): string {
  const value = column(row, key);
  if (typeof value !== 'string') throw new Error(`Column ${key} is not text`);
  return value;
}

export function readNullableString(row: Row, key: string): string | null {
  const value = column(row, key);
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`Column ${key} is not text`);
  return value;
}

export function readNumber(row: Row, key: string): number {
  const value = column(row, key);
  if (typeof value === 'bigint') return Number(value);
  if (typeof value !== 'number') throw new Error(`Column ${key} is not a number`);
  return value;
}
