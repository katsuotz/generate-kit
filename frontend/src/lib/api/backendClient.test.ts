import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendClient } from './backendClient';

const session = {
  session_id: 'session-1',
  token: 'token-1',
  expires_at: new Date(Date.now() + 60_000).toISOString()
};

const document = {
  id: 'document-1',
  project_id: 'project-1',
  name: 'cv.tex',
  revision_id: 'revision-1',
  revision_number: 1,
  source: 'initial source'
};

describe('BackendClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates and persists an anonymous document workspace', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(session))
      .mockResolvedValueOnce(jsonResponse({ id: 'project-1', name: 'My CV' }))
      .mockResolvedValueOnce(jsonResponse(document));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new BackendClient().loadDocument('initial source');

    expect(result).toEqual(document);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(localStorage.getItem('latex-renderer.workspace.v1') ?? '{}')).toEqual({
      projectId: 'project-1',
      documentId: 'document-1'
    });
  });

  it('restores a persisted document instead of creating another project', async () => {
    localStorage.setItem('latex-renderer.session.v1', JSON.stringify(session));
    localStorage.setItem(
      'latex-renderer.workspace.v1',
      JSON.stringify({ projectId: 'project-1', documentId: 'document-1' })
    );
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(document));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new BackendClient().loadDocument('unused source')).resolves.toEqual(document);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/v1/documents/document-1');
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
