import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type { CvData } from '$lib/cv/model';

export interface AnonymousSession {
  session_id: string;
  token?: string;
  expires_at: string | number[];
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface CvSessionDraft {
  schemaVersion: number;
  data: CvData;
  templateId: string;
  lastGeneratedSource: string;
  generatedAt: string | null;
  fingerprint: string;
}

export interface CvSessionResponse extends CvSessionDraft {
  id: string;
  version: number;
  projectId?: string;
  documentId?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
}

export interface DocumentResponse {
  id: string;
  project_id: string;
  name: string;
  revision_id: string;
  revision_number: number;
  source: string;
}

export interface DiagnosticResponse {
  severity: 'error' | 'warning' | string;
  code: string;
  message: string;
  file: string | null;
  line: number | null;
  column: number | null;
}

export interface ArtifactResponse {
  id: string;
  media_type: string;
  bytes: number;
  page_count: number | null;
}

export interface CompileJobResponse {
  id: string;
  revision_id: string;
  profile: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | string;
  diagnostics: DiagnosticResponse[];
  artifact: ArtifactResponse | null;
}

interface WorkspaceRecord {
  projectId: string;
  documentId: string;
}

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export class BackendClient {
  private readonly baseUrl = (PUBLIC_API_BASE_URL || 'http://localhost:18732').replace(/\/$/, '');
  private session: AnonymousSession | null = null;
  private workspace: WorkspaceRecord | null = null;
  private authenticated = false;
  private refreshingSession?: Promise<AnonymousSession>;

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

  async loadDocument(initialSource: string): Promise<DocumentResponse> {
    await this.ensureSession();

    if (this.workspace) {
      try {
        return await this.request<DocumentResponse>(
          `/api/v1/documents/${this.workspace.documentId}`
        );
      } catch (error) {
        if (!(error instanceof BackendApiError) || error.status !== 404) throw error;
        this.workspace = null;
      }
    }

    const project = await this.request<ProjectResponse>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'My CV' })
    });
    const document = await this.request<DocumentResponse>(
      `/api/v1/projects/${project.id}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({ name: 'cv.tex', source: initialSource })
      }
    );
    this.workspace = { projectId: project.id, documentId: document.id };
    return document;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.requestPublic<AuthResponse>('/api/v1/auth/me');
      this.authenticated = true;
      return response.user ?? (response as unknown as AuthUser);
    } catch (error) {
      if (error instanceof BackendApiError && (error.status === 401 || error.status === 404))
        return null;
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await this.requestPublic<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.authenticated = true;
    return response.user ?? (response as unknown as AuthUser);
  }

  async register(email: string, password: string, name?: string): Promise<AuthUser> {
    const response = await this.requestPublic<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(name?.trim() ? { name: name.trim() } : {}) })
    });
    this.authenticated = true;
    return response.user ?? (response as unknown as AuthUser);
  }

  async logout(): Promise<void> {
    await this.requestPublic<void>('/api/v1/auth/logout', { method: 'POST' });
    this.authenticated = false;
    this.session = null;
    this.workspace = null;
  }

  async bootstrapCvSession(initial: CvSessionDraft): Promise<CvSessionResponse> {
    await this.ensureSession();
    try {
      return await this.getCvSession();
    } catch (error) {
      if (!(error instanceof BackendApiError) || error.status !== 404) throw error;
      return this.createCvSession(initial);
    }
  }

  getCvSession() {
    return this.request<CvSessionResponse>('/api/v1/cv/session')
      .then(normalizeCvSession)
      .then((session) => this.rememberCvWorkspace(session));
  }

  createCvSession(initial: CvSessionDraft) {
    return this.request<CvSessionResponse>('/api/v1/cv/session', {
      method: 'POST',
      body: JSON.stringify(serializeCvSession(initial))
    })
      .then(normalizeCvSession)
      .then((session) => this.rememberCvWorkspace(session));
  }

  saveCvSession(
    _sessionId: string,
    draft: CvSessionDraft,
    expectedVersion: number,
    signal?: AbortSignal
  ) {
    return this.request<CvSessionResponse>('/api/v1/cv/session', {
      method: 'PUT',
      body: JSON.stringify({ ...serializeCvSession(draft), expected_version: expectedVersion }),
      signal
    })
      .then(normalizeCvSession)
      .then((session) => this.rememberCvWorkspace(session));
  }

  updateDocument(documentId: string, source: string, signal?: AbortSignal) {
    return this.request<DocumentResponse>(`/api/v1/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ source }),
      signal
    });
  }

  createCompileJob(
    documentId: string,
    revisionId: string,
    signal?: AbortSignal
  ): Promise<CompileJobResponse> {
    return this.request<CompileJobResponse>(`/api/v1/documents/${documentId}/compile`, {
      method: 'POST',
      body: JSON.stringify({ revision_id: revisionId, profile: 'cv-xelatex' }),
      signal
    });
  }

  getCompileJob(jobId: string, signal?: AbortSignal) {
    return this.request<CompileJobResponse>(`/api/v1/compile-jobs/${jobId}`, { signal });
  }

  cancelCompileJob(jobId: string) {
    return this.request<void>(`/api/v1/compile-jobs/${jobId}`, { method: 'DELETE' });
  }

  async getArtifact(artifactId: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const response = await this.requestResponse(`/api/v1/artifacts/${artifactId}`, { signal });
    return response.arrayBuffer();
  }

  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const response = await this.requestResponse(path, init, retry);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  private async requestResponse(
    path: string,
    init: RequestInit = {},
    retry = true
  ): Promise<Response> {
    const session = this.authenticated ? null : await this.ensureSession();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
    if (response.status === 401 && retry) {
      this.session = null;
      return this.requestResponse(path, init, false);
    }
    if (!response.ok) throw await this.toApiError(response);
    return response;
  }

  private requestPublic<T>(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    return fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: 'include' }).then(
      (response) => this.parseResponse<T>(response)
    );
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

  private rememberCvWorkspace(session: CvSessionResponse) {
    if (session.projectId && session.documentId) {
      this.workspace = { projectId: session.projectId, documentId: session.documentId };
    }
    return session;
  }
}

function serializeCvSession(draft: CvSessionDraft) {
  return {
    schema_version: draft.schemaVersion,
    data: draft.data,
    template_id: draft.templateId,
    generated_source: draft.lastGeneratedSource,
    generated_at: draft.generatedAt,
    fingerprint: draft.fingerprint
  };
}

function normalizeCvSession(value: CvSessionResponse | { session?: CvSessionResponse }) {
  const session = 'session' in value && value.session ? value.session : value;
  const record = session as unknown as Record<string, unknown>;
  return {
    id: String(record.id),
    version: Number(record.version ?? record.expected_version ?? 0),
    projectId: String(record.projectId ?? record.project_id ?? ''),
    documentId: String(record.documentId ?? record.document_id ?? ''),
    schemaVersion: Number(record.schemaVersion ?? record.schema_version ?? 1),
    data: record.data as CvData,
    templateId: String(record.templateId ?? record.template_id ?? 'editorial-v1'),
    lastGeneratedSource:
      typeof (
        record.lastGeneratedSource ??
        record.generated_source ??
        record.last_generated_source
      ) === 'string'
        ? String(
            record.lastGeneratedSource ?? record.generated_source ?? record.last_generated_source
          )
        : '',
    generatedAt:
      record.generatedAt === undefined
        ? ((record.generated_at as string | null | undefined) ?? null)
        : (record.generatedAt as string | null),
    fingerprint: typeof record.fingerprint === 'string' ? record.fingerprint : ''
  } satisfies CvSessionResponse;
}
