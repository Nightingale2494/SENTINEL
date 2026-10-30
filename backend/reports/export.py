import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from backend.db import get_connection

def generate_incident_report(incident_id: str) -> Dict[str, Any]:
    conn = get_connection()
    inc = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not inc:
        conn.close()
        raise ValueError(f"Incident {incident_id} not found")

    inc_data = dict(inc)
    evidence_rows = [dict(r) for r in conn.execute("SELECT * FROM evidence WHERE incident_id = ? ORDER BY timestamp ASC", (incident_id,)).fetchall()]
    diag_rows = [dict(r) for r in conn.execute("SELECT * FROM diagnoses WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,)).fetchall()]
    appr_rows = [dict(r) for r in conn.execute("SELECT * FROM approvals WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,)).fetchall()]
    act_rows = [dict(r) for r in conn.execute("SELECT * FROM actions WHERE incident_id = ? ORDER BY executed_at DESC", (incident_id,)).fetchall()]
    ver_rows = [dict(r) for r in conn.execute("SELECT * FROM verifications WHERE incident_id = ? ORDER BY probe_number ASC", (incident_id,)).fetchall()]
    conn.close()

    # Parse JSON fields safely
    for d in diag_rows:
        try:
            d["evidence_ids"] = json.loads(d["evidence_ids"])
            d["typed_arguments"] = json.loads(d["typed_arguments"])
            d["trace_metadata"] = json.loads(d["trace_metadata"]) if d.get("trace_metadata") else None
        except Exception:
            pass

    # Build Markdown document
    latest_diag = diag_rows[0] if diag_rows else None
    latest_appr = appr_rows[0] if appr_rows else None
    latest_act = act_rows[0] if act_rows else None

    uncertainty_str = f"Uncertainty: {latest_diag.get('uncertainty', 0):.2f}" if latest_diag else "N/A"
    md_lines = [
        f"# SENTINEL Post-Incident & Remediation Report",
        f"**Incident ID:** `{inc_data['id']}`  ",
        f"**Target Service:** `{inc_data['service_id']}`  ",
        f"**Final Status:** **{inc_data['state']}**  ",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"**Started:** {inc_data['created_at']}  ",
        f"**Resolved:** {inc_data.get('resolved_at') or 'N/A'}",
        "",
        "---",
        "",
        "## 1. Executive Summary",
        f"- **Incident Title:** {inc_data['title']}",
        f"- **Remediation State:** `{inc_data['state']}`",
        f"- **Diagnosis Hypothesis:** {latest_diag['hypothesis'] if latest_diag else 'No diagnosis recorded.'}",
        f"- **Model Certainty:** {uncertainty_str}",
        "",
        "## 2. Telemetry & Evidence Trail",
    ]

    for ev in evidence_rows:
        md_lines.append(f"### Evidence `{ev['id']}` — {ev['source']} ({ev['timestamp']})")
        md_lines.append("```")
        md_lines.append(ev['sanitized_content'])
        md_lines.append("```")
        md_lines.append("")

    md_lines.extend([
        "## 3. NVIDIA Nemotron Diagnosis & Recovery Proposal",
    ])

    if latest_diag:
        trace = latest_diag.get("trace_metadata") or {}
        md_lines.extend([
            f"- **Inference Engine:** NVIDIA Nemotron via Nebius Token Factory",
            f"- **Model ID:** `{trace.get('model_id', 'nvidia/Llama-3.1-Nemotron-70B-Instruct')}`",
            f"- **Endpoint Host:** `{trace.get('endpoint_host', 'api.tokenfactory.nebius.com')}`",
            f"- **Inference Duration:** {trace.get('duration_ms', 'N/A')} ms",
            f"- **Mode:** `{latest_diag.get('source_mode', 'N/A')}`",
            f"- **Proposed Action Tool:** `{latest_diag.get('proposed_tool')}`",
            f"- **Target Arguments:** `{json.dumps(latest_diag.get('typed_arguments'))}`",
            f"- **Assessed Risk Level:** `{latest_diag.get('risk')}`",
            f"- **Expected Outcome:** {latest_diag.get('expected_effect')}",
            f"- **Rollback Procedure:** {latest_diag.get('rollback_procedure')}",
            "",
            "### Cited Supporting Evidence IDs",
            f"{', '.join([f'`{e}`' for e in latest_diag.get('evidence_ids', [])])}",
            ""
        ])

    md_lines.extend([
        "## 4. Operator Approval Gate & Audit Trail",
    ])

    if latest_appr:
        md_lines.extend([
            f"- **Approval ID:** `{latest_appr['id']}`",
            f"- **Status:** `{latest_appr['status']}`",
            f"- **Decided By:** `{latest_appr.get('decided_by') or 'Pending'}`",
            f"- **Decided At:** `{latest_appr.get('decided_at') or 'N/A'}`",
            f"- **Expiry Window:** `{latest_appr['expires_at']}`",
            f"- **Service State Binding Hash:** `{latest_appr['config_hash_at_approval']}`",
            f"- **Proposal Binding Hash:** `{latest_appr['proposal_hash']}`",
            ""
        ])
    else:
        md_lines.append("No approval record logged.")

    md_lines.extend([
        "## 5. Execution & Remediation Action",
    ])

    if latest_act:
        md_lines.extend([
            f"- **Action ID:** `{latest_act['id']}`",
            f"- **Tool Executed:** `{latest_act['tool']}`",
            f"- **Executed At:** `{latest_act['executed_at']}`",
            f"- **Success Flag:** `{'YES' if latest_act['success'] else 'NO'}`",
            "```json",
            latest_act['result'],
            "```",
            ""
        ])
    else:
        md_lines.append("No write action executed.")

    md_lines.extend([
        "## 6. Post-Recovery Verification Probes",
        "*(Strict Policy: 3 consecutive healthy probes over verification window + 1 functional API checkout transaction)*",
        ""
    ])

    for v in ver_rows:
        md_lines.append(f"- **Probe #{v['probe_number']}** at {v['probe_timestamp']}: Status **{v['probe_status']}** (Latency: {v['probe_latency_ms']} ms)")

    if ver_rows and ver_rows[-1].get("functional_test_status"):
        md_lines.extend([
            f"- **Functional API Test:** **{ver_rows[-1]['functional_test_status'].upper()}**",
            f"- **Verification Verdict:** **{ver_rows[-1]['final_outcome']}**",
            ""
        ])

    markdown_report = "\n".join(md_lines)

    return {
        "incident": inc_data,
        "evidence": evidence_rows,
        "diagnoses": diag_rows,
        "approvals": appr_rows,
        "actions": act_rows,
        "verifications": ver_rows,
        "markdown_report": markdown_report
    }
