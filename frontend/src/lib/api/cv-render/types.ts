import type { CvData } from '$lib/cv/model';

export interface CvRenderRequest {
  templateId: string;
  data: CvData;
}

export interface CvRenderResponse {
  templateId: string;
  generatedSource: string;
  generatedAt: string;
}
