export interface CfPagesEnv {
  GEMINI_API_KEY?: string;
}

export interface CfPagesContext<Env = CfPagesEnv> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}

export type CfPagesHandler<Env = CfPagesEnv> = (
  context: CfPagesContext<Env>
) => Promise<Response> | Response;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function readJsonBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error('EMPTY_BODY');
  }
  return JSON.parse(text) as T;
}

export interface GeminiRestPart {
  text?: string;
  thoughtSignature?: string;
  functionCall?: {
    id?: string;
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
}

export interface GeminiRestContent {
  role: 'user' | 'model';
  parts: GeminiRestPart[];
}

export interface GeminiRestResponse {
  candidates?: Array<{
    content?: GeminiRestContent;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export async function callGeminiRest(
  apiKey: string,
  model: string,
  payload: Record<string, unknown>
): Promise<GeminiRestResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) {
        const preview = await res.text().catch(() => '');
        const err = new Error(`Gemini HTTP ${res.status}: ${preview.slice(0, 120)}`);
        (err as { status?: number }).status = res.status;
        throw err;
      }

      const data = (await res.json()) as GeminiRestResponse;
      if (!res.ok || data.error) {
        const msg = data.error?.message || `Gemini HTTP ${res.status}`;
        const err = new Error(`${data.error?.status || ''} ${msg}`.trim());
        (err as { status?: number }).status = data.error?.code || res.status;
        if (attempt < 2 && (res.status === 500 || res.status === 503)) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        throw err;
      }

      return data;
    } catch (err) {
      lastError = err;
      const statusProp =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : NaN;
      if (attempt < 2 && (statusProp === 500 || statusProp === 503 || Number.isNaN(statusProp))) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
