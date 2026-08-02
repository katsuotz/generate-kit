export interface ProjectResponse {
  id: string;
  name: string;
}

export interface DocumentResponse {
  id: string;
  project_id: string;
  name: string;
  revision_id: string;
  revision_number: number;
  source: string;
}
