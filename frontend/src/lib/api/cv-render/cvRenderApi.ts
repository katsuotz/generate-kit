import { HttpClient } from '../core/httpClient';
import { normalizeCvRender, serializeCvRender } from './serialization';
import type { CvRenderRequest, CvRenderResponse } from './types';

export interface CvRenderApi {
  render(request: CvRenderRequest, signal?: AbortSignal): Promise<CvRenderResponse>;
}

export class CvRenderApiClient implements CvRenderApi {
  constructor(private readonly http: HttpClient = new HttpClient()) {}

  async render(request: CvRenderRequest, signal?: AbortSignal) {
    const response = await this.http.request<unknown>('/api/v1/cv/render', {
      method: 'POST',
      body: JSON.stringify(serializeCvRender(request)),
      signal
    });
    return normalizeCvRender(response);
  }
}
