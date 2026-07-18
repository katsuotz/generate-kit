import { browser } from '$app/environment';
import { PUBLIC_API_BASE_URL } from '$env/static/public';

const SESSION_KEY = 'latex-renderer.session.v1';
const WORKSPACE_KEY = 'latex-renderer.workspace.v1';

export interface AnonymousSession {
  session_id: string;
  token: string;
  expires_at: string | number[];
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
    readonly code: string
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export class BackendClient {
  private readonly baseUrl = (PUBLIC_API_BASE_URL || 'http://localhost:18732').replace(/\/$/, '');
  private session: AnonymousSession | null = readStorage<AnonymousSession>(SESSION_KEY);
  private workspace: WorkspaceRecord | null = readStorage<WorkspaceRecord>(WORKSPACE_KEY);
  private refreshingSession?: Promise<AnonymousSession>;

  async ensureSession(): Promise<AnonymousSession> {
    if (this.session) return this.session;

    if (!this.refreshingSession) {
      this.refreshingSession = fetch(`${this.baseUrl}/api/v1/sessions/anonymous`, {
        method: 'POST',
        headers: { Accept: 'application/json' }
      })
        .then((response) => this.parseResponse<AnonymousSession>(response))
        .then((session) => {
          this.session = session;
          writeStorage(SESSION_KEY, session);
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
        removeStorage(WORKSPACE_KEY);
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
    writeStorage(WORKSPACE_KEY, this.workspace);
    return document;
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
    const session = await this.ensureSession();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${session.token}`);

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && retry) {
      this.session = null;
      removeStorage(SESSION_KEY);
      return this.requestResponse(path, init, false);
    }
    if (!response.ok) throw await this.toApiError(response);
    return response;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) throw await this.toApiError(response);
    return response.json() as Promise<T>;
  }

  private async toApiError(response: Response): Promise<BackendApiError> {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    return new BackendApiError(
      body?.message ?? `Backend request failed with status ${response.status}.`,
      response.status,
      body?.code ?? 'backend_error'
    );
  }
}

function readStorage<T>(key: string): T | null {
  if (!browser) return null;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (browser) localStorage.setItem(key, JSON.stringify(value));
}

function removeStorage(key: string) {
  if (browser) localStorage.removeItem(key);
}
