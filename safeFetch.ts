export class ApiResponseError extends Error {
  status: number;
  isNonJsonHtml: boolean;

  constructor(message: string, status = 500, isNonJsonHtml = false) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.isNonJsonHtml = isNonJsonHtml;
  }
}

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackErrorMessage = 'Layanan sementara tidak tersedia. Silakan coba beberapa saat lagi.'
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiResponseError(
      'Tidak dapat terhubung ke server layanan. Periksa koneksi internet Anda lalu coba kembali.',
      0,
      false
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json') || contentType.includes('+json');

  if (!isJson) {
    // Drain body safely as text to confirm whether HTML was returned without crashing JSON.parse
    let preview = '';
    try {
      preview = (await response.text()).trim().slice(0, 80).toLowerCase();
    } catch {
      preview = '';
    }
    const looksLikeHtml =
      contentType.includes('text/html') ||
      preview.startsWith('<!doctype') ||
      preview.startsWith('<html');

    throw new ApiResponseError(fallbackErrorMessage, response.status, looksLikeHtml);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiResponseError(
      'Respons data dari server tidak dapat dibaca. Silakan coba beberapa saat lagi.',
      response.status,
      false
    );
  }

  if (!response.ok) {
    const serverMessage =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : fallbackErrorMessage;

    throw new ApiResponseError(serverMessage, response.status, false);
  }

  return data as T;
}
