import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';
import type { IncidentReport } from '../types';

interface ReportModalProps {
  report: IncidentReport | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(report.markdown_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report.markdown_report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-incident-${report.incident.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="var(--teal-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Incident Audit & Post-Mortem Report ({report.incident.id})
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px'
              }}
            >
              {copied ? <Check size={14} color="var(--status-healthy)" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Markdown'}
            </button>

            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--teal-primary)',
                color: '#042f2e',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Download size={14} />
              Download .md
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          backgroundColor: 'var(--bg-primary)',
          fontSize: '13px',
          lineHeight: 1.6
        }}>
          <pre className="font-mono" style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
            {report.markdown_report}
          </pre>
        </div>
      </div>
    </div>
  );
};
