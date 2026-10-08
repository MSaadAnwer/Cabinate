import React from 'react';
import type { RawIngestPayload, IngestPayloadRequest } from '../../types/ingest';
import { IngestForm } from './IngestForm';
import { IngestPayloadList } from './IngestPayloadList';

interface IngestDashboardProps {
  payloads: RawIngestPayload[];
  onIngest: (payload: IngestPayloadRequest) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  isLoading: boolean;
}

export const IngestDashboard: React.FC<IngestDashboardProps> = ({
  payloads,
  onIngest,
  onUpdateStatus,
  isLoading,
}) => {
  return (
    <div className="container">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-content text-left">
          <h1>Import Recipes</h1>
          <p>
            Paste recipe text, HTML, or JSON to keep it ready for processing.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Ingest Form Card */}
        <IngestForm onIngest={onIngest} />

        {/* Payload Queue & Audit Log */}
        <IngestPayloadList
          payloads={payloads}
          onUpdateStatus={onUpdateStatus}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
