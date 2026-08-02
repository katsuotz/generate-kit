import type { CvData } from '$lib/cv/model';

export interface CvSessionDraft {
  schemaVersion: number;
  data: CvData;
  templateId: string;
  lastGeneratedSource: string;
  generatedAt: string | null;
  fingerprint: string;
}

export interface CvSessionResponse extends CvSessionDraft {
  id: string;
  version: number;
  projectId?: string;
  documentId?: string;
}
