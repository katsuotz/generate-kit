import { HttpClient } from '../core/httpClient';
import { normalizeTemplateCatalog } from './serialization';
import type { CvTemplateSummary } from './types';

export interface TemplatesApi {
  list(): Promise<CvTemplateSummary[]>;
  getPreview(templateId: string, signal?: AbortSignal): Promise<ArrayBuffer>;
}

export class TemplatesApiClient implements TemplatesApi {
  constructor(private readonly http: HttpClient = new HttpClient()) {}

  async list() {
    const response = await this.http.request<unknown>('/api/v1/cv/templates');
    return normalizeTemplateCatalog(response);
  }

  getPreview(templateId: string, signal?: AbortSignal) {
    return this.http.requestBinary(
      `/api/v1/cv/templates/${encodeURIComponent(templateId)}/preview`,
      {
        signal
      }
    );
  }
}
