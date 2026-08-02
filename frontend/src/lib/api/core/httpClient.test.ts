import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApiError } from './apiError';
import { HttpClient } from './httpClient';

describe('HttpClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shares anonymous sessions, sends credentials and bearer tokens, and handles 204/binary responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ session_id: 'session-1', token: 'token-1', expires_at: 'later' })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpClient();

    await expect(
      client.request<void>('/api/v1/one', { method: 'POST', body: '{}' })
    ).resolves.toBeUndefined();
    await expect(client.requestBinary('/api/v1/two')).resolves.toEqual(
      new Uint8Array([37, 80, 68, 70]).buffer
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ credentials: 'include' });
    expect(headersOf(fetchMock.mock.calls[1]?.[1])).toMatchObject({
      accept: 'application/json',
      authorization: 'Bearer token-1',
      'content-type': 'application/json'
    });
    expect(headersOf(fetchMock.mock.calls[2]?.[1])).toMatchObject({
      authorization: 'Bearer token-1'
    });
  });

  it('retries one unauthorized request with a fresh anonymous session', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ session_id: 'session-1', token: 'token-1', expires_at: 'later' })
      )
      .mockResolvedValueOnce(jsonResponse({ code: 'expired' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ session_id: 'session-2', token: 'token-2', expires_at: 'later' })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new HttpClient().request('/api/v1/retry')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(headersOf(fetchMock.mock.calls[3]?.[1])).toMatchObject({
      authorization: 'Bearer token-2'
    });
  });

  it('converts failed responses to BackendApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ code: 'bad_request', message: 'Nope' }, 400))
    );

    await expect(new HttpClient().request('/api/v1/fail')).rejects.toEqual(
      expect.objectContaining<Partial<BackendApiError>>({
        status: 400,
        code: 'bad_request',
        message: 'Nope'
      })
    );
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function headersOf(init: RequestInit | undefined) {
  if (!init) throw new Error('Expected request options.');
  return Object.fromEntries(new Headers(init.headers).entries());
}
