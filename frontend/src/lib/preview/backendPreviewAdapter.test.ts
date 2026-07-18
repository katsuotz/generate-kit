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
});
