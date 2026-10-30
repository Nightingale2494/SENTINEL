import React, { useState, useEffect } from 'react';
import {
  Navbar
} from './components/Navbar';
import { IncidentTimeline } from './components/IncidentTimeline';
import { EvidencePanel } from './components/EvidencePanel';
import { DiagnosisProposalPanel } from './components/DiagnosisProposalPanel';
import { ApprovalGatePanel } from './components/ApprovalGatePanel';
import { VerificationPanel } from './components/VerificationPanel';
import { ReportModal } from './components/ReportModal';
import {
  fetchSystemStatus,
  fetchServices,
  fetchIncidents,
  createIncident,
  fetchIncidentDetails,
  triggerDiagnosis,
  decideApproval,
  executeRecovery,
  injectFault,
  resetServices,
  fetchIncidentReport
} from './api';
import type {
  SystemStatus,
  ServiceInfo,
  Incident,
  IncidentDetails,
  IncidentReport
} from './types';
import {
  AlertTriangle,
  Server,
  FileText,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentDetails, setIncidentDetails] = useState<IncidentDetails | null>(null);
  const [reportData, setReportData] = useState<IncidentReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadInitialData();
    const interval = setInterval(refreshTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  // When active incident changes, fetch details
  useEffect(() => {
    if (selectedIncidentId) {
      loadIncident(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [status, svcs, incs] = await Promise.all([
        fetchSystemStatus(),
        fetchServices(),
        fetchIncidents()
      ]);
      setSystemStatus(status);
      setServices(svcs);
      setIncidents(incs);
      if (incs.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(incs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTelemetry = async () => {
    try {
      const svcs = await fetchServices();
      setServices(svcs);
      if (selectedIncidentId) {
        const details = await fetchIncidentDetails(selectedIncidentId);
        setIncidentDetails(details);
      }
    } catch (e) {
      // Background poll silently handles intermittent network
    }
  };

  const loadIncident = async (id: string) => {
    try {
      setIsLoading(true);
      const details = await fetchIncidentDetails(id);
      setIncidentDetails(details);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenIncident = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await createIncident('payments-gateway', 'Payment Gateway Connection Pool Depleted');
      const incs = await fetchIncidents();
      setIncidents(incs);
      setSelectedIncidentId(res.incident_id);
      await loadIncident(res.incident_id);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectFault = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await injectFault('payments-gateway', 'DB_PORT_MISCONFIG');
      const svcs = await fetchServices();
      setServices(svcs);
      // Auto open incident for the fault
      await handleOpenIncident();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetServices = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await resetServices();
      const svcs = await fetchServices();
      setServices(svcs);
      if (selectedIncidentId) {
        await loadIncident(selectedIncidentId);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!selectedIncidentId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await triggerDiagnosis(selectedIncidentId);
      await loadIncident(selectedIncidentId);
      const incs = await fetchIncidents();
      setIncidents(incs);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecideApproval = async (decision: 'approved' | 'rejected' | 'cancelled', reason?: string) => {
    const latestAppr = incidentDetails?.approvals?.[0];
    if (!latestAppr || !selectedIncidentId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await decideApproval(latestAppr.id, decision, 'lead-operator@sentinel.internal', reason);
      await loadIncident(selectedIncidentId);
      const incs = await fetchIncidents();
      setIncidents(incs);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (fastVerify: boolean) => {
    const latestAppr = incidentDetails?.approvals?.[0];
    const latestDiag = incidentDetails?.diagnoses?.[0];
    if (!latestAppr || !latestDiag || !selectedIncidentId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await executeRecovery(
        selectedIncidentId,
        latestAppr.id,
        latestAppr.service_id,
        latestAppr.tool,
        latestDiag.typed_arguments,
        fastVerify
      );
      await loadIncident(selectedIncidentId);
      const [incs, svcs] = await Promise.all([fetchIncidents(), fetchServices()]);
      setIncidents(incs);
      setServices(svcs);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = async () => {
    if (!selectedIncidentId) return;
    try {
      setIsLoading(true);
      const report = await fetchIncidentReport(selectedIncidentId);
      setReportData(report);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentInc = incidentDetails?.incident;
  const latestDiag = incidentDetails?.diagnoses?.[0];
  const latestAppr = incidentDetails?.approvals?.[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        status={systemStatus}
        onInjectFault={handleInjectFault}
        onReset={handleResetServices}
        onNewIncident={handleOpenIncident}
        isLoading={isLoading}
      />

      {/* Global Error Notice */}
      {errorMessage && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
          padding: '10px 24px',
          color: '#fda4af',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ color: '#fda4af', background: 'transparent', fontSize: '14px', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
        {/* Left Sidebar: Services & Incident Queue */}
        <aside style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 65px)',
          overflowY: 'auto'
        }}>
          {/* Services Section */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Target Services
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {services.length} registered
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {services.map(svc => {
                const isHealthy = svc.status === 'healthy';
                return (
                  <div
                    key={svc.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: isHealthy ? '1px solid var(--border-subtle)' : '1px solid rgba(244, 63, 94, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>
                        {svc.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isHealthy ? 'var(--status-healthy)' : 'var(--status-unhealthy)'
                      }}>
                        {isHealthy ? '200 Healthy' : '503 Unhealthy'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Hash: <span className="font-mono">{svc.config_hash.slice(0, 8)}...</span></span>
                      {svc.is_control && (
                        <span style={{ color: 'var(--teal-light)', fontSize: '10px' }}>[Healthy Control]</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident Queue */}
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Incident Registry
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {incidents.length} total
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {incidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No incidents opened yet. Click "Inject Fault" to trigger a failure scenario.
                </div>
              ) : (
                incidents.map(inc => {
                  const isSelected = inc.id === selectedIncidentId;
                  const isRecovered = inc.state === 'Recovered';
                  const isUnresolved = inc.state === 'Unresolved';
                  const isAwaiting = inc.state === 'Awaiting approval';

                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        border: isSelected ? '1px solid var(--teal-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--teal-light)' : 'var(--text-secondary)' }}>
                          {inc.id}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isRecovered ? 'rgba(16, 185, 129, 0.2)' : isUnresolved ? 'rgba(244, 63, 94, 0.2)' : isAwaiting ? 'rgba(245, 158, 11, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                          color: isRecovered ? 'var(--status-healthy)' : isUnresolved ? 'var(--status-unhealthy)' : isAwaiting ? 'var(--status-warning)' : 'var(--status-info)'
                        }}>
                          {inc.state}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inc.title}
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(inc.created_at).toLocaleTimeString()} · {inc.service_id}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Active Incident Operations View */}
        <main style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentInc ? (
            <>
              {/* Incident Header & Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                      {currentInc.title}
                    </h2>
                    <span className="font-mono" style={{ fontSize: '12px', color: 'var(--teal-light)', backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                      {currentInc.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Target: <strong>{currentInc.service_id}</strong> · Opened: {new Date(currentInc.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleDiagnose}
                    disabled={isLoading || currentInc.state === 'Recovered'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--teal-dark)',
                      color: 'var(--teal-light)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    <Sparkles size={14} />
                    Run Nemotron Diagnosis
                  </button>

                  <button
                    onClick={handleViewReport}
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
                  >
                    <FileText size={14} />
                    Export Incident Report
                  </button>
                </div>
              </div>

              {/* Step Timeline */}
              <IncidentTimeline currentState={currentInc.state} />

              {/* Main Panels Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Column: Evidence Telemetry */}
                <EvidencePanel evidence={incidentDetails?.evidence || []} />

                {/* Right Column: Diagnosis & Recovery Proposal */}
                <DiagnosisProposalPanel
                  diagnosis={latestDiag}
                  onRunDiagnosis={handleDiagnose}
                  isLoading={isLoading}
                  canDiagnose={currentInc.state !== 'Recovered'}
                />
              </div>

              {/* Bottom Gating & Verification Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Approval Gate Panel */}
                <ApprovalGatePanel
                  approval={latestAppr}
                  incidentState={currentInc.state}
                  onDecide={handleDecideApproval}
                  onExecute={handleExecute}
                  isLoading={isLoading}
                />

                {/* Verification Probes Panel */}
                <VerificationPanel
                  verifications={incidentDetails?.verifications || []}
                  incidentState={currentInc.state}
                  isLoading={isLoading}
                />
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              gap: '16px',
              color: 'var(--text-muted)'
            }}>
              <Server size={48} strokeWidth={1.5} color="var(--border-subtle)" />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>No Incident Selected</h3>
                <p style={{ fontSize: '13px', maxWidth: '360px' }}>
                  Inject a configuration fault or open a new incident to initiate telemetry collection and autonomous diagnosis.
                </p>
              </div>
              <button
                onClick={handleInjectFault}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--teal-primary)',
                  color: '#042f2e',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <AlertTriangle size={15} />
                Inject Reproducible DB Fault
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Incident Report Modal */}
      <ReportModal report={reportData} onClose={() => setReportData(null)} />
    </div>
  );
};

export default App;
