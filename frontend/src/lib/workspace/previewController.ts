import type {
  PreviewAdapter,
  PreviewDiagnostic,
  PreviewResult,
  PreviewSuccess
} from '$lib/preview/types';

export interface PreviewState {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'failure';
  requestedSource: string;
  lastSuccess: PreviewSuccess | null;
  diagnostics: PreviewDiagnostic[];
}

export class PreviewController {
  state: PreviewState = {
    status: 'idle',
    requestedSource: '',
    lastSuccess: null,
    diagnostics: []
  };

  private requestId = 0;
  private abortController?: AbortController;

  constructor(
    private readonly adapter: PreviewAdapter,
    private readonly onChange: (state: PreviewState) => void
  ) {}

  async compile(source: string) {
    const id = ++this.requestId;
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.update({ status: 'loading', requestedSource: source, diagnostics: [] });

    try {
      const result = await this.adapter.render(source, this.abortController.signal);
      if (id !== this.requestId) return;
      this.applyResult(result, source);
    } catch (error) {
      if (id !== this.requestId || (error instanceof DOMException && error.name === 'AbortError'))
        return;
      this.update({
        status: 'failure',
        requestedSource: source,
        diagnostics: [
          {
            severity: 'error',
            message: 'Preview service is unavailable.',
            line: 1,
            column: 1,
            code: 'ADAPTER_FAILURE'
          }
        ]
      });
    }
  }

  dispose() {
    this.requestId += 1;
    this.abortController?.abort();
  }

  private applyResult(result: PreviewResult, source: string) {
    if (result.kind === 'success') {
      this.update({
        status: 'success',
        requestedSource: source,
        lastSuccess: result,
        diagnostics: []
      });
    } else if (result.kind === 'failure') {
      this.update({ status: 'failure', requestedSource: source, diagnostics: result.diagnostics });
    } else {
      this.update({ status: 'empty', requestedSource: source, diagnostics: [] });
    }
  }

  private update(patch: Partial<PreviewState>) {
    this.state = { ...this.state, ...patch };
    this.onChange(this.state);
  }
}
