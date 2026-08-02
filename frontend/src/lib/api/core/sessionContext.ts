import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { BackendApiError } from './apiError';

export interface AnonymousSession {
  session_id: string;
  token?: string;
  expires_at: string | number[];
}

export class SessionContext {
  readonly baseUrl = (PUBLIC_API_BASE_URL || 'http://localhost:18732').replace(/\/$/, '');
  private session: AnonymousSession | null = null;
  private authenticated = false;
  private refreshingSession?: Promise<AnonymousSession>;

  get isAuthenticated() {
    return this.authenticated;
  }

  async ensureSession(): Promise<AnonymousSession | null> {
    if (this.authenticated) return null;
    if (this.session) return this.session;

    if (!this.refreshingSession) {
      this.refreshingSession = fetch(`${this.baseUrl}/api/v1/sessions/anonymous`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
        .then((response) => this.parseResponse<AnonymousSession>(response))
        .then((session) => {
          this.session = session;
          return session;
        })
        .finally(() => (this.refreshingSession = undefined));
    }

    return this.refreshingSession;
  }

  markAuthenticated() {
    this.authenticated = true;
    this.session = null;
  }

  markLoggedOut() {
    this.authenticated = false;
    this.session = null;
  }

  invalidateAnonymousSession() {
    this.session = null;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) throw await this.toApiError(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
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
