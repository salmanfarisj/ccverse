function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (typeof window !== 'undefined') {
    return path;
  }
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return parseResponse<T>(res);
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return parseResponse<T>(res);
}

export async function apiSendForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
    cache: 'no-store',
  });
  return parseResponse<T>(res);
}
