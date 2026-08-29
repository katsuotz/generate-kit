import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApiError } from '$lib/api/core/apiError';
import type { CvSessionApi } from '$lib/api/cv-session/cvSessionApi';
import type { CvSessionDraft } from '$lib/api/cv-session/types';
import { SessionController } from './sessionController';

const draft = { value: 'draft' } as unknown as CvSessionDraft;
const session = { id: 'cv-1', version: 1, ...draft };

describe('SessionController', () => {
  beforeEach(() => vi.useRealTimers());

  it('debounces autosave and updates the optimistic version', async () => {
    vi.useFakeTimers();
    const api = {
      bootstrap: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      save: vi.fn().mockResolvedValue({ ...session, version: 2 })
    } as unknown as CvSessionApi;
    const controller = new SessionController(api, { getDraft: () => draft, applySession: vi.fn() });
    controller.hydrate(session);
    controller.schedule();
    await vi.advanceTimersByTimeAsync(699);
    expect(api.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(api.save).toHaveBeenCalledWith(draft, 1));
    expect(controller.currentVersion).toBe(2);
  });

  it('recovers from a version conflict with the latest session', async () => {
    const applySession = vi.fn();
    const latest = { ...session, version: 4 };
    const api = {
      bootstrap: vi.fn(),
      get: vi.fn().mockResolvedValue(latest),
      create: vi.fn(),
      save: vi
        .fn()
        .mockRejectedValueOnce(new BackendApiError('Conflict', 409, 'conflict'))
        .mockResolvedValueOnce({ ...session, version: 5 })
    } as unknown as CvSessionApi;
    const onNotice = vi.fn();
    const controller = new SessionController(api, {
      getDraft: () => draft,
      applySession,
      onNotice
    });
    controller.hydrate(session);
    applySession.mockClear();

    await expect(controller.flush(true)).resolves.toBe(true);
    expect(api.get).toHaveBeenCalledOnce();
    expect(applySession).not.toHaveBeenCalled();
    expect(api.save).toHaveBeenNthCalledWith(2, draft, 4);
    expect(controller.currentVersion).toBe(5);
    expect(onNotice).toHaveBeenCalledOnce();
  });

  it('does not loop or replace local edits when the conflict retry fails', async () => {
    const api = {
      bootstrap: vi.fn(),
      get: vi.fn().mockResolvedValue({ ...session, version: 4 }),
      create: vi.fn(),
      save: vi
        .fn()
        .mockRejectedValueOnce(new BackendApiError('Conflict', 409, 'conflict'))
        .mockRejectedValueOnce(new BackendApiError('Conflict', 409, 'conflict'))
    } as unknown as CvSessionApi;
    const applySession = vi.fn();
    const onNotice = vi.fn();
    const controller = new SessionController(api, {
      getDraft: () => draft,
      applySession,
      onNotice
    });
    controller.hydrate(session);
    applySession.mockClear();

    await expect(controller.flush(true)).resolves.toBe(false);
    expect(api.get).toHaveBeenCalledOnce();
    expect(api.save).toHaveBeenCalledTimes(2);
    expect(applySession).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      'Could not save after a newer version was found; your edits remain available in this tab.'
    );
  });
});
