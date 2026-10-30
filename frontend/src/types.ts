export interface NebiusIntegration {
  endpoint: string;
  model_id: string;
  live_key_configured: boolean;
  mode: 'LIVE_NEBIUS_TOKEN_FACTORY' | 'OFFLINE_FIXTURE_MODE';
  blocked_checks: string[];
}

export interface SecurityPolicy {
  whitelisted_tools: string[];
  approval_expiry_seconds: number;
  probe_duration_seconds: number;
}

export interface SystemStatus {
  status: string;
  system: string;
  nebius_integration: NebiusIntegration;
  security_policy: SecurityPolicy;
}

export interface ServiceInfo {
  id: string;
  name: string;
  is_control: boolean;
  status: 'healthy' | 'unhealthy';
  code: number;
  config_hash: string;
  is_golden: boolean;
  fault?: string | null;
  health_details: {
    status: string;
    code: number;
    error?: string;
    latency_ms: number;
    database: string;
    connection_pool: string;
    config_hash: string;
  };
}

export type IncidentState =
  | 'Investigating'
  | 'Awaiting approval'
  | 'Executing'
  | 'Verifying'
  | 'Recovered'
  | 'Unresolved'
  | 'Cancelled';

export interface Incident {
  id: string;
  service_id: string;
  title: string;
  state: IncidentState;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface Evidence {
  id: string;
  incident_id: string;
  source: 'get_health' | 'get_config_diff' | 'get_logs';
  timestamp: string;
  sanitized_content: string;
  raw_content?: string;
  metadata?: string;
}

export interface TraceMetadata {
  endpoint_host: string;
  model_id: string;
  timestamp: string;
  duration_ms: number;
  request_id?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  source_mode: string;
  blocked_reason?: string | null;
}

export interface Diagnosis {
  id: string;
  incident_id: string;
  hypothesis: string;
  evidence_ids: string[];
  uncertainty: number;
  uncertainty_label?: string;
  proposed_tool: string;
  typed_arguments: Record<string, any>;
  expected_effect: string;
  risk: 'Low' | 'Medium' | 'High';
  rollback_procedure: string;
  proposal_hash: string;
  source_mode: string;
  trace_metadata?: TraceMetadata;
  created_at: string;
}

export interface Approval {
  id: string;
  incident_id: string;
  diagnosis_id: string;
  service_id: string;
  tool: string;
  normalized_arguments: string;
  proposal_hash: string;
  config_hash_at_approval: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'consumed' | 'invalidated';
  created_at: string;
  expires_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  rejection_reason?: string | null;
}

export interface Action {
  id: string;
  incident_id: string;
  approval_id: string;
  tool: string;
  arguments: string;
  executed_at: string;
  result: string;
  success: number;
}

export interface VerificationProbe {
  probe_number: number;
  timestamp: string;
  status: 'healthy' | 'unhealthy';
  latency_ms: number;
  details: any;
}

export interface VerificationResult {
  incident_id: string;
  final_outcome: 'Recovered' | 'Unresolved';
  all_probes_healthy: boolean;
  probes: VerificationProbe[];
  functional_result?: {
    success: boolean;
    status_code: number;
    operation: string;
    payload?: any;
    response?: any;
    error?: string;
    timestamp: string;
  };
  failure_reason?: string | null;
  verified_at: string;
}

export interface IncidentDetails {
  incident: Incident;
  evidence: Evidence[];
  diagnoses: Diagnosis[];
  approvals: Approval[];
  actions: Action[];
  verifications: any[];
}

export interface IncidentReport {
  incident: Incident;
  evidence: Evidence[];
  diagnoses: Diagnosis[];
  approvals: Approval[];
  actions: Action[];
  verifications: any[];
  markdown_report: string;
}
