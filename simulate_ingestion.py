"""
High-Velocity Audit Event Ingestion & Verification Simulator
Demonstrates:
1. Ingesting simulated security events (logins, file access, privilege escalations, network rules).
2. Automatic batching and block minting at every 10 logs.
3. Querying raw logs alongside their block height and Merkle leaf index.
4. Generating and cryptographically verifying a Merkle proof for a chosen log.
5. Verifying the complete blockchain ledger integrity.
"""

import json
import random
import time
from typing import Any, Dict

import httpx

from database import Database

API_BASE = "http://127.0.0.1:8000"

SAMPLE_ACTORS = [
    "admin@corp.net",
    "service_worker_auth",
    "alice_dev",
    "bob_devops",
    "carol_dbadmin",
    "ingress_gateway",
    "threat_detection_agent",
]

SAMPLE_ACTIONS = [
    ("AUTH_SUCCESS", "/api/v1/login"),
    ("FILE_WRITE", "/etc/nginx/nginx.conf"),
    ("PERMISSION_GRANT", "/roles/admin"),
    ("DATABASE_QUERY", "SELECT * FROM users WHERE role='root'"),
    ("KEY_ROTATION", "/kms/keys/master-secret"),
    ("CONFIG_CHANGE", "/k8s/cluster-policy.yaml"),
    ("AUTH_FAILURE", "/ssh/port-22"),
    ("TOKEN_ISSUE", "/oauth/token"),
]


def generate_event(index: int) -> Dict[str, Any]:
    actor = random.choice(SAMPLE_ACTORS)
    action, resource = random.choice(SAMPLE_ACTIONS)
    payload = {
        "sequence": index,
        "source_ip": f"192.168.1.{random.randint(10, 250)}",
        "severity": random.choice(["INFO", "WARN", "CRITICAL"]),
        "client_version": "v2.4.1",
        "metadata": {
            "session_id": f"sess-{random.randint(10000, 99999)}",
            "latency_ms": random.randint(5, 120),
        },
    }
    return {
        "actor": actor,
        "action": action,
        "resource": resource,
        "payload": payload,
    }


import os
import sys
import glob

def main():
    print("=" * 70)
    print("  IMMUTABLE AUDIT LOGGING SYSTEM - SOC VALIDATION & INGESTION DEMO")
    print("=" * 70)

    # Optional clean reset flag
    if "--clean" in sys.argv:
        for f in glob.glob("audit_ledger.db*") + glob.glob("demo_audit.db*"):
            try:
                os.remove(f)
            except Exception:
                pass
        print("[*] Cleaned database files for fresh simulation run.")

    # Use TestClient as fallback if uvicorn is not running externally
    try:
        r = httpx.get(f"{API_BASE}/", timeout=1.0)
        client = httpx.Client(base_url=API_BASE)
        print(f"[+] Connected to live FastAPI server at {API_BASE}")
    except Exception:
        print("[!] No external server detected on port 8000; using FastAPI TestClient in-memory...")
        from fastapi.testclient import TestClient
        from main import app, db, ledger
        # If clean was requested, reload db and ledger
        if "--clean" in sys.argv:
            import main
            main.db = Database()
            main.ledger = main.db.load_ledger()
        client = TestClient(app)

    # Step 1: System Info
    info = client.get("/").json()
    print(f"[*] Service status: {info['status']}")
    print(f"[*] Batch trigger threshold: {info['batch_size_threshold']} logs per block")
    print(f"[*] Starting block height: {info['latest_block_height']}\n")

    # Step 2: Stream 25 high-velocity events
    total_to_send = 25
    print(f"--- Simulating High-Velocity Stream ({total_to_send} events) ---")
    for i in range(1, total_to_send + 1):
        event = generate_event(i)
        resp = client.post("/logs/ingest", json=event)
        data = resp.json()

        minted = data.get("new_blocks_minted", 0)
        if minted > 0:
            print(f"  [Event {i:02d}] Ingested -> *** NEW BLOCK MINTED: Height {data['new_block_heights']} (Chain Height: {data['current_chain_height']}) ***")
        else:
            print(f"  [Event {i:02d}] Ingested -> Queued in unbatched buffer")

        time.sleep(0.02)  # Tiny pause to simulate high throughput

    # Step 3: Review System Stats
    stats = client.get("/stats").json()
    print("\n--- Ingestion & Buffer Summary ---")
    print(f"  Total logs recorded in DB: {stats['total_logs']}")
    print(f"  Unbatched logs in buffer : {stats['unbatched_logs']} (waiting for next batch of 10)")
    print(f"  Total blocks minted      : {stats['total_blocks']}")
    print(f"  Latest block height      : {stats['latest_block_height']}")

    # Step 4: Retrieve Logs with Associated Block Height (GET /logs)
    print("\n--- Recent Logs Query (GET /logs?limit=5) ---")
    logs_resp = client.get("/logs?limit=5").json()
    for log in logs_resp["logs"]:
        bh = log["block_height"]
        leaf_idx = log["leaf_index"]
        print(f"  [Log #{log['id']:02d}] Actor: {log['actor']:22s} | Action: {log['action']:16s} | Block Height: {bh} | Leaf Index: {leaf_idx}")

    # Step 5: Cryptographic Proof Verification
    # Pick a batched log from the latest minted block
    batched_resp = client.get("/logs?limit=10").json()
    batched_logs = [l for l in batched_resp["logs"] if l["block_height"] is not None]
    if not batched_logs and stats["latest_block_height"] > 0:
        batched_resp = client.get(f"/logs?block_height={stats['latest_block_height']}&limit=5").json()
        batched_logs = batched_resp["logs"]

    if batched_logs:
        target_log = batched_logs[0]
        log_id = target_log["id"]
        print(f"\n--- Cryptographic Proof for Log ID #{log_id} ---")

        proof_resp = client.get(f"/logs/{log_id}/proof").json()
        print(f"  Block Height : {proof_resp['block_height']}")
        print(f"  Leaf Index   : {proof_resp['leaf_index']}")
        print(f"  Leaf Hash    : {proof_resp['leaf_hash']}")
        print(f"  Merkle Root  : {proof_resp['merkle_root']}")
        print(f"  Block Hash   : {proof_resp['block_hash']}")
        print(f"  Proof Steps  : {len(proof_resp['proof'])} steps")
        for idx, step in enumerate(proof_resp["proof"]):
            print(f"    Step {idx + 1}: [{step['position'].upper():5s}] {step['hash']}")

        # Verify via POST /logs/verify
        verify_payload = {
            "log": {
                "event_id": target_log["event_id"],
                "timestamp": target_log["timestamp"],
                "actor": target_log["actor"],
                "action": target_log["action"],
                "resource": target_log["resource"],
                "payload": target_log["payload"],
            },
            "proof": proof_resp["proof"],
            "block_height": proof_resp["block_height"],
        }
        verify_resp = client.post("/logs/verify", json=verify_payload).json()
        print(f"\n  [Proof Verification Result]: {verify_resp['message']} (proof_valid={verify_resp['proof_valid']})")

    # Step 6: Blockchain Hash Chain Verification
    print("\n--- Blockchain Ledger Integrity Check (GET /chain/verify) ---")
    chain_check = client.get("/chain/verify").json()
    print(f"  Chain Valid   : {chain_check['chain_valid']}")
    print(f"  Total Blocks  : {chain_check['total_blocks']}")
    print(f"  Latest Height : {chain_check['latest_block_height']}")

    # =========================================================================
    # PHASE 2: SOC VALIDATOR & ROGUE ADMIN TAMPER DETECTION
    # =========================================================================
    print("\n" + "=" * 70)
    print("  PHASE 2: SOC VALIDATOR & REAL-TIME TAMPER DETECTION")
    print("=" * 70)

    # Step 7: Initial Real-Time Validation (Pre-Tamper)
    print("\n--- Step 7: Pre-Tamper SOC Validation Check (GET /validate) ---")
    pre_val = client.get("/validate").json()
    print(f"  Status          : {pre_val['status']}")
    print(f"  Blocks Checked  : {pre_val['blocks_checked']}")
    print(f"  Logs Checked    : {pre_val['logs_checked']}")
    print(f"  Tampered Blocks : {pre_val['tampered_blocks_count']}")
    print(f"  Summary         : {pre_val['summary']}")

    # Step 8: Rogue Admin Simulation
    print("\n--- Step 8: Rogue Admin Attack Simulation (POST /simulate-tamper) ---")
    print("  Executing direct SQL UPDATE on SQLite database (bypassing the blockchain)...")
    tamper_resp = client.post(
        "/simulate-tamper",
        json={
            "field": "action",
            "new_value": "UNAUTHORIZED_ROOT_PRIVILEGE_ESCALATION"
        }
    ).json()

    print(f"  Target Log ID        : #{tamper_resp['tampered_log_id']}")
    print(f"  Target Block Height  : #{tamper_resp['block_height']}")
    print(f"  Modified Field       : {tamper_resp['field']}")
    print(f"  Original Value       : {tamper_resp['original_value']}")
    print(f"  Tampered New Value   : {tamper_resp['new_value']}")
    print(f"  Bypassed Blockchain  : {tamper_resp['bypassed_blockchain']}")
    print(f"  Warning              : {tamper_resp['warning']}")

    # Step 9: Post-Tamper Real-Time Validation
    print("\n--- Step 9: Real-Time SOC Validation (GET /validate) ---")
    post_val = client.get("/validate").json()
    print(f"  Validation Status    : {post_val['status']}")
    print(f"  Tampered Blocks Detected: {post_val['tampered_blocks_count']}")
    print(f"  Summary              : {post_val['summary']}")

    if post_val["alerts"]:
        print("\n  >>> [HIGH-PRIORITY SECURITY ALERT GENERATED] <<<")
        for alert in post_val["alerts"]:
            print(f"  Alert ID        : {alert['alert_id']}")
            print(f"  Timestamp       : {alert['timestamp']}")
            print(f"  Severity        : *** {alert['severity']} ***")
            print(f"  Alert Type      : {alert['alert_type']}")
            print(f"  Compromised Blk : Height #{alert['block_height']}")
            print(f"  Expected Root   : {alert['expected_merkle_root']}")
            print(f"  Recalculated    : {alert['recalculated_merkle_root']}")
            print(f"  Root Mismatch   : {alert['root_mismatch']}")
            print(f"  Message         : {alert['message']}")
            print("  Compromised Logs Detail:")
            for clog in alert["compromised_logs"]:
                print(f"    - Log ID #{clog['log_id']} (Event {clog['event_id'][:8]}...):")
                print(f"      Actor     : {clog['actor']}")
                print(f"      Action    : {clog['action']}")
                print(f"      Stored Hash  : {clog['stored_leaf_hash']}")
                print(f"      Computed Hash: {clog['computed_leaf_hash']}")
                print(f"      Reason    : {clog['reason']}")

    print("\n" + "=" * 70)
    print("  PHASE 1 & PHASE 2 SIMULATION COMPLETED SUCCESSFULLY")
    print("=" * 70)


if __name__ == "__main__":
    main()

