import {
  BackendClient,
  type CompileJobResponse,
  type DiagnosticResponse,
  type DocumentResponse
} from '$lib/api/backendClient';
import type { PreviewAdapter, PreviewDiagnostic, PreviewResult } from './types';

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60_000;

export class BackendPreviewAdapter implements PreviewAdapter {
  private document: DocumentResponse | null = null;
  private activeJobId: string | null = null;
  private renderId = 0;

  constructor(private readonly client: BackendClient) {}

  get documentSource() {
    return this.document?.source ?? null;
  }

  async initialize(initialSource: string) {
    this.document = await this.client.loadDocument(initialSource);
    return this.document;
  }

  async render(source: string, signal?: AbortSignal): Promise<PreviewResult> {
    if (!source.trim()) return { kind: 'empty' };
    const renderId = ++this.renderId;
    this.document ??= await this.client.loadDocument(source);

    const document =
      this.document.source === source
        ? this.document
        : await this.client.updateDocument(this.document.id, source, signal);
    this.document = document;
    const job = await this.client.createCompileJob(document.id, document.revision_id, signal);
    if (renderId !== this.renderId || signal?.aborted) {
      await this.cancelJob(job.id);
      throw new DOMException('Preview cancelled', 'AbortError');
    }
    this.activeJobId = job.id;

    try {
      const completed = await this.waitForCompletion(job, signal);
      if (completed.status !== 'succeeded' || !completed.artifact) {
        return {
          kind: 'failure',
          diagnostics: mapDiagnostics(completed.diagnostics, completed.status)
        };
      }

      const data = await this.client.getArtifact(completed.artifact.id, signal);
      return {
        kind: 'success',
        representation: 'pdf',
        source,
        data,
        artifactId: completed.artifact.id,
        pageCount: completed.artifact.page_count
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError')
        await this.cancelJob(job.id);
      throw error;
    } finally {
      if (this.activeJobId === job.id) this.activeJobId = null;
    }
  }

  async cancel() {
    const jobId = this.activeJobId;
    if (jobId) await this.cancelJob(jobId);
  }

  private async waitForCompletion(
    initial: CompileJobResponse,
    signal?: AbortSignal
  ): Promise<CompileJobResponse> {
    let job = initial;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (job.status === 'queued' || job.status === 'running') {
      await abortableDelay(POLL_INTERVAL_MS, signal);
      if (Date.now() >= deadline) {
        await this.cancelJob(job.id);
        throw new Error('Compilation timed out while waiting for the backend worker.');
      }
      job = await this.client.getCompileJob(job.id, signal);
    }

    return job;
  }

  private async cancelJob(jobId: string) {
    await this.client.cancelCompileJob(jobId).catch(() => undefined);
    if (this.activeJobId === jobId) this.activeJobId = null;
  }
}

function mapDiagnostics(
  diagnostics: DiagnosticResponse[],
  status: CompileJobResponse['status']
): PreviewDiagnostic[] {
  if (diagnostics.length > 0) {
    return diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity === 'warning' ? 'warning' : 'error',
      message: diagnostic.message,
      code: diagnostic.code,
      line: diagnostic.line ?? 1,
      column: diagnostic.column ?? 1,
      file: diagnostic.file ?? undefined
    }));
  }

  return [
    {
      severity: 'error',
      message: `Compilation ${status}.`,
      code: `COMPILE_${status.toUpperCase()}`,
      line: 1,
      column: 1
    }
  ];
}

function abortableDelay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Preview cancelled', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(new DOMException('Preview cancelled', 'AbortError'));
      },
      { once: true }
    );
  });
}
