import React from 'react';
import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import type { IncidentState } from '../types';

interface VerificationPanelProps {
  verifications: any[];
  incidentState: IncidentState;
  isLoading: boolean;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  verifications,
  incidentState,
  isLoading
}) => {
  if (verifications.length === 0 && incidentState !== 'Verifying' && incidentState !== 'Recovered' && incidentState !== 'Unresolved') {
    return (
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}>
        Post-remediation verification results will stream here following write execution.
      </div>
    );
  }

  const isRecovered = incidentState === 'Recovered';
  const isUnresolved = incidentState === 'Unresolved';

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="var(--teal-light)" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            Multi-Probe Verification & Functional Test
          </h3>
        </div>

        {/* Verdict Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          backgroundColor: isRecovered ? 'rgba(16, 185, 129, 0.2)' : isUnresolved ? 'rgba(244, 63, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)',
          border: isRecovered ? '1px solid var(--status-healthy)' : isUnresolved ? '1px solid var(--status-unhealthy)' : '1px solid var(--status-purple)',
          color: isRecovered ? 'var(--status-healthy)' : isUnresolved ? 'var(--status-unhealthy)' : 'var(--status-purple)',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          {isRecovered ? <CheckCircle2 size={14} /> : isUnresolved ? <XCircle size={14} /> : <Clock size={14} />}
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isLoading && <span className="animate-spin">⏳</span>}
            {isRecovered ? 'Recovered' : isUnresolved ? 'Unresolved' : 'Probing Service...'}
          </span>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
        Strict Verification Policy: 3 consecutive healthy probes + 1 functional API checkout transaction. A successful write alone never produces Recovered.
      </div>

      {/* Probes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[1, 2, 3].map(probeNum => {
          const recorded = verifications.find(v => v.probe_number === probeNum);
          const isHealthy = recorded?.probe_status === 'healthy';

          return (
            <div
              key={probeNum}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: recorded ? (isHealthy ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)') : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Probe #{probeNum}</span>
                {recorded ? (
                  isHealthy ? <CheckCircle2 size={14} color="var(--status-healthy)" /> : <XCircle size={14} color="var(--status-unhealthy)" />
                ) : (
                  <Clock size={14} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: recorded ? (isHealthy ? 'var(--status-healthy)' : 'var(--status-unhealthy)') : 'var(--text-muted)' }}>
                {recorded ? (isHealthy ? '200 OK Healthy' : 'Probe Failed') : 'Pending'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {recorded ? `Latency: ${recorded.probe_latency_ms}ms` : 'Waiting interval...'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Functional API Test Result */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} color="var(--teal-light)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
              Functional E2E Transaction Test: POST /api/v1/charge
            </span>
          </div>

          {verifications.length > 0 && verifications[verifications.length - 1]?.functional_test_status && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              backgroundColor: verifications[verifications.length - 1].functional_test_status === 'passed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              color: verifications[verifications.length - 1].functional_test_status === 'passed' ? 'var(--status-healthy)' : 'var(--status-unhealthy)'
            }}>
              {verifications[verifications.length - 1].functional_test_status.toUpperCase()}
            </span>
          )}
        </div>

        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#cbd5e1',
          overflowX: 'auto'
        }}>
          {verifications.length > 0 && verifications[verifications.length - 1]?.functional_test_details ? (
            verifications[verifications.length - 1].functional_test_details
          ) : (
            'Awaiting 3 healthy probes before executing functional authorization test...'
          )}
        </div>
      </div>
    </div>
  );
};
