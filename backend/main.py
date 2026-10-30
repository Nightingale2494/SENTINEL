import os
import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.db import init_db, get_connection, now_iso
from backend.services.demo_service import (
    demo_registry,
    GOLDEN_CONFIGS,
    calculate_config_hash
)
from backend.security.sanitizer import sanitize_text
from backend.security.gatekeeper import (
    ALLOWED_WRITE_TOOLS,
    ALL_ALLOWED_TOOLS,
    create_approval_binding,
    record_approval_decision,
    validate_and_consume_approval,
    calculate_proposal_hash,
    PolicyViolationError
)
from backend.inference.nemotron_client import query_nemotron_for_diagnosis
from backend.verification.engine import run_verification_loop
from backend.reports.export import generate_incident_report

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="SENTINEL - Autonomous Incident Diagnosis & Approval-Gated Recovery",
    version="1.0.0",
    description="NVIDIA Nemotron-powered operations workspace with strict cryptographic approval gating and multi-probe verification.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request / Response Models ---

class FaultInjectionRequest(BaseModel):
    service: str = "payments-gateway"
    fault_type: str = "DB_PORT_MISCONFIG"

class CreateIncidentRequest(BaseModel):
    service_id: str = "payments-gateway"
    title: Optional[str] = None

class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., description="'approved', 'rejected', or 'cancelled'")
    operator: str = Field(default="operator@sentinel.internal")
    reason: Optional[str] = ""

class ExecuteRemediationRequest(BaseModel):
    approval_id: str
    service: str
    tool: str
    arguments: Dict[str, Any]
    fast_verify: Optional[bool] = False

# --- Endpoints ---

@app.get("/api/status")
def get_system_status():
    has_api_key = bool(settings.NEBIUS_API_KEY and len(settings.NEBIUS_API_KEY.strip()) > 0)
    return {
        "status": "online",
        "system": "SENTINEL Core Engine",
        "nebius_integration": {
            "endpoint": settings.NEBIUS_BASE_URL,
            "model_id": settings.NEMOTRON_MODEL_ID,
            "live_key_configured": has_api_key,
            "mode": "LIVE_NEBIUS_TOKEN_FACTORY" if has_api_key else "OFFLINE_FIXTURE_MODE",
            "blocked_checks": [] if has_api_key else ["Live Nebius Token Factory inference requires NEBIUS_API_KEY environment variable"]
        },
        "security_policy": {
            "whitelisted_tools": list(ALL_ALLOWED_TOOLS),
            "approval_expiry_seconds": settings.APPROVAL_EXPIRY_SECONDS,
            "probe_duration_seconds": settings.VERIFICATION_PROBE_INTERVAL_SECONDS * 3
        }
    }

@app.get("/api/services")
def list_services():
    services = []
    for svc_name in ["payments-gateway", "inventory-service"]:
        health = demo_registry.get_health(svc_name)
        cfg_hash = demo_registry.get_config_hash(svc_name)
        golden_hash = demo_registry.get_golden_hash(svc_name)
        is_golden = (cfg_hash == golden_hash)
        services.append({
            "id": svc_name,
            "name": "Payments Core Gateway" if svc_name == "payments-gateway" else "Inventory & Catalog Control",
            "is_control": (svc_name == "inventory-service"),
            "status": health["status"],
            "code": health["code"],
            "config_hash": cfg_hash,
            "is_golden": is_golden,
            "fault": demo_registry.fault_states.get(svc_name),
            "health_details": health
        })
    return {"services": services}

@app.post("/api/services/fault")
def inject_fault(req: FaultInjectionRequest):
    try:
        demo_registry.inject_fault(req.service, req.fault_type)
        return {
            "success": True,
            "service": req.service,
            "fault_type": req.fault_type,
            "new_config_hash": demo_registry.get_config_hash(req.service),
            "health": demo_registry.get_health(req.service)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/services/reset")
def reset_services():
    demo_registry.reset_all()
    return {
        "success": True,
        "message": "All demo services restored to pristine golden baseline configurations.",
        "services": list_services()["services"]
    }

@app.get("/api/services/{service_id}/health")
def check_health(service_id: str):
    return demo_registry.get_health(service_id)

@app.get("/api/services/{service_id}/logs")
def get_logs(service_id: str, limit: int = 15):
    return {"service": service_id, "logs": demo_registry.get_logs(service_id, limit)}

@app.get("/api/services/{service_id}/config-diff")
def get_config_diff(service_id: str):
    return demo_registry.get_config_diff(service_id)

@app.get("/api/incidents")
def list_incidents():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"incidents": [dict(r) for r in rows]}

@app.post("/api/incidents")
def create_incident(req: CreateIncidentRequest):
    incident_id = f"inc_{uuid.uuid4().hex[:8]}"
    now = now_iso()
    title = req.title or f"Incident on {req.service_id}: Service degradation detected"

    conn = get_connection()
    with conn:
        conn.execute(
            "INSERT INTO incidents (id, service_id, title, state, created_at, updated_at) VALUES (?, ?, ?, 'Investigating', ?, ?)",
            (incident_id, req.service_id, title, now, now)
        )

        # 1. Scoped Health Check Evidence
        health_data = demo_registry.get_health(req.service_id)
        ev_health_id = f"EV-{incident_id[4:].upper()}-01"
        conn.execute(
            "INSERT INTO evidence (id, incident_id, source, timestamp, sanitized_content, raw_content, metadata) VALUES (?, ?, 'get_health', ?, ?, ?, ?)",
            (ev_health_id, incident_id, now, sanitize_text(json.dumps(health_data, indent=2)), json.dumps(health_data), json.dumps({"status_code": health_data.get("code")}))
        )

        # 2. Scoped Configuration Diff Evidence
        diff_data = demo_registry.get_config_diff(req.service_id)
        ev_diff_id = f"EV-{incident_id[4:].upper()}-02"
        conn.execute(
            "INSERT INTO evidence (id, incident_id, source, timestamp, sanitized_content, raw_content, metadata) VALUES (?, ?, 'get_config_diff', ?, ?, ?, ?)",
            (ev_diff_id, incident_id, now, sanitize_text(json.dumps(diff_data, indent=2)), json.dumps(diff_data), json.dumps({"has_diff": diff_data["has_diff"]}))
        )

        # 3. Scoped Logs Evidence (Sanitized)
        logs = demo_registry.get_logs(req.service_id, limit=10)
        logs_str = "\n".join([f"[{l['timestamp']}] {l['level']}: {l['message']}" for l in logs])
        ev_logs_id = f"EV-{incident_id[4:].upper()}-03"
        conn.execute(
            "INSERT INTO evidence (id, incident_id, source, timestamp, sanitized_content, raw_content, metadata) VALUES (?, ?, 'get_logs', ?, ?, ?, ?)",
            (ev_logs_id, incident_id, now, sanitize_text(logs_str), logs_str, json.dumps({"count": len(logs)}))
        )
    conn.close()

    return {
        "incident_id": incident_id,
        "service_id": req.service_id,
        "title": title,
        "state": "Investigating",
        "evidence_collected": [ev_health_id, ev_diff_id, ev_logs_id]
    }

@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str):
    conn = get_connection()
    inc = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not inc:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    evidence = [dict(r) for r in conn.execute("SELECT * FROM evidence WHERE incident_id = ? ORDER BY timestamp ASC", (incident_id,)).fetchall()]
    diagnoses = [dict(r) for r in conn.execute("SELECT * FROM diagnoses WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,)).fetchall()]
    approvals = [dict(r) for r in conn.execute("SELECT * FROM approvals WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,)).fetchall()]
    actions = [dict(r) for r in conn.execute("SELECT * FROM actions WHERE incident_id = ? ORDER BY executed_at DESC", (incident_id,)).fetchall()]
    verifications = [dict(r) for r in conn.execute("SELECT * FROM verifications WHERE incident_id = ? ORDER BY probe_number ASC", (incident_id,)).fetchall()]
    conn.close()

    for d in diagnoses:
        try:
            d["evidence_ids"] = json.loads(d["evidence_ids"])
            d["typed_arguments"] = json.loads(d["typed_arguments"])
            d["trace_metadata"] = json.loads(d["trace_metadata"]) if d.get("trace_metadata") else None
        except Exception:
            pass

    return {
        "incident": dict(inc),
        "evidence": evidence,
        "diagnoses": diagnoses,
        "approvals": approvals,
        "actions": actions,
        "verifications": verifications
    }

@app.post("/api/incidents/{incident_id}/diagnose")
async def diagnose_incident(incident_id: str, force_offline: bool = Query(default=False)):
    conn = get_connection()
    inc = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not inc:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    evidence_rows = [dict(r) for r in conn.execute("SELECT * FROM evidence WHERE incident_id = ?", (incident_id,)).fetchall()]
    conn.close()

    service_id = inc["service_id"]
    current_config = demo_registry.get_config(service_id)
    current_config_hash = demo_registry.get_config_hash(service_id)
    golden_config = GOLDEN_CONFIGS[service_id]

    try:
        diagnosis, trace = await query_nemotron_for_diagnosis(
            incident_id=incident_id,
            service_id=service_id,
            evidence_list=evidence_rows,
            current_config=current_config,
            current_config_hash=current_config_hash,
            golden_config=golden_config,
            force_offline=force_offline
        )
    except Exception as e:
        # Failure to diagnose causes safe fail-closed: do not create approval
        raise HTTPException(status_code=502, detail=f"Inference failure: {str(e)}")

    diag_id = f"diag_{uuid.uuid4().hex[:8]}"
    prop_hash = calculate_proposal_hash(
        service=service_id,
        tool=diagnosis.proposed_tool,
        args=diagnosis.typed_arguments,
        hypothesis=diagnosis.hypothesis
    )

    # Store diagnosis
    now = now_iso()
    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO diagnoses (
                id, incident_id, hypothesis, evidence_ids, uncertainty, uncertainty_label,
                proposed_tool, typed_arguments, expected_effect, risk, rollback_procedure,
                proposal_hash, source_mode, trace_metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (diag_id, incident_id, diagnosis.hypothesis, json.dumps(diagnosis.evidence_ids),
             diagnosis.uncertainty, f"{round(diagnosis.uncertainty*100, 1)}%",
             diagnosis.proposed_tool, json.dumps(diagnosis.typed_arguments), diagnosis.expected_effect,
             diagnosis.risk, diagnosis.rollback_procedure, prop_hash, trace.source_mode,
             json.dumps(trace.model_dump()), now)
        )
    conn.close()

    # Automatically generate single-use cryptographic approval binding
    approval_binding = create_approval_binding(
        incident_id=incident_id,
        diagnosis_id=diag_id,
        service_id=service_id,
        tool=diagnosis.proposed_tool,
        arguments=diagnosis.typed_arguments,
        proposal_hash=prop_hash,
        expiry_seconds=settings.APPROVAL_EXPIRY_SECONDS
    )

    # Transition state to 'Awaiting approval'
    conn = get_connection()
    with conn:
        conn.execute("UPDATE incidents SET state = 'Awaiting approval', updated_at = ? WHERE id = ?", (now, incident_id))
    conn.close()

    return {
        "diagnosis_id": diag_id,
        "incident_id": incident_id,
        "hypothesis": diagnosis.hypothesis,
        "evidence_ids": diagnosis.evidence_ids,
        "uncertainty": diagnosis.uncertainty,
        "proposed_tool": diagnosis.proposed_tool,
        "typed_arguments": diagnosis.typed_arguments,
        "expected_effect": diagnosis.expected_effect,
        "risk": diagnosis.risk,
        "rollback_procedure": diagnosis.rollback_procedure,
        "proposal_hash": prop_hash,
        "approval": approval_binding,
        "trace": trace.model_dump(),
        "state": "Awaiting approval"
    }

@app.post("/api/approvals/{approval_id}/decide")
def decide_approval(approval_id: str, req: ApprovalDecisionRequest):
    try:
        result = record_approval_decision(
            approval_id=approval_id,
            decision=req.decision,
            operator=req.operator,
            reason=req.reason or ""
        )

        conn = get_connection()
        appr = conn.execute("SELECT incident_id FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if appr:
            new_state = "Awaiting approval" if req.decision == "approved" else ("Unresolved" if req.decision == "rejected" else "Cancelled")
            conn.execute("UPDATE incidents SET state = ?, updated_at = ? WHERE id = ?", (new_state, now_iso(), appr["incident_id"]))
            conn.commit()
        conn.close()

        return result
    except PolicyViolationError as e:
        raise HTTPException(status_code=403, detail={"code": e.code, "message": e.message})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/incidents/{incident_id}/execute")
async def execute_recovery(incident_id: str, req: ExecuteRemediationRequest, background_tasks: BackgroundTasks):
    # Verify approval and policy strictly
    try:
        appr_record = validate_and_consume_approval(
            approval_id=req.approval_id,
            requested_service=req.service,
            requested_tool=req.tool,
            requested_args=req.arguments
        )
    except PolicyViolationError as e:
        raise HTTPException(status_code=403, detail={"code": e.code, "message": e.message})

    # Update state to Executing
    conn = get_connection()
    with conn:
        conn.execute("UPDATE incidents SET state = 'Executing', updated_at = ? WHERE id = ?", (now_iso(), incident_id))
    conn.close()

    # Execute remediation
    action_id = f"act_{uuid.uuid4().hex[:8]}"
    execution_time = now_iso()
    action_result = {}
    action_success = False

    try:
        if req.tool == "restore_demo_config":
            expected_hash = req.arguments.get("expected_hash")
            action_result = demo_registry.restore_demo_config(req.service, expected_hash)
            action_success = True
        else:
            raise ValueError(f"Unsupported write tool {req.tool}")
    except Exception as e:
        action_result = {"error": str(e)}
        action_success = False

    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO actions (id, incident_id, approval_id, tool, arguments, executed_at, result, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (action_id, incident_id, req.approval_id, req.tool, json.dumps(req.arguments),
             execution_time, json.dumps(action_result), 1 if action_success else 0)
        )
    conn.close()

    # If action failed, transition immediately to Unresolved
    if not action_success:
        conn = get_connection()
        with conn:
            conn.execute("UPDATE incidents SET state = 'Unresolved', updated_at = ? WHERE id = ?", (now_iso(), incident_id))
        conn.close()
        return {
            "success": False,
            "action_id": action_id,
            "result": action_result,
            "incident_state": "Unresolved"
        }

    # IMPORTANT: A successful command alone NEVER means Recovered!
    # Immediately initiate multi-probe verification:
    # 3 healthy probes over verification window + 1 functional API checkout
    interval = 0.5 if req.fast_verify else settings.VERIFICATION_PROBE_INTERVAL_SECONDS
    verify_result = await run_verification_loop(
        incident_id=incident_id,
        service_id=req.service,
        probe_count=3,
        interval_seconds=interval
    )

    return {
        "success": True,
        "action_id": action_id,
        "result": action_result,
        "verification": verify_result,
        "incident_state": verify_result["final_outcome"]
    }

@app.get("/api/incidents/{incident_id}/report")
def export_report(incident_id: str):
    try:
        report = generate_incident_report(incident_id)
        return report
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount frontend production build if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

