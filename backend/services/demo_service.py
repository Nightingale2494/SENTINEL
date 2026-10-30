import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

GOLDEN_CONFIGS: Dict[str, Dict[str, Any]] = {
    "payments-gateway": {
        "SERVICE_NAME": "payments-gateway",
        "DB_HOST": "pg-cluster.internal",
        "DB_PORT": 5432,
        "POOL_SIZE": 20,
        "TIMEOUT_SEC": 5.0,
        "SSL_MODE": "require",
        "UPSTREAM_ENDPOINT": "https://vault.internal/v1/tokens"
    },
    "inventory-service": {
        "SERVICE_NAME": "inventory-service",
        "DB_HOST": "pg-inv.internal",
        "DB_PORT": 5432,
        "CACHE_TTL": 300,
        "REPLICA_COUNT": 3,
        "SSL_MODE": "require"
    }
}

def calculate_config_hash(config: Dict[str, Any]) -> str:
    canonical_json = json.dumps(config, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

class DemoServiceRegistry:
    def __init__(self):
        self.reset_all()

    def reset_all(self):
        self.configs: Dict[str, Dict[str, Any]] = {
            svc: dict(cfg) for svc, cfg in GOLDEN_CONFIGS.items()
        }
        self.fault_states: Dict[str, Optional[str]] = {
            "payments-gateway": None,
            "inventory-service": None
        }
        self.log_history: Dict[str, List[Dict[str, Any]]] = {
            "payments-gateway": [],
            "inventory-service": []
        }
        self._seed_healthy_logs("payments-gateway")
        self._seed_healthy_logs("inventory-service")

    def _seed_healthy_logs(self, service: str):
        now = datetime.now(timezone.utc).isoformat()
        self.log_history[service] = [
            {"timestamp": now, "level": "INFO", "message": f"[{service}] Service initialized successfully with 20 DB pool workers."},
            {"timestamp": now, "level": "INFO", "message": f"[{service}] Health check passed: latency 11ms, all downstream systems green."},
            {"timestamp": now, "level": "DEBUG", "message": f"[{service}] Periodic keep-alive ping to pg-cluster.internal:5432 succeeded."}
        ]

    def inject_fault(self, service: str = "payments-gateway", fault_type: str = "DB_PORT_MISCONFIG"):
        if service not in self.configs:
            raise ValueError(f"Unknown service {service}")

        now = datetime.now(timezone.utc).isoformat()
        self.fault_states[service] = fault_type

        if fault_type == "DB_PORT_MISCONFIG":
            self.configs[service]["DB_PORT"] = 5433
            self.log_history[service].append({
                "timestamp": now,
                "level": "WARN",
                "message": f"Config deployment revision #4892 applied: DB_PORT modified 5432 -> 5433 by automated release pipeline."
            })
            self.log_history[service].append({
                "timestamp": now,
                "level": "ERROR",
                "message": f"DatabaseConnectionTimeout: upstream db://pg-cluster.internal:5433 unreachable (connection refused). Connection pool depleted (0/20 healthy)."
            })
            self.log_history[service].append({
                "timestamp": now,
                "level": "ERROR",
                "message": f"CRITICAL [auth_token=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretKeyToken99128]: Failed to acquire connection after 3 retries. Transaction pipeline paused."
            })
        elif fault_type == "TIMEOUT_ZERO":
            self.configs[service]["TIMEOUT_SEC"] = 0.001
            self.log_history[service].append({
                "timestamp": now,
                "level": "WARN",
                "message": "Config deployment revision #4893 applied: TIMEOUT_SEC modified 5.0 -> 0.001."
            })
            self.log_history[service].append({
                "timestamp": now,
                "level": "ERROR",
                "message": "GatewayTimeout: connection acquisition timed out in 1ms. All worker threads stalled."
            })
        elif fault_type == "SSL_BROKEN":
            self.configs[service]["SSL_MODE"] = "verify-corrupted"
            self.log_history[service].append({
                "timestamp": now,
                "level": "ERROR",
                "message": "SSLError: certificate validation failed with unrecognized SSL_MODE 'verify-corrupted'."
            })

    def get_config(self, service: str) -> Dict[str, Any]:
        if service not in self.configs:
            raise ValueError(f"Unknown service {service}")
        return dict(self.configs[service])

    def get_config_hash(self, service: str) -> str:
        return calculate_config_hash(self.get_config(service))

    def get_golden_hash(self, service: str) -> str:
        return calculate_config_hash(GOLDEN_CONFIGS[service])

    def get_config_diff(self, service: str) -> Dict[str, Any]:
        current = self.get_config(service)
        golden = GOLDEN_CONFIGS[service]
        current_hash = calculate_config_hash(current)
        golden_hash = calculate_config_hash(golden)

        diffs = {}
        for k, v in current.items():
            if golden.get(k) != v:
                diffs[k] = {"current": v, "expected_golden": golden.get(k)}
        for k, v in golden.items():
            if k not in current:
                diffs[k] = {"current": None, "expected_golden": v}

        return {
            "service": service,
            "has_diff": len(diffs) > 0,
            "current_hash": current_hash,
            "golden_hash": golden_hash,
            "diff_fields": diffs,
            "current_config": current,
            "golden_config": golden
        }

    def get_health(self, service: str) -> Dict[str, Any]:
        if service not in self.configs:
            return {"status": "unhealthy", "code": 404, "error": f"Unknown service {service}"}

        cfg = self.configs[service]
        fault = self.fault_states.get(service)

        if fault == "DB_PORT_MISCONFIG" or cfg.get("DB_PORT") != 5432:
            return {
                "service": service,
                "status": "unhealthy",
                "code": 503,
                "error": f"DatabaseConnectionTimeout: upstream db://pg-cluster.internal:{cfg.get('DB_PORT', 5432)} unreachable (connection refused). Current config: DB_PORT={cfg.get('DB_PORT')} (expected 5432)",
                "latency_ms": 350.2,
                "database": "disconnected",
                "connection_pool": "0/20 active",
                "config_hash": calculate_config_hash(cfg)
            }
        elif fault == "TIMEOUT_ZERO" or cfg.get("TIMEOUT_SEC", 5.0) < 0.1:
            return {
                "service": service,
                "status": "unhealthy",
                "code": 504,
                "error": f"GatewayTimeout: connection timeout {cfg.get('TIMEOUT_SEC')}s is below minimum operational threshold (1.0s).",
                "latency_ms": 1.1,
                "database": "timeout",
                "connection_pool": "stalled",
                "config_hash": calculate_config_hash(cfg)
            }
        elif fault == "SSL_BROKEN" or cfg.get("SSL_MODE") != "require":
            return {
                "service": service,
                "status": "unhealthy",
                "code": 502,
                "error": f"Bad Gateway: Invalid SSL_MODE '{cfg.get('SSL_MODE')}'.",
                "latency_ms": 42.0,
                "database": "ssl_handshake_failed",
                "connection_pool": "uninitialized",
                "config_hash": calculate_config_hash(cfg)
            }

        return {
            "service": service,
            "status": "healthy",
            "code": 200,
            "latency_ms": 11.8,
            "database": "connected",
            "connection_pool": "20/20 active",
            "upstream_vault": "reachable",
            "config_hash": calculate_config_hash(cfg)
        }

    def execute_functional_check(self, service: str) -> Dict[str, Any]:
        health = self.get_health(service)
        if health["status"] != "healthy":
            return {
                "success": False,
                "status_code": health["code"],
                "operation": "POST /api/v1/charge",
                "payload": {"amount": 49.99, "currency": "USD"},
                "error": f"Functional checkout request failed: {health.get('error', 'Service unavailable')}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "success": True,
            "status_code": 200,
            "operation": "POST /api/v1/charge",
            "payload": {"amount": 49.99, "currency": "USD"},
            "response": {
                "transaction_id": f"txn_{int(time.time()*1000)}",
                "status": "authorized",
                "amount": 49.99,
                "currency": "USD",
                "settlement_rail": "ACH_DIRECT",
                "verified_at": datetime.now(timezone.utc).isoformat()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def get_logs(self, service: str, limit: int = 15) -> List[Dict[str, Any]]:
        if service not in self.log_history:
            return []
        return self.log_history[service][-limit:]

    def restore_demo_config(self, service: str, expected_hash: str) -> Dict[str, Any]:
        if service not in self.configs:
            raise ValueError(f"Unknown service {service}")

        current_hash = self.get_config_hash(service)
        if current_hash != expected_hash:
            raise ValueError(f"Precondition failed: config hash mismatch. Expected {expected_hash}, current {current_hash}")

        # Restore to golden config
        self.configs[service] = dict(GOLDEN_CONFIGS[service])
        self.fault_states[service] = None
        now = datetime.now(timezone.utc).isoformat()
        self.log_history[service].append({
            "timestamp": now,
            "level": "INFO",
            "message": f"Approved remediation executed: Restored golden configuration (DB_PORT 5432). Database connection pool re-established."
        })
        new_hash = self.get_config_hash(service)
        return {
            "service": service,
            "restored": True,
            "previous_hash": current_hash,
            "new_hash": new_hash,
            "config": dict(self.configs[service])
        }

demo_registry = DemoServiceRegistry()
