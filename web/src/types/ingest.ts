export interface RawIngestPayload {
  id: string;
  source: string;
  sourceUrl?: string | null;
  contentType: string;
  payload: string;
  metadata?: Record<string, any> | null;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestPayloadRequest {
  source: string;
  sourceUrl?: string;
  contentType?: string;
  payload: string;
  metadata?: Record<string, any>;
}

export interface UpdateIngestStatusRequest {
  status: string;
}
