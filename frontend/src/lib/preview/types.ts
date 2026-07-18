export type DiagnosticSeverity = 'error' | 'warning';

export interface PreviewDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  line: number;
  column: number;
  code: string;
  file?: string;
}

export interface HtmlPreviewSuccess {
  kind: 'success';
  representation: 'html';
  source: string;
  html: string;
}

export interface PdfPreviewSuccess {
  kind: 'success';
  representation: 'pdf';
  source: string;
  data: ArrayBuffer;
  artifactId: string;
  pageCount: number | null;
}

export type PreviewSuccess = HtmlPreviewSuccess | PdfPreviewSuccess;

export interface PreviewEmpty {
  kind: 'empty';
}

export interface PreviewFailure {
  kind: 'failure';
  diagnostics: PreviewDiagnostic[];
}

export type PreviewResult = PreviewSuccess | PreviewEmpty | PreviewFailure;

export interface PreviewAdapter {
  render(source: string, signal?: AbortSignal): Promise<PreviewResult>;
}
