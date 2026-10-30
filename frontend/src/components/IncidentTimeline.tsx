import React from 'react';
import { CheckCircle2, Clock, PlayCircle, ShieldAlert, Sparkles, Activity, XCircle } from 'lucide-react';
import type { IncidentState } from '../types';

interface IncidentTimelineProps {
  currentState: IncidentState;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ currentState }) => {
  const steps: { key: string; label: string; icon: React.ReactNode; matchStates: IncidentState[] }[] = [
    {
      key: 'investigating',
      label: 'Telemetry Collection',
      icon: <Activity size={14} />,
      matchStates: ['Investigating', 'Awaiting approval', 'Executing', 'Verifying', 'Recovered', 'Unresolved']
    },
    {
      key: 'diagnosis',
      label: 'Nemotron Diagnosis',
      icon: <Sparkles size={14} />,
      matchStates: ['Awaiting approval', 'Executing', 'Verifying', 'Recovered', 'Unresolved']
    },
    {
      key: 'approval',
      label: 'Approval Gate',
      icon: <ShieldAlert size={14} />,
      matchStates: ['Awaiting approval', 'Executing', 'Verifying', 'Recovered', 'Unresolved']
    },
    {
      key: 'executing',
      label: 'Execution',
      icon: <PlayCircle size={14} />,
      matchStates: ['Executing', 'Verifying', 'Recovered', 'Unresolved']
    },
    {
      key: 'verifying',
      label: '3x Probes + API Test',
      icon: <Clock size={14} />,
      matchStates: ['Verifying', 'Recovered', 'Unresolved']
    },
    {
      key: 'verdict',
      label: currentState === 'Recovered' ? 'Recovered' : currentState === 'Unresolved' ? 'Unresolved' : 'Recovery Verdict',
      icon: currentState === 'Recovered' ? <CheckCircle2 size={14} /> : currentState === 'Unresolved' ? <XCircle size={14} /> : <CheckCircle2 size={14} />,
      matchStates: ['Recovered', 'Unresolved']
    }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      {steps.map((step, idx) => {
        const isCompleted = step.matchStates.includes(currentState) && currentState !== step.matchStates[0];
        const isCurrent = currentState === 'Investigating' && step.key === 'investigating'
          || currentState === 'Awaiting approval' && step.key === 'approval'
          || currentState === 'Executing' && step.key === 'executing'
          || currentState === 'Verifying' && step.key === 'verifying'
          || (currentState === 'Recovered' || currentState === 'Unresolved') && step.key === 'verdict';

        let badgeBg = 'var(--bg-card)';
        let badgeColor = 'var(--text-muted)';
        let borderColor = 'var(--border-subtle)';

        if (isCurrent) {
          if (currentState === 'Recovered') {
            badgeBg = 'rgba(16, 185, 129, 0.2)';
            badgeColor = 'var(--status-healthy)';
            borderColor = 'var(--status-healthy)';
          } else if (currentState === 'Unresolved') {
            badgeBg = 'rgba(244, 63, 94, 0.2)';
            badgeColor = 'var(--status-unhealthy)';
            borderColor = 'var(--status-unhealthy)';
          } else if (currentState === 'Awaiting approval') {
            badgeBg = 'rgba(245, 158, 11, 0.2)';
            badgeColor = 'var(--status-warning)';
            borderColor = 'var(--status-warning)';
          } else {
            badgeBg = 'rgba(20, 184, 166, 0.2)';
            badgeColor = 'var(--teal-light)';
            borderColor = 'var(--teal-primary)';
          }
        } else if (isCompleted) {
          badgeBg = 'rgba(20, 184, 166, 0.1)';
          badgeColor = 'var(--teal-light)';
          borderColor = 'rgba(20, 184, 166, 0.4)';
        }

        return (
          <React.Fragment key={step.key}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: badgeBg,
              border: `1px solid ${borderColor}`,
              color: badgeColor,
              fontSize: '12px',
              fontWeight: isCurrent ? 700 : 500
            }}>
              {step.icon}
              <span>{step.label}</span>
            </div>

            {idx < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                margin: '0 8px',
                backgroundColor: isCompleted ? 'var(--teal-dark)' : 'var(--border-subtle)'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
