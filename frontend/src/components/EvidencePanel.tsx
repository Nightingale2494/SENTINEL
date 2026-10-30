import React, { useState } from 'react';
import { FileText, Activity, GitCompare, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import type { Evidence } from '../types';

interface EvidencePanelProps {
  evidence: Evidence[];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const [activeTab, setActiveTab] = useState<string>(evidence[0]?.id || '');
  const [showRaw, setShowRaw] = useState<boolean>(false);

  const selectedEvidence = evidence.find(e => e.id === activeTab) || evidence[0];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'get_health': return <Activity size={14} color="var(--status-warning)" />;
      case 'get_config_diff': return <GitCompare size={14} color="var(--teal-light)" />;
      case 'get_logs': return <FileText size={14} color="var(--status-info)" />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--teal-primary)" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            Collected Telemetry & Sanitized Evidence
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            color: 'var(--teal-light)'
          }}>
            {evidence.length} items
          </span>
        </div>

        <button
          onClick={() => setShowRaw(!showRaw)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px'
          }}
        >
          {showRaw ? <EyeOff size={13} /> : <Eye size={13} />}
          {showRaw ? 'Sanitized View' : 'Inspect Raw View'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-primary)',
        padding: '0 8px',
        overflowX: 'auto'
      }}>
        {evidence.map(e => {
          const isSelected = (e.id === (selectedEvidence?.id || activeTab));
          return (
            <button
              key={e.id}
              onClick={() => setActiveTab(e.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderBottom: isSelected ? '2px solid var(--teal-primary)' : '2px solid transparent',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                backgroundColor: 'transparent',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 400
              }}
            >
              {getSourceIcon(e.source)}
              <span className="font-mono">{e.id}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({e.source})</span>
            </button>
          );
        })}
      </div>

      {/* Evidence Viewer Body */}
      {selectedEvidence ? (
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <div>
              Source: <strong style={{ color: 'var(--text-primary)' }}>{selectedEvidence.source}()</strong>
            </div>
            <div>
              Captured: <span className="font-mono">{new Date(selectedEvidence.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--status-healthy)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              Anti-Injection Framing Active
            </div>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '12px',
            overflowY: 'auto',
            maxHeight: '340px',
            fontSize: '12px',
            lineHeight: 1.6
          }}>
            <pre className="font-mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e2e8f0' }}>
              {showRaw ? selectedEvidence.raw_content : selectedEvidence.sanitized_content}
            </pre>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No telemetry collected yet. Open an incident to collect scoped evidence.
        </div>
      )}
    </div>
  );
};
