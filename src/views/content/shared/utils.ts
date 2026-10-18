const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_PATTERN.test(value);

export const queryString = (value: unknown) => (typeof value === 'string' ? value : '');

export const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
