import { BackendApiError } from '../core/apiError';
import { HttpClient } from '../core/httpClient';
import { serializeCvSession, normalizeCvSession } from './serialization';
import type { CvSessionDraft, CvSessionResponse } from './types';

export interface CvSessionApi {
  bootstrap(initial: CvSessionDraft): Promise<CvSessionResponse>;
  get(): Promise<CvSessionResponse>;
  create(initial: CvSessionDraft): Promise<CvSessionResponse>;
  save(
    draft: CvSessionDraft,
    expectedVersion: number,
    signal?: AbortSignal
  ): Promise<CvSessionResponse>;
}

export class CvSessionApiClient implements CvSessionApi {
  constructor(
    private readonly http: HttpClient = new HttpClient(),
    private readonly onSession?: (session: CvSessionResponse) => void
  ) {}

  async bootstrap(initial: CvSessionDraft) {
    await this.http.sessionContext.ensureSession();
    try {
      return await this.get();
    } catch (error) {
      if (!(error instanceof BackendApiError) || error.status !== 404) throw error;
      return this.create(initial);
    }
  }

  async get() {
    return this.remember(await this.http.request<CvSessionResponse>('/api/v1/cv/session'));
  }

  async create(initial: CvSessionDraft) {
    return this.remember(
      await this.http.request<CvSessionResponse>('/api/v1/cv/session', {
        method: 'POST',
        body: JSON.stringify(serializeCvSession(initial))
      })
    );
  }

  async save(draft: CvSessionDraft, expectedVersion: number, signal?: AbortSignal) {
    return this.remember(
      await this.http.request<CvSessionResponse>('/api/v1/cv/session', {
        method: 'PUT',
        body: JSON.stringify({ ...serializeCvSession(draft), expected_version: expectedVersion }),
        signal
      })
    );
  }

  private remember(value: CvSessionResponse) {
    const session = normalizeCvSession(value);
    this.onSession?.(session);
    return session;
  }
}
