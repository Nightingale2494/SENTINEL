import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Check, X, Ban, Play, Clock } from 'lucide-react';
import type { Approval, IncidentState } from '../types';

interface ApprovalGatePanelProps {
  approval?: Approval;
  incidentState: IncidentState;
  onDecide: (decision: 'approved' | 'rejected' | 'cancelled', reason?: string) => void;
  onExecute: (fastVerify: boolean) => void;
  isLoading: boolean;
}

export const ApprovalGatePanel: React.FC<ApprovalGatePanelProps> = ({
  approval,
  incidentState,
  onDecide,
  onExecute,
  isLoading
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [fastVerify, setFastVerify] = useState<boolean>(true); // default fast for snappy operator workflow

  useEffect(() => {
    if (!approval || !approval.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(approval.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [approval]);

  if (!approval) {
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
        Approval gate will become active once NVIDIA Nemotron formulates a remediation proposal.
      </div>
    );
  }

  const isPending = approval.status === 'pending';
  const isApproved = approval.status === 'approved';
  const isRejected = approval.status === 'rejected';
  const isConsumed = approval.status === 'consumed';
  const canExecute = isApproved && (incidentState === 'Awaiting approval' || incidentState === 'Executing');

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
          <ShieldAlert size={18} color="var(--status-warning)" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            Operator Approval Gate (Single-Use Policy)
          </h3>
        </div>

        {/* Expiry Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          backgroundColor: isExpired ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.15)',
          border: isExpired ? '1px solid var(--status-unhealthy)' : '1px solid rgba(245, 158, 11, 0.3)',
          color: isExpired ? 'var(--status-unhealthy)' : 'var(--status-warning)',
          fontSize: '11px',
          fontWeight: 600
        }}>
          <Clock size={13} />
          <span>Validity Window: {timeLeft}</span>
        </div>
      </div>

      {/* Security Invariants Binding Box */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Approval Token:</span>
          <span className="font-mono" style={{ color: 'var(--teal-light)' }}>{approval.id}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Status:</span>
          <strong style={{
            textTransform: 'uppercase',
            color: isApproved ? 'var(--status-healthy)' : isRejected ? 'var(--status-unhealthy)' : isConsumed ? 'var(--teal-light)' : 'var(--status-warning)'
          }}>
            {approval.status}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Bound Service State Hash:</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
            {approval.config_hash_at_approval.slice(0, 16)}...
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Decided By:</span>
          <span style={{ color: 'var(--text-primary)' }}>{approval.decided_by || 'Awaiting Operator Action'}</span>
        </div>
      </div>

      {/* Operator Decision Buttons */}
      {isPending && !isExpired && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onDecide('approved')}
            disabled={isLoading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--status-healthy)',
              color: '#022c22',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <Check size={16} />
            Approve Remediation
          </button>

          <button
            onClick={() => onDecide('rejected', 'Operator rejected proposed change')}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fda4af',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <X size={16} />
            Reject
          </button>

          <button
            onClick={() => onDecide('cancelled', 'Incident cancelled')}
            disabled={isLoading}
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}
          >
            <Ban size={16} />
            Cancel
          </button>
        </div>
      )}

      {/* Execution Trigger (Unlocked after Approval) */}
      {isApproved && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--status-healthy)', fontWeight: 600 }}>
              ✓ Operator approval cryptographically locked. Ready to execute write.
            </span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fastVerify}
                onChange={e => setFastVerify(e.target.checked)}
              />
              <span>Fast Verification Mode (0.5s probes)</span>
            </label>
          </div>

          <button
            onClick={() => onExecute(fastVerify)}
            disabled={isLoading || !canExecute}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '6px',
              backgroundColor: 'var(--teal-primary)',
              color: '#042f2e',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 0 15px var(--teal-glow)'
            }}
          >
            <Play size={16} />
            {isLoading ? 'Executing & Verifying...' : 'Execute Recovery & Run Verification Probes'}
          </button>
        </div>
      )}

      {isConsumed && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          border: '1px solid var(--teal-dark)',
          color: 'var(--teal-light)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldCheck size={16} />
          <span>Single-use token has been consumed. Replay protection locked.</span>
        </div>
      )}
    </div>
  );
};
