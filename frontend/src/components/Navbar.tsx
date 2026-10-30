import React from 'react';
import { Shield, Cpu, RefreshCw, AlertTriangle, PlusCircle, Terminal } from 'lucide-react';
import type { SystemStatus } from '../types';

interface NavbarProps {
  status: SystemStatus | null;
  onInjectFault: () => void;
  onReset: () => void;
  onNewIncident: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  onInjectFault,
  onReset,
  onNewIncident,
  isLoading
}) => {
  const isLive = status?.nebius_integration?.mode === 'LIVE_NEBIUS_TOKEN_FACTORY';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: 'rgba(20, 184, 166, 0.12)',
          border: '1px solid var(--teal-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--teal-primary)'
        }}>
          <Shield size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' }}>
              SENTINEL
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(20, 184, 166, 0.2)',
              color: 'var(--teal-light)',
              border: '1px solid var(--teal-dark)'
            }}>
              v1.0 MVP
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Autonomous Incident Diagnosis & Approval-Gated Recovery
          </div>
        </div>
      </div>

      {/* Model & Inference Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px'
        }}>
          <Cpu size={15} color={isLive ? 'var(--teal-light)' : 'var(--status-warning)'} />
          <span style={{ color: 'var(--text-secondary)' }}>Inference:</span>
          <span style={{ fontWeight: 600, color: '#fff' }}>
            {status?.nebius_integration?.model_id?.split('/').pop() || 'Nemotron-70B'}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            backgroundColor: isLive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: isLive ? 'var(--status-healthy)' : 'var(--status-warning)',
            border: isLive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'
          }}>
            {isLive ? 'Live Nebius' : 'Offline Fixture'}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <Terminal size={14} />
          <span>Single-use 5m Gatekeeper</span>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onInjectFault}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fda4af',
            fontSize: '12px',
            fontWeight: 600
          }}
          title="Injects reproducible configuration fault (DB_PORT 5432 -> 5433) into payments-gateway"
        >
          <AlertTriangle size={14} />
          Inject Fault
        </button>

        <button
          onClick={onReset}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500
          }}
          title="Resets demo service back to clean golden baseline"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Reset Demo
        </button>

        <button
          onClick={onNewIncident}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--teal-primary)',
            color: '#042f2e',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          <PlusCircle size={15} />
          New Incident
        </button>
      </div>
    </header>
  );
};
