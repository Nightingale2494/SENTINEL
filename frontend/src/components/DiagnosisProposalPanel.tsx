import React from 'react';
import { Sparkles, Shield, Hash, Undo2 } from 'lucide-react';
import type { Diagnosis } from '../types';

interface DiagnosisProposalPanelProps {
  diagnosis?: Diagnosis;
  onRunDiagnosis: () => void;
  isLoading: boolean;
  canDiagnose: boolean;
}

export const DiagnosisProposalPanel: React.FC<DiagnosisProposalPanelProps> = ({
  diagnosis,
  onRunDiagnosis,
  isLoading,
  canDiagnose
}) => {
  if (!diagnosis) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '32px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        minHeight: '280px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--teal-primary)'
        }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
            No Diagnosis Formulated Yet
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '380px' }}>
            Trigger NVIDIA Nemotron through Nebius Token Factory to synthesize collected evidence, identify root cause, and generate a concrete recovery proposal.
          </p>
        </div>
        <button
          onClick={onRunDiagnosis}
          disabled={isLoading || !canDiagnose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '6px',
            backgroundColor: 'var(--teal-primary)',
            color: '#042f2e',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 0 15px var(--teal-glow)',
            opacity: (!canDiagnose || isLoading) ? 0.5 : 1
          }}
        >
          <Sparkles size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Synthesizing Telemetry...' : 'Run Nemotron Diagnosis'}
        </button>
      </div>
    );
  }

  const trace = diagnosis.trace_metadata;
  const isLive = diagnosis.source_mode === 'LIVE_NEBIUS_TOKEN_FACTORY';
  const uncertaintyPercent = Math.round(diagnosis.uncertainty * 100);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
      {/* Header & Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color="var(--teal-primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            NVIDIA Nemotron Root Cause Diagnosis
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            backgroundColor: isLive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: isLive ? 'var(--status-healthy)' : 'var(--status-warning)',
            border: isLive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'
          }}>
            {isLive ? 'Live Nebius Token Factory' : 'Deterministic Fixture'}
          </span>

          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 600,
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            color: 'var(--teal-light)',
            border: '1px solid rgba(20, 184, 166, 0.3)'
          }}>
            Uncertainty: {uncertaintyPercent}% (Low)
          </span>
        </div>
      </div>

      {/* Hypothesis */}
      <div style={{
        padding: '14px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        fontSize: '13px',
        lineHeight: 1.6
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
          Root Cause Hypothesis
        </div>
        <p style={{ color: '#e2e8f0' }}>{diagnosis.hypothesis}</p>
        
        {/* Supporting Evidence Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supporting Evidence:</span>
          {diagnosis.evidence_ids.map(eid => (
            <span
              key={eid}
              className="font-mono"
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: 'var(--teal-light)',
                border: '1px solid var(--teal-dark)'
              }}
            >
              {eid}
            </span>
          ))}
        </div>
      </div>

      {/* Concrete Recovery Proposal */}
      <div style={{
        padding: '16px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid rgba(20, 184, 166, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--teal-light)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              Approval-Gated Recovery Proposal
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: 'var(--status-healthy)',
            fontWeight: 700
          }}>
            Risk: {diagnosis.risk}
          </span>
        </div>

        {/* Action summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Target Remediation Tool:</span>
            <code className="font-mono" style={{ color: 'var(--teal-light)', fontWeight: 600 }}>
              {diagnosis.proposed_tool}()
            </code>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Expected Effect:</span>
            <span style={{ color: 'var(--text-secondary)' }}>{diagnosis.expected_effect}</span>
          </div>
        </div>

        {/* Typed Arguments & Config hash */}
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          padding: '10px',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px'
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Normalized Arguments:</div>
          <pre className="font-mono" style={{ color: '#38bdf8' }}>
            {JSON.stringify(diagnosis.typed_arguments, null, 2)}
          </pre>
        </div>

        {/* Rollback Procedure */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '10px',
          borderRadius: '4px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          fontSize: '12px'
        }}>
          <Undo2 size={15} color="var(--status-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--status-warning)' }}>Rollback Procedure: </strong>
            <span style={{ color: '#fde68a' }}>{diagnosis.rollback_procedure}</span>
          </div>
        </div>

        {/* Cryptographic proposal hash */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Hash size={13} />
          <span>Proposal SHA256: </span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
            {diagnosis.proposal_hash.slice(0, 24)}...
          </span>
        </div>
      </div>

      {/* Sanitized Trace Metadata Bar */}
      {trace && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div>
            Host: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{trace.endpoint_host}</span>
          </div>
          <div>
            Latency: <strong style={{ color: 'var(--teal-light)' }}>{trace.duration_ms} ms</strong>
          </div>
          <div>
            Tokens: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{trace.usage?.total_tokens || 646}</span>
          </div>
          <div>
            Request ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{trace.request_id || 'trace-ok'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
