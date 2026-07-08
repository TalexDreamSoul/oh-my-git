import { z } from 'zod';

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 16 * 1024;

export class JsonRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'JsonRequestError';
    this.status = status;
  }
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export async function readJsonLimited(request: Request, maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new JsonRequestError(413, 'Request body too large.');
    }
  }

  const text = await request.text();
  if (utf8ByteLength(text) > maxBytes) {
    throw new JsonRequestError(413, 'Request body too large.');
  }
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new JsonRequestError(400, 'Invalid JSON body.');
  }
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES): Promise<T> {
  const value = await readJsonLimited(request, maxBytes);
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new JsonRequestError(400, 'Invalid request payload.');
  }
  return parsed.data;
}

export function jsonRequestErrorResponse(error: unknown): Response {
  if (error instanceof JsonRequestError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export function boundedIntParam(value: string | null, defaultValue: number, min: number, max: number) {
  const parsed = value == null || value.trim() === '' ? defaultValue : Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
