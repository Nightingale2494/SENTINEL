import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.services.demo_service import demo_registry
from backend.db import get_connection, now_iso
from backend.config import settings

async def run_verification_loop(
    incident_id: str,
    service_id: str,
    probe_count: int = 3,
    interval_seconds: Optional[float] = None
) -> Dict[str, Any]:
    """
    Executes post-remediation verification:
    1. Probe loop: 3 healthy probes over the configured duration.
    2. Functional API request (e.g. POST /api/v1/charge).
    A successful remediation write ALONE never transitions to Recovered.
    Only 100% healthy probes + functional check transitions state to Recovered.
    Any failure produces Unresolved.
    """
    if interval_seconds is None:
        interval_seconds = settings.VERIFICATION_PROBE_INTERVAL_SECONDS

    conn = get_connection()
    with conn:
        conn.execute("UPDATE incidents SET state = 'Verifying', updated_at = ? WHERE id = ?", (now_iso(), incident_id))
    conn.close()

    probes_record = []
    all_probes_healthy = True
    failure_reason = None

    for probe_idx in range(1, probe_count + 1):
        start_probe = time.time()
        health = demo_registry.get_health(service_id)
        latency_ms = round((time.time() - start_probe) * 1000 + health.get("latency_ms", 10.0), 2)
        probe_time = now_iso()

        is_healthy = (health.get("status") == "healthy" and health.get("code") == 200)

        probe_entry = {
            "probe_number": probe_idx,
            "timestamp": probe_time,
            "status": "healthy" if is_healthy else "unhealthy",
            "latency_ms": latency_ms,
            "details": health
        }
        probes_record.append(probe_entry)

        # Record probe in database
        conn = get_connection()
        with conn:
            conn.execute(
                """
                INSERT INTO verifications (
                    id, incident_id, probe_number, probe_timestamp, probe_status,
                    probe_latency_ms, probe_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (f"ver_{incident_id}_{probe_idx}_{int(time.time()*1000)}", incident_id,
                 probe_idx, probe_time, probe_entry["status"], latency_ms, str(health))
            )
        conn.close()

        if not is_healthy:
            all_probes_healthy = False
            failure_reason = f"Health probe #{probe_idx} failed with status {health.get('status')} (HTTP {health.get('code')})"
            break

        # Wait between probes (if not the final probe)
        if probe_idx < probe_count and interval_seconds > 0:
            await asyncio.sleep(interval_seconds)

    functional_result = None
    final_outcome = "Unresolved"

    if all_probes_healthy:
        # Run 1 functional API check
        functional_result = demo_registry.execute_functional_check(service_id)
        if functional_result.get("success") is True:
            final_outcome = "Recovered"
        else:
            final_outcome = "Unresolved"
            failure_reason = f"Functional API request failed: {functional_result.get('error')}"
    else:
        final_outcome = "Unresolved"

    # Update incident state in DB
    now = now_iso()
    resolved_at = now if final_outcome == "Recovered" else None

    conn = get_connection()
    with conn:
        conn.execute(
            "UPDATE incidents SET state = ?, updated_at = ?, resolved_at = ? WHERE id = ?",
            (final_outcome, now, resolved_at, incident_id)
        )
        # Update verification final outcome
        conn.execute(
            "UPDATE verifications SET functional_test_status = ?, functional_test_details = ?, final_outcome = ? WHERE incident_id = ?",
            ("passed" if (functional_result and functional_result.get("success")) else "failed",
             str(functional_result) if functional_result else failure_reason,
             final_outcome, incident_id)
        )
    conn.close()

    return {
        "incident_id": incident_id,
        "final_outcome": final_outcome,
        "all_probes_healthy": all_probes_healthy,
        "probes": probes_record,
        "functional_result": functional_result,
        "failure_reason": failure_reason,
        "verified_at": now
    }
