import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendClient } from './backendClient';
import { blankCv } from '$lib/cv/model';

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

const draft = {
  schemaVersion: 1,
  data: blankCv(),
  templateId: 'editorial-v1',
  lastGeneratedSource: '',
  generatedAt: null,
  fingerprint: ''
};

describe('BackendClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an anonymous document workspace without browser storage', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(session))
      .mockResolvedValueOnce(jsonResponse({ id: 'project-1', name: 'My CV' }))
      .mockResolvedValueOnce(jsonResponse(document));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new BackendClient().loadDocument('initial source');

    expect(result).toEqual(document);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.length).toBe(0);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('hydrates or creates the server-backed CV session and serializes metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(session))
      .mockResolvedValueOnce(jsonResponse({ code: 'not_found' }, 404))
      .mockResolvedValueOnce(jsonResponse({ id: 'cv-1', version: 1, ...draft }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'cv-1', version: 2, ...draft }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new BackendClient();

    await expect(client.bootstrapCvSession(draft)).resolves.toMatchObject({
      id: 'cv-1',
      version: 1
    });
    await expect(client.saveCvSession('cv-1', draft, 1)).resolves.toMatchObject({ version: 2 });

    expect(fetchMock.mock.calls[2]?.[0]).toContain('/api/v1/cv/session');
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toMatchObject({
      schema_version: 1,
      template_id: 'editorial-v1',
      generated_source: '',
      expected_version: 1
    });
  });

  it('supports cookie-backed account actions without requiring anonymous auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user: { id: 'user-1', email: 'ada@example.com' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new BackendClient();

    await expect(client.login('ada@example.com', 'password123')).resolves.toMatchObject({
      email: 'ada@example.com'
    });
    await expect(client.logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/v1/auth/login');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
