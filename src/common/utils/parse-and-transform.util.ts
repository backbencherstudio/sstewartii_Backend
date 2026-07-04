import { plainToInstance } from 'class-transformer';

export function parseAndTransform<T>(
  value: unknown,
  dtoClass: new () => T,
): T[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(dtoClass, item));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const parsed = JSON.parse(trimmed);

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed.map((item) => plainToInstance(dtoClass, item));
  }

  return undefined;
}
