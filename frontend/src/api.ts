import type {
  SystemStatus,
  ServiceInfo,
  Incident,
  IncidentDetails,
  IncidentReport,
  VerificationResult
} from './types';

const API_BASE = '/api';

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to load system status');
  return res.json();
}

export async function fetchServices(): Promise<ServiceInfo[]> {
  const res = await fetch(`${API_BASE}/services`);
  if (!res.ok) throw new Error('Failed to fetch services');
  const data = await res.json();
  return data.services;
}

export async function injectFault(service: string, faultType: string): Promise<any> {
  const res = await fetch(`${API_BASE}/services/fault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, fault_type: faultType }),
  });
  if (!res.ok) throw new Error('Failed to inject fault');
  return res.json();
}

export async function resetServices(): Promise<any> {
  const res = await fetch(`${API_BASE}/services/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset services');
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  const data = await res.json();
  return data.incidents;
}

export async function createIncident(serviceId: string, title?: string): Promise<{ incident_id: string; state: string; evidence_collected: string[] }> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: serviceId, title }),
  });
  if (!res.ok) throw new Error('Failed to create incident');
  return res.json();
}

export async function fetchIncidentDetails(incidentId: string): Promise<IncidentDetails> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}`);
  if (!res.ok) throw new Error(`Failed to load incident ${incidentId}`);
  return res.json();
}

export async function triggerDiagnosis(incidentId: string, forceOffline: boolean = false): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/diagnose?force_offline=${forceOffline}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Diagnosis failed' }));
    throw new Error(err.detail || 'Inference error');
  }
  return res.json();
}

export async function decideApproval(
  approvalId: string,
  decision: 'approved' | 'rejected' | 'cancelled',
  operator: string = 'operator@sentinel.internal',
  reason: string = ''
): Promise<any> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, operator, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Approval decision failed' }));
    throw new Error(typeof err.detail === 'object' ? err.detail.message : err.detail);
  }
  return res.json();
}

export async function executeRecovery(
  incidentId: string,
  approvalId: string,
  service: string,
  tool: string,
  args: Record<string, any>,
  fastVerify: boolean = false
): Promise<{ success: boolean; incident_state: string; verification: VerificationResult }> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approval_id: approvalId,
      service,
      tool,
      arguments: args,
      fast_verify: fastVerify
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Execution failed' }));
    throw new Error(typeof err.detail === 'object' ? err.detail.message : err.detail);
  }
  return res.json();
}

export async function fetchIncidentReport(incidentId: string): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/report`);
  if (!res.ok) throw new Error('Failed to load incident report');
  return res.json();
}
