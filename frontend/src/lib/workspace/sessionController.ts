import { BackendApiError } from '$lib/api/core/apiError';
import type { CvSessionApi } from '$lib/api/cv-session/cvSessionApi';
import type { CvSessionDraft, CvSessionResponse } from '$lib/api/cv-session/types';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SessionControllerOptions {
  getDraft: () => CvSessionDraft;
  applySession: (session: CvSessionResponse) => void;
  onStatus?: (status: AutosaveStatus) => void;
  onNotice?: (notice: string) => void;
  debounceMs?: number;
}

export class SessionController {
  private sessionId: string | null = null;
  private version = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight = false;
  private pending: Promise<boolean> | null = null;
  private queued = false;
  private disposed = false;

  constructor(
    private readonly api: CvSessionApi,
    private readonly options: SessionControllerOptions
  ) {}

  get id() {
    return this.sessionId;
  }

  get currentVersion() {
    return this.version;
  }

  async bootstrap(initial: CvSessionDraft) {
    const session = await this.api.bootstrap(initial);
    this.hydrate(session);
    return session;
  }

  hydrate(session: CvSessionResponse) {
    this.sessionId = session.id;
    this.version = session.version;
    this.options.applySession(session);
  }

  schedule() {
    if (!this.sessionId || this.disposed) return;
    this.queued = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.options.debounceMs ?? 700);
  }

  async flush(force = false): Promise<boolean> {
    if (!this.sessionId || this.disposed) return false;
    if (this.inFlight) {
      this.queued = true;
      if (force && this.timer) clearTimeout(this.timer);
      if (this.pending) await this.pending;
      return force && this.queued ? this.flush(true) : true;
    }

    this.inFlight = true;
    this.queued = false;
    this.options.onStatus?.('saving');
    const draft = this.options.getDraft();
    this.pending = this.save(draft);
    const result = await this.pending;
    this.pending = null;
    this.inFlight = false;

    if (this.queued && !this.disposed) {
      if (force) {
        this.queued = false;
        return this.flush(true);
      }
      this.schedule();
    }
    return result;
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async save(draft: CvSessionDraft) {
    try {
      const saved = await this.api.save(draft, this.version);
      this.version = saved.version;
      this.options.onStatus?.('saved');
      return true;
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 409) {
        try {
          const latest = await this.api.get();
          this.hydrate(latest);
          this.options.onStatus?.('saved');
          this.options.onNotice?.(
            'This CV changed in another session. The latest saved version is loaded.'
          );
        } catch {
          this.options.onStatus?.('error');
          this.options.onNotice?.('Autosave found a newer version, but could not recover it yet.');
        }
      } else {
        this.options.onStatus?.('error');
        this.options.onNotice?.(
          'Could not save this draft; your edits remain available in this tab.'
        );
      }
      return false;
    }
  }
}
