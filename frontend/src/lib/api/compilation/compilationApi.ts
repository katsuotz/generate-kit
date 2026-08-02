import { HttpClient } from '../core/httpClient';
import type { CompileJobResponse } from './types';

export interface CompilationApi {
  createCompileJob(
    documentId: string,
    revisionId: string,
    signal?: AbortSignal
  ): Promise<CompileJobResponse>;
  getCompileJob(jobId: string, signal?: AbortSignal): Promise<CompileJobResponse>;
  cancelCompileJob(jobId: string): Promise<void>;
  getArtifact(artifactId: string, signal?: AbortSignal): Promise<ArrayBuffer>;
}

export class CompilationApiClient implements CompilationApi {
  constructor(private readonly http: HttpClient = new HttpClient()) {}

  createCompileJob(documentId: string, revisionId: string, signal?: AbortSignal) {
    return this.http.request<CompileJobResponse>(`/api/v1/documents/${documentId}/compile`, {
      method: 'POST',
      body: JSON.stringify({ revision_id: revisionId, profile: 'cv-xelatex' }),
      signal
    });
  }

  getCompileJob(jobId: string, signal?: AbortSignal) {
    return this.http.request<CompileJobResponse>(`/api/v1/compile-jobs/${jobId}`, { signal });
  }

  cancelCompileJob(jobId: string) {
    return this.http.request<void>(`/api/v1/compile-jobs/${jobId}`, { method: 'DELETE' });
  }

  getArtifact(artifactId: string, signal?: AbortSignal) {
    return this.http.requestBinary(`/api/v1/artifacts/${artifactId}`, { signal });
  }
}
