import datetime
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from crypto.ledger import BlockchainLedger
from crypto.merkle_tree import MerkleTree, sha256

if TYPE_CHECKING:
    from database import Database


class SOCValidator:
    """
    Real-Time Security Operations Center (SOC) Validator.
    Recalculates Merkle roots for all historical log batches in SQLite,
    compares them against the immutable BlockchainLedger roots,
    and generates high-priority alerts identifying exact compromised blocks and logs.
    """

    @staticmethod
    def validate_database(db: "Database", ledger: BlockchainLedger) -> Dict[str, Any]:
        """
        Validates all sealed historical blocks against the SQLite database.
        Returns a comprehensive validation report with high-priority alerts
        if any cryptographic hash mismatch is detected.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        alerts: List[Dict[str, Any]] = []
        total_blocks_checked = 0
        total_logs_checked = 0

        # Retrieve all sealed block heights from DB and ledger
        db_heights = db.get_all_block_heights()

        for height in db_heights:
            block = ledger.get_block_by_height(height)
            if not block:
                alerts.append({
                    "alert_id": str(uuid.uuid4()),
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "MISSING_BLOCK_ON_LEDGER",
                    "block_height": height,
                    "expected_merkle_root": None,
                    "recalculated_merkle_root": None,
                    "compromised_logs": [],
                    "message": f"Block height {height} exists in SQLite but is missing from the immutable ledger!",
                })
                continue

            total_blocks_checked += 1
            logs = db.get_logs_for_block(height)
            total_logs_checked += len(logs)

            if not logs and block.log_count > 0:
                alerts.append({
                    "alert_id": str(uuid.uuid4()),
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "MISSING_LOG_BATCH",
                    "block_height": height,
                    "expected_merkle_root": block.merkle_root,
                    "recalculated_merkle_root": None,
                    "compromised_logs": [],
                    "message": f"Block height {height} has 0 logs in SQLite, but ledger expects {block.log_count} logs!",
                })
                continue

            # Check individual leaf hashes and prepare tree input
            log_dicts_for_tree = []
            compromised_logs = []

            for log in logs:
                canonical_log = db.format_log_for_merkle(log)
                log_dicts_for_tree.append(canonical_log)

                recalculated_leaf = sha256(canonical_log)
                stored_leaf = log["leaf_hash"]

                if recalculated_leaf.lower() != stored_leaf.lower():
                    compromised_logs.append({
                        "log_id": log["id"],
                        "event_id": log["event_id"],
                        "leaf_index": log["leaf_index"],
                        "actor": log["actor"],
                        "action": log["action"],
                        "resource": log["resource"],
                        "stored_leaf_hash": stored_leaf,
                        "computed_leaf_hash": recalculated_leaf,
                        "reason": "Direct SQL modification detected: stored leaf hash != computed leaf hash",
                    })

            # Recalculate the entire batch Merkle root
            tree = MerkleTree(log_dicts_for_tree)
            recalculated_root = tree.get_root()
            expected_root = block.merkle_root

            root_mismatch = (recalculated_root.lower() != expected_root.lower())

            # If root mismatch occurred but individual stored leaf hashes were also forged,
            # include any log whose hash doesn't fit
            if root_mismatch and not compromised_logs:
                # Rogue admin changed both log data AND leaf_hash in SQLite, but cannot forge block Merkle root
                for idx, log in enumerate(logs):
                    compromised_logs.append({
                        "log_id": log["id"],
                        "event_id": log["event_id"],
                        "leaf_index": log["leaf_index"],
                        "actor": log["actor"],
                        "action": log["action"],
                        "resource": log["resource"],
                        "stored_leaf_hash": log["leaf_hash"],
                        "computed_leaf_hash": tree.get_leaf_hash(idx),
                        "reason": "Merkle root divergence: log batch contents differ from immutable block root",
                    })

            if root_mismatch or compromised_logs:
                alerts.append({
                    "alert_id": str(uuid.uuid4()),
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "CRYPTO_TAMPER_DETECTED",
                    "block_height": height,
                    "block_hash": block.block_hash,
                    "expected_merkle_root": expected_root,
                    "recalculated_merkle_root": recalculated_root,
                    "root_mismatch": root_mismatch,
                    "compromised_log_count": len(compromised_logs),
                    "compromised_logs": compromised_logs,
                    "message": (
                        f"CRITICAL SECURITY ALERT: Cryptographic tamper detected at Block Height #{height}! "
                        f"Recalculated Merkle root [{recalculated_root[:16]}...] diverges from "
                        f"immutable anchored root [{expected_root[:16]}...]. "
                        f"Pinpointed {len(compromised_logs)} compromised log entry(ies)."
                    ),
                })

        status_str = "TAMPER_DETECTED" if alerts else "VALID"
        summary_str = (
            f"Cryptographic integrity verified across {total_blocks_checked} block(s) and {total_logs_checked} log(s)."
            if not alerts
            else f"CRITICAL: {len(alerts)} block(s) failed cryptographic verification! Rogue tampering detected."
        )

        return {
            "status": status_str,
            "timestamp": now_iso,
            "blocks_checked": total_blocks_checked,
            "logs_checked": total_logs_checked,
            "tampered_blocks_count": len(alerts),
            "alerts": alerts,
            "summary": summary_str,
        }
