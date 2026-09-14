import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from crypto.ledger import Block, BlockchainLedger
from crypto.merkle_tree import MerkleTree, canonical_json, sha256
from database import Database
from main import app


@pytest.fixture(autouse=True)
def isolate_test_db(tmp_path, monkeypatch):
    """Ensures every test executes with an isolated, clean SQLite database and ledger."""
    test_db_file = str(tmp_path / "isolated_audit.db")
    monkeypatch.setenv("AUDIT_DB_PATH", test_db_file)
    test_db = Database(db_path=test_db_file)
    test_ledger = test_db.load_ledger()
    monkeypatch.setattr("main.db", test_db)
    monkeypatch.setattr("main.ledger", test_ledger)
    yield


def test_canonical_json_determinism():
    d1 = {"z": 1, "a": 2, "m": {"b": 3, "a": 4}}
    d2 = {"a": 2, "m": {"a": 4, "b": 3}, "z": 1}
    assert canonical_json(d1) == canonical_json(d2)
    assert sha256(d1) == sha256(d2)


def test_merkle_tree_calculation_and_proofs():
    logs = [
        {"actor": f"user_{i}", "action": "LOGIN", "resource": f"/res/{i}", "payload": {"ip": f"10.0.0.{i}"}}
        for i in range(10)
    ]
    tree = MerkleTree(logs)
    root = tree.get_root()
    assert isinstance(root, str)
    assert len(root) == 64

    # Verify proof for each of the 10 leaves
    for i in range(10):
        proof = tree.get_proof(i)
        assert len(proof) > 0
        is_valid = MerkleTree.verify_proof(logs[i], proof, root)
        assert is_valid is True

    # Tampered leaf verification should fail
    tampered_leaf = dict(logs[0])
    tampered_leaf["actor"] = "attacker"
    proof_0 = tree.get_proof(0)
    assert MerkleTree.verify_proof(tampered_leaf, proof_0, root) is False


def test_merkle_tree_odd_leaves():
    for count in [1, 3, 5, 7, 9]:
        leaves = [{"id": i} for i in range(count)]
        tree = MerkleTree(leaves)
        root = tree.get_root()
        for i in range(count):
            proof = tree.get_proof(i)
            assert MerkleTree.verify_proof(leaves[i], proof, root) is True


def test_blockchain_ledger_chaining_and_tamper():
    ledger = BlockchainLedger()
    assert len(ledger.chain) == 1
    assert ledger.chain[0].height == 0
    assert ledger.chain[0].previous_hash == "0" * 64

    # Add blocks
    b1 = ledger.append_block(merkle_root="a" * 64, log_count=10)
    assert b1.height == 1
    assert b1.previous_hash == ledger.chain[0].block_hash

    b2 = ledger.append_block(merkle_root="b" * 64, log_count=10)
    assert b2.height == 2
    assert b2.previous_hash == b1.block_hash

    valid, err = ledger.verify_chain()
    assert valid is True
    assert err is None

    # Tamper with block 1's merkle root
    b1.merkle_root = "f" * 64
    valid, err = ledger.verify_chain()
    assert valid is False
    assert "hash" in err.lower() or "integrity" in err.lower()


def test_batching_at_exact_10_threshold(tmp_path):
    temp_db_file = str(tmp_path / "test_audit.db")
    test_db = Database(db_path=temp_db_file)
    test_ledger = test_db.load_ledger()

    assert test_ledger.get_latest_block().height == 0

    # Ingest 7 logs -> below threshold (10), no new block
    logs_7 = [
        {"actor": "admin", "action": f"READ_{i}", "resource": "doc.pdf", "payload": {}}
        for i in range(7)
    ]
    test_db.insert_logs(logs_7)
    new_blocks = test_db.check_and_process_batches(test_ledger, batch_size=10)
    assert len(new_blocks) == 0
    assert test_ledger.get_latest_block().height == 0

    # Ingest 3 more logs -> reaches 10! Exactly 1 block must be minted
    logs_3 = [
        {"actor": "admin", "action": f"READ_{i}", "resource": "doc.pdf", "payload": {}}
        for i in range(7, 10)
    ]
    test_db.insert_logs(logs_3)
    new_blocks = test_db.check_and_process_batches(test_ledger, batch_size=10)
    assert len(new_blocks) == 1
    assert new_blocks[0].height == 1
    assert new_blocks[0].log_count == 10

    # Verify logs now have block_height = 1 and leaf_index 0..9
    block_1_logs = test_db.get_logs_for_block(1)
    assert len(block_1_logs) == 10
    for idx, log in enumerate(block_1_logs):
        assert log["block_height"] == 1
        assert log["leaf_index"] == idx

    # Ingest 15 more logs -> reaches 25 total, 1 more block minted (height 2), 5 remain unbatched
    logs_15 = [
        {"actor": "bob", "action": f"WRITE_{i}", "resource": "config.yaml", "payload": {}}
        for i in range(15)
    ]
    test_db.insert_logs(logs_15)
    new_blocks = test_db.check_and_process_batches(test_ledger, batch_size=10)
    assert len(new_blocks) == 1
    assert new_blocks[0].height == 2

    stats = test_db.get_stats()
    assert stats["total_logs"] == 25
    assert stats["unbatched_logs"] == 5
    assert stats["latest_block_height"] == 2


def test_fastapi_endpoints():
    client = TestClient(app)

    # 1. Test root info
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["service"] == "Immutable Audit Logging Engine"

    # 2. Ingest 10 logs in batch
    batch_payload = {
        "logs": [
            {
                "actor": f"service_{i}",
                "action": "API_CALL",
                "resource": "/api/v1/auth",
                "payload": {"status_code": 200, "req_id": i}
            }
            for i in range(10)
        ]
    }
    ingest_resp = client.post("/logs/ingest", json=batch_payload)
    assert ingest_resp.status_code == 201
    data = ingest_resp.json()
    assert data["status"] == "success"
    assert data["ingested_count"] == 10
    assert data["new_blocks_minted"] >= 1

    # 3. Test GET /logs
    logs_resp = client.get("/logs?limit=10")
    assert logs_resp.status_code == 200
    logs_data = logs_resp.json()
    assert "total" in logs_data
    assert len(logs_data["logs"]) >= 10
    first_log = logs_data["logs"][0]
    assert "block_height" in first_log
    assert first_log["block_height"] is not None

    # 4. Test GET /logs/{id}/proof
    log_id = first_log["id"]
    proof_resp = client.get(f"/logs/{log_id}/proof")
    assert proof_resp.status_code == 200
    proof_data = proof_resp.json()
    assert proof_data["log_id"] == log_id
    assert "merkle_root" in proof_data
    assert "proof" in proof_data

    # 5. Test POST /logs/verify
    # Format canonical log for verification
    canonical_log = {
        "event_id": first_log["event_id"],
        "timestamp": first_log["timestamp"],
        "actor": first_log["actor"],
        "action": first_log["action"],
        "resource": first_log["resource"],
        "payload": first_log["payload"],
    }
    verify_payload = {
        "log": canonical_log,
        "proof": proof_data["proof"],
        "block_height": proof_data["block_height"],
    }
    verify_resp = client.post("/logs/verify", json=verify_payload)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["proof_valid"] is True

    # 6. Test GET /chain/verify
    chain_resp = client.get("/chain/verify")
    assert chain_resp.status_code == 200
    assert chain_resp.json()["chain_valid"] is True

    # 7. Test GET /blocks
    blocks_resp = client.get("/blocks")
    assert blocks_resp.status_code == 200
    assert len(blocks_resp.json()) >= 2  # Genesis + at least 1 block


def test_soc_validator_and_rogue_admin_tamper():
    client = TestClient(app)

    # 1. Ensure at least one batched block exists
    batch = {
        "logs": [
            {
                "actor": f"user_{i}",
                "action": "SYSTEM_EVENT",
                "resource": f"/sys/resource_{i}",
                "payload": {"seq": i}
            }
            for i in range(10)
        ]
    }
    ingest_resp = client.post("/logs/ingest", json=batch)
    assert ingest_resp.status_code == 201

    # 2. Run GET /validate prior to tampering -> should be VALID
    pre_val = client.get("/validate")
    assert pre_val.status_code == 200
    pre_data = pre_val.json()
    assert pre_data["status"] == "VALID"
    assert pre_data["tampered_blocks_count"] == 0
    assert len(pre_data["alerts"]) == 0

    # 3. Rogue Admin Simulation: direct SQL UPDATE altering historical log
    tamper_resp = client.post(
        "/simulate-tamper",
        json={
            "field": "action",
            "new_value": "MALICIOUS_ADMIN_BACKDOOR"
        }
    )
    assert tamper_resp.status_code == 200
    tamper_data = tamper_resp.json()
    assert tamper_data["status"] == "TAMPER_SIMULATED"
    assert tamper_data["bypassed_blockchain"] is True
    tampered_log_id = tamper_data["tampered_log_id"]
    tampered_block = tamper_data["block_height"]

    # 4. Run GET /validate after tampering -> immediate high-priority alert!
    post_val = client.get("/validate")
    assert post_val.status_code == 200
    post_data = post_val.json()
    assert post_data["status"] == "TAMPER_DETECTED"
    assert post_data["tampered_blocks_count"] >= 1
    assert len(post_data["alerts"]) >= 1

    # Pinpoint exact block and compromised log
    matching_alert = next((a for a in post_data["alerts"] if a["block_height"] == tampered_block), None)
    assert matching_alert is not None
    assert matching_alert["severity"] == "CRITICAL"
    assert matching_alert["alert_type"] == "CRYPTO_TAMPER_DETECTED"
    assert matching_alert["root_mismatch"] is True

    # Check that the exact compromised log is identified
    compromised_ids = [l["log_id"] for l in matching_alert["compromised_logs"]]
    assert tampered_log_id in compromised_ids

