import sqlite3
import json
import os
from datetime import datetime, timezone
from backend.config import settings

def get_connection():
    conn = sqlite3.connect(settings.SENTINEL_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            service_id TEXT NOT NULL,
            title TEXT NOT NULL,
            state TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            source TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            sanitized_content TEXT NOT NULL,
            raw_content TEXT,
            metadata TEXT,
            FOREIGN KEY(incident_id) REFERENCES incidents(id)
        );

        CREATE TABLE IF NOT EXISTS diagnoses (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            hypothesis TEXT NOT NULL,
            evidence_ids TEXT NOT NULL,
            uncertainty REAL NOT NULL,
            uncertainty_label TEXT,
            proposed_tool TEXT NOT NULL,
            typed_arguments TEXT NOT NULL,
            expected_effect TEXT NOT NULL,
            config_diff TEXT,
            risk TEXT NOT NULL,
            rollback_procedure TEXT NOT NULL,
            proposal_hash TEXT NOT NULL,
            source_mode TEXT NOT NULL,
            trace_metadata TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(incident_id) REFERENCES incidents(id)
        );

        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            diagnosis_id TEXT NOT NULL,
            service_id TEXT NOT NULL,
            tool TEXT NOT NULL,
            normalized_arguments TEXT NOT NULL,
            proposal_hash TEXT NOT NULL,
            config_hash_at_approval TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            decided_at TEXT,
            decided_by TEXT,
            rejection_reason TEXT,
            FOREIGN KEY(incident_id) REFERENCES incidents(id),
            FOREIGN KEY(diagnosis_id) REFERENCES diagnoses(id)
        );

        CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            approval_id TEXT NOT NULL,
            tool TEXT NOT NULL,
            arguments TEXT NOT NULL,
            executed_at TEXT NOT NULL,
            result TEXT NOT NULL,
            success INTEGER NOT NULL,
            FOREIGN KEY(incident_id) REFERENCES incidents(id),
            FOREIGN KEY(approval_id) REFERENCES approvals(id)
        );

        CREATE TABLE IF NOT EXISTS verifications (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            probe_number INTEGER NOT NULL,
            probe_timestamp TEXT NOT NULL,
            probe_status TEXT NOT NULL,
            probe_latency_ms REAL NOT NULL,
            probe_details TEXT,
            functional_test_status TEXT,
            functional_test_details TEXT,
            final_outcome TEXT,
            FOREIGN KEY(incident_id) REFERENCES incidents(id)
        );
        """)
    conn.close()

def now_iso():
    return datetime.now(timezone.utc).isoformat()
