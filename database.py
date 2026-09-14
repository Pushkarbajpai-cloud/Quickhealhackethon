import datetime
import json
import os
import sqlite3
import threading
import uuid
from typing import Any, Dict, List, Optional, Tuple

from crypto.ledger import Block, BlockchainLedger
from crypto.merkle_tree import MerkleTree, canonical_json, sha256

DEFAULT_DB_PATH = os.getenv("AUDIT_DB_PATH", "audit_ledger.db")


class Database:
    """
    SQLite persistence layer for logs and blockchain blocks.
    Thread-safe with connection pooling/per-call connections and WAL mode.
    """

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._lock = threading.Lock()
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns a configured SQLite connection with row dict access."""
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def init_db(self) -> None:
        """Initializes database schema and ensures Genesis block exists."""
        with self._lock, self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS blocks (
                    height INTEGER PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    merkle_root TEXT NOT NULL,
                    previous_hash TEXT NOT NULL,
                    block_hash TEXT NOT NULL,
                    log_count INTEGER NOT NULL
                );
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT UNIQUE NOT NULL,
                    timestamp TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    leaf_hash TEXT NOT NULL,
                    block_height INTEGER REFERENCES blocks(height),
                    leaf_index INTEGER,
                    created_at TEXT NOT NULL
                );
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_block_height ON logs(block_height);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_event_id ON logs(event_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);")

            # Check if Genesis block exists
            cursor.execute("SELECT COUNT(*) FROM blocks WHERE height = 0")
            if cursor.fetchone()[0] == 0:
                genesis = Block(
                    height=0,
                    timestamp="1970-01-01T00:00:00.000000Z",
                    merkle_root="0" * 64,
                    previous_hash="0" * 64,
                    log_count=0,
                )
                cursor.execute("""
                    INSERT INTO blocks (height, timestamp, merkle_root, previous_hash, block_hash, log_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    genesis.height,
                    genesis.timestamp,
                    genesis.merkle_root,
                    genesis.previous_hash,
                    genesis.block_hash,
                    genesis.log_count
                ))
            conn.commit()

    def load_ledger(self) -> BlockchainLedger:
        """Loads all blocks from database into a BlockchainLedger instance."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM blocks ORDER BY height ASC")
            rows = cursor.fetchall()
            blocks = [
                Block(
                    height=row["height"],
                    timestamp=row["timestamp"],
                    merkle_root=row["merkle_root"],
                    previous_hash=row["previous_hash"],
                    log_count=row["log_count"],
                    block_hash=row["block_hash"],
                )
                for row in rows
            ]
            return BlockchainLedger(initial_blocks=blocks if blocks else None)

    @staticmethod
    def format_log_for_merkle(row: Dict[str, Any]) -> Dict[str, Any]:
        """Formats log attributes into canonical dictionary for Merkle leaf hashing."""
        payload_data = row.get("payload")
        if isinstance(payload_data, str):
            try:
                payload_data = json.loads(payload_data)
            except Exception:
                pass

        return {
            "event_id": row["event_id"],
            "timestamp": row["timestamp"],
            "actor": row["actor"],
            "action": row["action"],
            "resource": row["resource"],
            "payload": payload_data,
        }

    def insert_logs(self, log_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Inserts new raw log entries into the SQLite database.
        Returns the inserted log records with their generated IDs and leaf hashes.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        inserted: List[Dict[str, Any]] = []

        with self._lock, self.get_connection() as conn:
            cursor = conn.cursor()
            for entry in log_entries:
                event_id = entry.get("event_id") or str(uuid.uuid4())
                timestamp = entry.get("timestamp") or now_iso
                actor = entry.get("actor", "system")
                action = entry.get("action", "UNKNOWN")
                resource = entry.get("resource", "unknown")
                raw_payload = entry.get("payload", {})
                payload_str = json.dumps(raw_payload, sort_keys=True) if not isinstance(raw_payload, str) else raw_payload

                formatted = {
                    "event_id": event_id,
                    "timestamp": timestamp,
                    "actor": actor,
                    "action": action,
                    "resource": resource,
                    "payload": raw_payload if not isinstance(raw_payload, str) else json.loads(payload_str),
                }
                leaf_hash = sha256(formatted)

                cursor.execute("""
                    INSERT INTO logs (event_id, timestamp, actor, action, resource, payload, leaf_hash, block_height, leaf_index, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
                """, (
                    event_id,
                    timestamp,
                    actor,
                    action,
                    resource,
                    payload_str,
                    leaf_hash,
                    now_iso
                ))

                row_id = cursor.lastrowid
                inserted.append({
                    "id": row_id,
                    "event_id": event_id,
                    "timestamp": timestamp,
                    "actor": actor,
                    "action": action,
                    "resource": resource,
                    "payload": raw_payload,
                    "leaf_hash": leaf_hash,
                    "block_height": None,
                    "leaf_index": None,
                    "created_at": now_iso
                })

            conn.commit()

        return inserted

    def check_and_process_batches(self, ledger: BlockchainLedger, batch_size: int = 10) -> List[Block]:
        """
        Checks if there are at least `batch_size` unbatched logs.
        For every full batch of `batch_size`, forms a Merkle tree, mints a new block,
        and atomically assigns block_height and leaf_index to the logs in SQLite.
        Returns list of newly created blocks.
        """
        new_blocks: List[Block] = []

        with self._lock, self.get_connection() as conn:
            cursor = conn.cursor()

            while True:
                cursor.execute("""
                    SELECT id, event_id, timestamp, actor, action, resource, payload, leaf_hash
                    FROM logs
                    WHERE block_height IS NULL
                    ORDER BY id ASC
                    LIMIT ?
                """, (batch_size,))
                rows = cursor.fetchall()

                if len(rows) < batch_size:
                    break

                batch_logs = [dict(r) for r in rows]
                log_dicts_for_tree = [self.format_log_for_merkle(r) for r in batch_logs]

                # Compute Merkle Tree
                merkle_tree = MerkleTree(log_dicts_for_tree)
                merkle_root = merkle_tree.get_root()

                # Append block to in-memory ledger
                new_block = ledger.append_block(
                    merkle_root=merkle_root,
                    log_count=len(batch_logs)
                )

                # Atomically write block to SQLite and update logs
                cursor.execute("""
                    INSERT INTO blocks (height, timestamp, merkle_root, previous_hash, block_hash, log_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    new_block.height,
                    new_block.timestamp,
                    new_block.merkle_root,
                    new_block.previous_hash,
                    new_block.block_hash,
                    new_block.log_count
                ))

                for idx, log_record in enumerate(batch_logs):
                    cursor.execute("""
                        UPDATE logs
                        SET block_height = ?, leaf_index = ?
                        WHERE id = ?
                    """, (new_block.height, idx, log_record["id"]))

                conn.commit()
                new_blocks.append(new_block)

        return new_blocks

    def get_logs(
        self,
        limit: int = 50,
        offset: int = 0,
        block_height: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Retrieves logs alongside their block height, sorted by ID descending.
        Returns (logs, total_count).
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            base_query = """
                FROM logs l
                LEFT JOIN blocks b ON l.block_height = b.height
            """
            conditions = []
            params: List[Any] = []

            if block_height is not None:
                conditions.append("l.block_height = ?")
                params.append(block_height)

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            # Count total matching
            cursor.execute(f"SELECT COUNT(*) {base_query} {where_clause}", tuple(params))
            total = cursor.fetchone()[0]

            # Query items
            query = f"""
                SELECT 
                    l.id,
                    l.event_id,
                    l.timestamp,
                    l.actor,
                    l.action,
                    l.resource,
                    l.payload,
                    l.leaf_hash,
                    l.block_height,
                    l.leaf_index,
                    l.created_at,
                    b.block_hash,
                    b.merkle_root
                {base_query}
                {where_clause}
                ORDER BY l.id DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, tuple(params + [limit, offset]))
            rows = cursor.fetchall()

            results = []
            for r in rows:
                item = dict(r)
                try:
                    item["payload"] = json.loads(item["payload"])
                except Exception:
                    pass
                results.append(item)

            return results, total

    def get_log_by_id(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single log by its database ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    l.id,
                    l.event_id,
                    l.timestamp,
                    l.actor,
                    l.action,
                    l.resource,
                    l.payload,
                    l.leaf_hash,
                    l.block_height,
                    l.leaf_index,
                    l.created_at,
                    b.block_hash,
                    b.merkle_root
                FROM logs l
                LEFT JOIN blocks b ON l.block_height = b.height
                WHERE l.id = ?
            """, (log_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            try:
                item["payload"] = json.loads(item["payload"])
            except Exception:
                pass
            return item

    def get_logs_for_block(self, block_height: int) -> List[Dict[str, Any]]:
        """Retrieves all logs in order for a given block height."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, event_id, timestamp, actor, action, resource, payload, leaf_hash, block_height, leaf_index, created_at
                FROM logs
                WHERE block_height = ?
                ORDER BY leaf_index ASC
            """, (block_height,))
            rows = cursor.fetchall()
            logs = []
            for r in rows:
                item = dict(r)
                try:
                    item["payload"] = json.loads(item["payload"])
                except Exception:
                    pass
                logs.append(item)
            return logs

    def get_stats(self) -> Dict[str, Any]:
        """Returns statistics on total logs, unbatched logs, and block count."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM logs")
            total_logs = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM logs WHERE block_height IS NULL")
            unbatched_logs = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM blocks")
            total_blocks = cursor.fetchone()[0]

            cursor.execute("SELECT MAX(height) FROM blocks")
            max_height = cursor.fetchone()[0] or 0

            return {
                "total_logs": total_logs,
                "unbatched_logs": unbatched_logs,
                "total_blocks": total_blocks,
                "latest_block_height": max_height,
            }

    def get_all_block_heights(self) -> List[int]:
        """Returns all sealed block heights (excluding Genesis block 0)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT height FROM blocks WHERE height > 0 ORDER BY height ASC")
            return [r[0] for r in cursor.fetchall()]

    def tamper_log_entry(
        self,
        log_id: Optional[int] = None,
        field: str = "action",
        new_value: str = "UNAUTHORIZED_ADMIN_OVERRIDE"
    ) -> Dict[str, Any]:
        """
        Rogue Admin Simulation:
        Connects directly to the SQLite database and executes an UPDATE query
        to alter a historical log, bypassing the blockchain ledger entirely.
        """
        allowed_fields = {"action", "actor", "resource", "payload"}
        if field not in allowed_fields:
            raise ValueError(f"Field '{field}' cannot be tampered. Allowed fields: {allowed_fields}")

        with self._lock, self.get_connection() as conn:
            cursor = conn.cursor()

            # If no log_id specified, pick the most recent batched log
            if log_id is None:
                cursor.execute("""
                    SELECT id FROM logs
                    WHERE block_height IS NOT NULL
                    ORDER BY id DESC
                    LIMIT 1
                """)
                row = cursor.fetchone()
                if not row:
                    raise ValueError("No batched logs available to tamper with")
                log_id = row[0]

            # Fetch original record
            cursor.execute("SELECT * FROM logs WHERE id = ?", (log_id,))
            orig_row = cursor.fetchone()
            if not orig_row:
                raise ValueError(f"Log ID {log_id} does not exist")

            original_dict = dict(orig_row)
            original_value = original_dict[field]

            # Direct SQL UPDATE bypassing blockchain
            val_to_write = new_value
            if field == "payload" and not isinstance(new_value, str):
                val_to_write = json.dumps(new_value, sort_keys=True)

            cursor.execute(f"UPDATE logs SET {field} = ? WHERE id = ?", (val_to_write, log_id))
            conn.commit()

            return {
                "tampered_log_id": log_id,
                "event_id": original_dict["event_id"],
                "block_height": original_dict["block_height"],
                "leaf_index": original_dict["leaf_index"],
                "field": field,
                "original_value": original_value,
                "new_value": new_value,
                "stored_leaf_hash": original_dict["leaf_hash"],
                "bypassed_blockchain": True,
            }

    def reset_database(self) -> None:
        """Clears all logs and blocks, re-seeding only the Genesis block."""
        with self._lock, self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM logs;")
            cursor.execute("DELETE FROM blocks;")
            conn.commit()
        self.init_db()


