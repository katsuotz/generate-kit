import { BackendApiError } from '../core/apiError';
import { HttpClient } from '../core/httpClient';
import type { DocumentResponse, ProjectResponse } from './types';

export interface DocumentApi {
  loadDocument(initialSource: string): Promise<DocumentResponse>;
  updateDocument(
    documentId: string,
    source: string,
    signal?: AbortSignal
  ): Promise<DocumentResponse>;
}

export class DocumentsApiClient implements DocumentApi {
  private workspace: { projectId: string; documentId: string } | null = null;

  constructor(private readonly http: HttpClient = new HttpClient()) {}

  rememberWorkspace(projectId: string | undefined, documentId: string | undefined) {
    if (projectId && documentId) this.workspace = { projectId, documentId };
  }

  async loadDocument(initialSource: string) {
    await this.http.sessionContext.ensureSession();
    if (this.workspace) {
      try {
        return await this.http.request<DocumentResponse>(
          `/api/v1/documents/${this.workspace.documentId}`
        );
      } catch (error) {
        if (!(error instanceof BackendApiError) || error.status !== 404) throw error;
        this.workspace = null;
      }
    }

    const project = await this.http.request<ProjectResponse>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'My CV' })
    });
    const document = await this.http.request<DocumentResponse>(
      `/api/v1/projects/${project.id}/documents`,
      { method: 'POST', body: JSON.stringify({ name: 'cv.tex', source: initialSource }) }
    );
    this.workspace = { projectId: project.id, documentId: document.id };
    return document;
  }

  updateDocument(documentId: string, source: string, signal?: AbortSignal) {
    return this.http.request<DocumentResponse>(`/api/v1/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ source }),
      signal
    });
  }
}
