import { describe, expect, it, vi } from 'vitest';
import { BackendPreviewAdapter } from './backendPreviewAdapter';
import type { BackendClient } from '$lib/api/backendClient';

describe('BackendPreviewAdapter', () => {
  it('saves, polls, and loads the completed PDF artifact', async () => {
    const client = {
      loadDocument: vi.fn().mockResolvedValue({
        id: 'document-1',
        project_id: 'project-1',
        name: 'cv.tex',
        revision_id: 'revision-1',
        revision_number: 1,
        source: 'source'
      }),
      updateDocument: vi.fn().mockResolvedValue({
        id: 'document-1',
        project_id: 'project-1',
        name: 'cv.tex',
        revision_id: 'revision-2',
        revision_number: 2,
        source: 'updated source'
      }),
      createCompileJob: vi.fn().mockResolvedValue({
        id: 'job-1',
        revision_id: 'revision-2',
        profile: 'cv-xelatex',
        status: 'queued',
        diagnostics: [],
        artifact: null
      }),
      getCompileJob: vi.fn().mockResolvedValue({
        id: 'job-1',
        revision_id: 'revision-2',
        profile: 'cv-xelatex',
        status: 'succeeded',
        diagnostics: [],
        artifact: { id: 'artifact-1', media_type: 'application/pdf', bytes: 4, page_count: 1 }
      }),
      getArtifact: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]).buffer)
    } as unknown as BackendClient;
    const adapter = new BackendPreviewAdapter(client);
    await adapter.initialize('source');

    const result = await adapter.render('updated source');

    expect(result).toMatchObject({
      kind: 'success',
      representation: 'pdf',
      artifactId: 'artifact-1',
      pageCount: 1
    });
    expect(client.updateDocument).toHaveBeenCalledWith('document-1', 'updated source', undefined);
    expect(client.createCompileJob).toHaveBeenCalledWith('document-1', 'revision-2', undefined);
  });

  it('does not let an aborted stale render cancel the newer compile job', async () => {
    let resolveArtifact!: (data: ArrayBuffer) => void;
    const artifact = new Promise<ArrayBuffer>((resolve) => (resolveArtifact = resolve));
    const client = {
      loadDocument: vi.fn().mockResolvedValue({
        id: 'document-1',
        project_id: 'project-1',
        name: 'cv.tex',
        revision_id: 'revision-initial',
        revision_number: 1,
        source: 'initial'
      }),
      updateDocument: vi.fn().mockImplementation((_id, source) =>
        Promise.resolve({
          id: 'document-1',
          project_id: 'project-1',
          name: 'cv.tex',
          revision_id: `revision-${source}`,
          revision_number: source === 'old' ? 2 : 3,
          source
        })
      ),
      createCompileJob: vi.fn().mockImplementation((_id, revisionId) =>
        Promise.resolve({
          id: revisionId === 'revision-old' ? 'job-old' : 'job-new',
          revision_id: revisionId,
          profile: 'cv-xelatex',
          status: revisionId === 'revision-old' ? 'queued' : 'succeeded',
          diagnostics: [],
          artifact:
            revisionId === 'revision-old'
              ? null
              : { id: 'artifact-new', media_type: 'application/pdf', bytes: 4, page_count: 1 }
        })
      ),
      getCompileJob: vi.fn(),
      getArtifact: vi.fn().mockReturnValue(artifact),
      cancelCompileJob: vi.fn().mockResolvedValue(undefined)
    } as unknown as BackendClient;
    const adapter = new BackendPreviewAdapter(client);
    await adapter.initialize('initial');
    const oldAbort = new AbortController();

    const oldRender = adapter.render('old', oldAbort.signal);
    await vi.waitFor(() => expect(client.createCompileJob).toHaveBeenCalledTimes(1));
    const newRender = adapter.render('new');
    await vi.waitFor(() =>
      expect(client.getArtifact).toHaveBeenCalledWith('artifact-new', undefined)
    );
    oldAbort.abort();
    await expect(oldRender).rejects.toMatchObject({ name: 'AbortError' });

    expect(client.cancelCompileJob).toHaveBeenCalledWith('job-old');
    expect(client.cancelCompileJob).not.toHaveBeenCalledWith('job-new');
    resolveArtifact(new Uint8Array([37, 80, 68, 70]).buffer);
    await expect(newRender).resolves.toMatchObject({ artifactId: 'artifact-new' });
  });
});
