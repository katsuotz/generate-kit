import { AuthApiClient, type AuthApi } from './auth/authApi';
import { CompilationApiClient, type CompilationApi } from './compilation/compilationApi';
import { CvSessionApiClient, type CvSessionApi } from './cv-session/cvSessionApi';
import { HttpClient } from './core/httpClient';
import { DocumentsApiClient, type DocumentApi } from './documents/documentsApi';

export interface BackendApi {
  auth: AuthApi;
  cvSession: CvSessionApi;
  documents: DocumentApi;
  compilation: CompilationApi;
}

export function createBackendApi(): BackendApi {
  const http = new HttpClient();
  const documents = new DocumentsApiClient(http);
  const cvSession = new CvSessionApiClient(http, (session) =>
    documents.rememberWorkspace(session.projectId, session.documentId)
  );
  return {
    auth: new AuthApiClient(http),
    cvSession,
    documents,
    compilation: new CompilationApiClient(http)
  };
}
export { BackendApiError } from './core/apiError';
export { SessionContext } from './core/sessionContext';
export { HttpClient } from './core/httpClient';
export type { AuthUser } from './auth/types';
export type { CvSessionDraft, CvSessionResponse } from './cv-session/types';
export type { DocumentResponse, ProjectResponse } from './documents/types';
export type { ArtifactResponse, CompileJobResponse, DiagnosticResponse } from './compilation/types';
