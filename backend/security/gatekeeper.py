import hashlib
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional
from backend.services.demo_service import demo_registry, calculate_config_hash
from backend.db import get_connection, now_iso

ALLOWED_READ_TOOLS = {"get_health", "get_logs", "get_config_diff"}
ALLOWED_WRITE_TOOLS = {"restore_demo_config", "rollback_demo_config"}
ALL_ALLOWED_TOOLS = ALLOWED_READ_TOOLS | ALLOWED_WRITE_TOOLS

class PolicyViolationError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

def normalize_arguments(args: Dict[str, Any]) -> str:
    """Produces canonical deterministic JSON string representation of arguments."""
    return json.dumps(args, sort_keys=True, separators=(',', ':'))

def calculate_proposal_hash(service: str, tool: str, args: Dict[str, Any], hypothesis: str) -> str:
    content = f"{service}:{tool}:{normalize_arguments(args)}:{hypothesis}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def create_approval_binding(
    incident_id: str,
    diagnosis_id: str,
    service_id: str,
    tool: str,
    arguments: Dict[str, Any],
    proposal_hash: str,
    expiry_seconds: int = 300
) -> Dict[str, Any]:
    if tool not in ALL_ALLOWED_TOOLS:
        raise PolicyViolationError("DISALLOWED_TOOL", f"Tool '{tool}' is not in the permitted whitelist.")

    # Get current config hash of the service
    current_config_hash = demo_registry.get_config_hash(service_id)
    norm_args = normalize_arguments(arguments)
    approval_id = f"appr_{hashlib.sha256(f'{incident_id}:{diagnosis_id}:{time.time()}'.encode()).hexdigest()[:12]}"
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(seconds=expiry_seconds)).isoformat()

    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO approvals (
                id, incident_id, diagnosis_id, service_id, tool, normalized_arguments,
                proposal_hash, config_hash_at_approval, status, created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (approval_id, incident_id, diagnosis_id, service_id, tool, norm_args,
             proposal_hash, current_config_hash, now.isoformat(), expires_at)
        )
    conn.close()

    return {
        "approval_id": approval_id,
        "incident_id": incident_id,
        "diagnosis_id": diagnosis_id,
        "service_id": service_id,
        "tool": tool,
        "normalized_arguments": norm_args,
        "proposal_hash": proposal_hash,
        "config_hash_at_approval": current_config_hash,
        "status": "pending",
        "expires_at": expires_at
    }

def record_approval_decision(approval_id: str, decision: str, operator: str = "operator@sentinel.internal", reason: str = "") -> Dict[str, Any]:
    if decision not in ("approved", "rejected", "cancelled"):
        raise ValueError(f"Invalid approval decision {decision}")

    conn = get_connection()
    row = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
    if not row:
        conn.close()
        raise PolicyViolationError("APPROVAL_NOT_FOUND", f"Approval {approval_id} does not exist.")

    if row["status"] != "pending":
        conn.close()
        raise PolicyViolationError("INVALID_APPROVAL_STATE", f"Approval is already in state '{row['status']}'.")

    # Check expiry
    expires_dt = datetime.fromisoformat(row["expires_at"])
    if datetime.now(timezone.utc) > expires_dt:
        conn.execute("UPDATE approvals SET status = 'expired' WHERE id = ?", (approval_id,))
        conn.commit()
        conn.close()
        raise PolicyViolationError("EXPIRED_APPROVAL", "Approval window has expired (>5 minutes). Please request a fresh diagnosis.")

    now = now_iso()
    with conn:
        conn.execute(
            "UPDATE approvals SET status = ?, decided_at = ?, decided_by = ?, rejection_reason = ? WHERE id = ?",
            (decision, now, operator, reason, approval_id)
        )
    conn.close()
    return {"approval_id": approval_id, "status": decision, "decided_at": now, "decided_by": operator}

def validate_and_consume_approval(
    approval_id: str,
    requested_service: str,
    requested_tool: str,
    requested_args: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validates all security invariants before permitting write execution:
    1. Tool is whitelisted.
    2. Approval exists and status is 'approved'.
    3. Has not expired.
    4. Has not already been consumed (single-use enforcement).
    5. Service matches approved service.
    6. Tool matches approved tool.
    7. Normalized arguments match approved arguments (anti-tampering).
    8. Service configuration hash has not drifted since approval was granted.
    """
    if requested_tool not in ALLOWED_WRITE_TOOLS:
        raise PolicyViolationError("UNAUTHORIZED_WRITE_TOOL", f"Tool '{requested_tool}' is not a permitted write tool.")

    conn = get_connection()
    row = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
    if not row:
        conn.close()
        raise PolicyViolationError("APPROVAL_NOT_FOUND", f"Approval token '{approval_id}' was not found.")

    # Check replay / state
    if row["status"] == "consumed":
        conn.close()
        raise PolicyViolationError("REPLAYED_APPROVAL", "Approval token has already been consumed. Replay attacks are prohibited.")
    if row["status"] == "rejected":
        conn.close()
        raise PolicyViolationError("APPROVAL_REJECTED", "Cannot execute rejected approval.")
    if row["status"] == "expired":
        conn.close()
        raise PolicyViolationError("EXPIRED_APPROVAL", "Approval has expired. Zero writes permitted.")
    if row["status"] != "approved":
        conn.close()
        raise PolicyViolationError("UNAPPROVED_ACTION", f"Cannot execute action with approval in '{row['status']}' state.")

    # Check expiration timestamp
    expires_dt = datetime.fromisoformat(row["expires_at"])
    if datetime.now(timezone.utc) > expires_dt:
        conn.execute("UPDATE approvals SET status = 'expired' WHERE id = ?", (approval_id,))
        conn.commit()
        conn.close()
        raise PolicyViolationError("EXPIRED_APPROVAL", "Approval validity window (5 minutes) elapsed prior to execution.")

    # Check target service
    if row["service_id"] != requested_service:
        conn.close()
        raise PolicyViolationError("SERVICE_MISMATCH", f"Approved for service '{row['service_id']}', but requested for '{requested_service}'.")

    # Check tool
    if row["tool"] != requested_tool:
        conn.close()
        raise PolicyViolationError("TOOL_MISMATCH", f"Approved tool '{row['tool']}' does not match requested '{requested_tool}'.")

    # Check arguments
    requested_norm_args = normalize_arguments(requested_args)
    if row["normalized_arguments"] != requested_norm_args:
        conn.close()
        raise PolicyViolationError(
            "ARGUMENTS_TAMPERED",
            f"Execution arguments do not match approved arguments! Approved: {row['normalized_arguments']}, Requested: {requested_norm_args}"
        )

    # Check configuration hash drift
    current_config_hash = demo_registry.get_config_hash(requested_service)
    if current_config_hash != row["config_hash_at_approval"]:
        conn.execute("UPDATE approvals SET status = 'invalidated' WHERE id = ?", (approval_id,))
        conn.commit()
        conn.close()
        raise PolicyViolationError(
            "CONFIG_DRIFT_INVALIDATED",
            f"Service configuration changed after approval was granted. Expected config hash {row['config_hash_at_approval']}, but live config hash is {current_config_hash}. Approval invalidated."
        )

    # Consume single-use approval atomically
    with conn:
        conn.execute("UPDATE approvals SET status = 'consumed' WHERE id = ?", (approval_id,))
    conn.close()

    return dict(row)
