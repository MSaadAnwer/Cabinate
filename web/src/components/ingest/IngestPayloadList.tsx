import React, { useState } from 'react';
import type { RawIngestPayload } from '../../types/ingest';
import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface IngestPayloadListProps {
  payloads: RawIngestPayload[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  isLoading: boolean;
}

export const IngestPayloadList: React.FC<IngestPayloadListProps> = ({
  payloads,
  onUpdateStatus,
  isLoading,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PROCESSED':
        return (
          <span className="badge badge-processed">
            <CheckCircle2 size={11} />
            PROCESSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-failed">
            <XCircle size={11} />
            FAILED
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge badge-pending">
            <Clock size={11} />
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Ingestion Queue & Audit Log</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Unprocessed payloads staged for Databricks PySpark extraction and Snowflake loading.
          </p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <strong>{payloads.length}</strong> {payloads.length === 1 ? 'payload' : 'payloads'} recorded
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Loading payloads...</p>
        </div>
      ) : payloads.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No payloads ingested yet. Use the form above to submit data or seed sample payloads.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payloads.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => toggleExpand(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {getStatusBadge(item.status)}
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                      {item.source}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.contentType}
                    </span>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-emerald-light)', textDecoration: 'none' }}
                      >
                        <span>Source</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Payload Content */}
                {isExpanded && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Payload Snapshot (ID: {item.id}):
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.status !== 'PROCESSED' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => onUpdateStatus(item.id, 'PROCESSED')}
                          >
                            Mark as Processed
                          </button>
                        )}
                        {item.status !== 'PENDING' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => onUpdateStatus(item.id, 'PENDING')}
                          >
                            Reset to Pending
                          </button>
                        )}
                      </div>
                    </div>
                    <pre
                      style={{
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {item.payload}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
