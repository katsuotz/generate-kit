import { describe, expect, it } from 'vitest';
import type { PreviewAdapter, PreviewResult } from '$lib/preview/types';
import { PreviewController, type PreviewState } from './previewController';

class DeferredAdapter implements PreviewAdapter {
  requests: Array<{ source: string; resolve: (result: PreviewResult) => void }> = [];

  render(source: string): Promise<PreviewResult> {
    return new Promise((resolve) => this.requests.push({ source, resolve }));
  }
}

describe('PreviewController', () => {
  it('ignores stale responses', async () => {
    const adapter = new DeferredAdapter();
    let latest: PreviewState | undefined;
    const controller = new PreviewController(adapter, (state) => (latest = state));

    const oldRequest = controller.compile('old');
    const newRequest = controller.compile('new');
    adapter.requests[1].resolve({
      kind: 'success',
      representation: 'pdf',
      source: 'new',
      data: new Uint8Array([37, 80, 68, 70]).buffer,
      artifactId: 'new-artifact',
      pageCount: 1
    });
    await newRequest;
    adapter.requests[0].resolve({
      kind: 'success',
      representation: 'pdf',
      source: 'old',
      data: new Uint8Array([37, 80, 68, 70]).buffer,
      artifactId: 'old-artifact',
      pageCount: 1
    });
    await oldRequest;

    expect(latest?.lastSuccess?.source).toBe('new');
  });

  it('preserves the last successful preview after a failure', async () => {
    const adapter = new DeferredAdapter();
    let latest: PreviewState | undefined;
    const controller = new PreviewController(adapter, (state) => (latest = state));

    const success = controller.compile('good');
    adapter.requests[0].resolve({
      kind: 'success',
      representation: 'pdf',
      source: 'good',
      data: new Uint8Array([37, 80, 68, 70, 45, 49]).buffer,
      artifactId: 'good-artifact',
      pageCount: 1
    });
    await success;
    const failure = controller.compile('bad');
    adapter.requests[1].resolve({
      kind: 'failure',
      diagnostics: [{ severity: 'error', message: 'Bad', line: 1, column: 1, code: 'BAD' }]
    });
    await failure;

    expect(latest?.status).toBe('failure');
    expect(latest?.lastSuccess?.artifactId).toBe('good-artifact');
    expect(new Uint8Array(latest?.lastSuccess?.data ?? []).slice(0, 4)).toEqual(
      new Uint8Array([37, 80, 68, 70])
    );
  });
});
