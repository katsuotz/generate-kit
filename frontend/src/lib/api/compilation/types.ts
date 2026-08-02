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
