import { BackendApiError } from './apiError';
import { SessionContext } from './sessionContext';

export class HttpClient {
  constructor(readonly sessionContext = new SessionContext()) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.requestResponse(path, init);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async requestBinary(path: string, init: RequestInit = {}): Promise<ArrayBuffer> {
    const response = await this.requestResponse(path, init);
    return response.arrayBuffer();
  }

  async requestPublic<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.sessionContext.baseUrl}${path}`, {
      ...init,
      headers: this.headers(init),
      credentials: 'include'
    });
    if (!response.ok) throw await this.toApiError(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  private async requestResponse(path: string, init: RequestInit, retry = true): Promise<Response> {
    const session = await this.sessionContext.ensureSession();
    const headers = this.headers(init);
    if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

    const response = await fetch(`${this.sessionContext.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
    if (response.status === 401 && retry) {
      this.sessionContext.invalidateAnonymousSession();
      return this.requestResponse(path, init, false);
    }
    if (!response.ok) throw await this.toApiError(response);
    return response;
  }

  private headers(init: RequestInit) {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    return headers;
  }

  private async toApiError(response: Response): Promise<BackendApiError> {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      details?: unknown;
    } | null;
    return new BackendApiError(
      body?.message ?? `Backend request failed with status ${response.status}.`,
      response.status,
      body?.code ?? 'backend_error',
      body?.details
    );
  }
}
