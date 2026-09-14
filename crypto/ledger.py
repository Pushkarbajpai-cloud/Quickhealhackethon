import datetime
import hashlib
import json
import threading
from typing import Any, Dict, List, Optional, Tuple


def calculate_block_hash(
    height: int,
    timestamp: str,
    merkle_root: str,
    previous_hash: str,
    log_count: int
) -> str:
    """Computes deterministic SHA-256 hash of block header attributes."""
    header = {
        "height": height,
        "timestamp": timestamp,
        "merkle_root": merkle_root,
        "previous_hash": previous_hash,
        "log_count": log_count,
    }
    raw = json.dumps(header, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class Block:
    """
    Represents an immutable block in the ledger chain.
    Contains timestamp, Merkle root of the batch of logs,
    and the hash of the preceding block.
    """

    def __init__(
        self,
        height: int,
        timestamp: str,
        merkle_root: str,
        previous_hash: str,
        log_count: int,
        block_hash: Optional[str] = None
    ):
        self.height = height
        self.timestamp = timestamp
        self.merkle_root = merkle_root
        self.previous_hash = previous_hash
        self.log_count = log_count
        self.block_hash = block_hash or self.compute_hash()

    def compute_hash(self) -> str:
        """Recalculates the SHA-256 hash of this block's header."""
        return calculate_block_hash(
            height=self.height,
            timestamp=self.timestamp,
            merkle_root=self.merkle_root,
            previous_hash=self.previous_hash,
            log_count=self.log_count,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "height": self.height,
            "timestamp": self.timestamp,
            "merkle_root": self.merkle_root,
            "previous_hash": self.previous_hash,
            "log_count": self.log_count,
            "block_hash": self.block_hash,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Block":
        return cls(
            height=data["height"],
            timestamp=data["timestamp"],
            merkle_root=data["merkle_root"],
            previous_hash=data["previous_hash"],
            log_count=data["log_count"],
            block_hash=data.get("block_hash"),
        )


class BlockchainLedger:
    """
    Simulated sequential blockchain ledger managing tamper-evident blocks.
    Thread-safe for concurrent block creation.
    """

    GENESIS_PREVIOUS_HASH = "0" * 64

    def __init__(self, initial_blocks: Optional[List[Block]] = None):
        self._lock = threading.Lock()
        self.chain: List[Block] = []

        if initial_blocks:
            self.chain = list(initial_blocks)
        else:
            self._create_genesis_block()

    def _create_genesis_block(self) -> Block:
        """Creates the foundational Genesis block at height 0."""
        genesis = Block(
            height=0,
            timestamp="1970-01-01T00:00:00.000000Z",
            merkle_root="0" * 64,
            previous_hash=self.GENESIS_PREVIOUS_HASH,
            log_count=0,
        )
        self.chain.append(genesis)
        return genesis

    def get_latest_block(self) -> Block:
        """Returns the most recently sealed block on the ledger."""
        with self._lock:
            return self.chain[-1]

    def get_block_by_height(self, height: int) -> Optional[Block]:
        """Retrieves a block by its height index."""
        with self._lock:
            if 0 <= height < len(self.chain):
                return self.chain[height]
            return None

    def append_block(
        self,
        merkle_root: str,
        log_count: int,
        timestamp: Optional[str] = None
    ) -> Block:
        """
        Creates and seals a new block linked to the latest block's hash.
        Thread-safe.
        """
        with self._lock:
            latest = self.chain[-1]
            block_timestamp = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()
            new_block = Block(
                height=latest.height + 1,
                timestamp=block_timestamp,
                merkle_root=merkle_root,
                previous_hash=latest.block_hash,
                log_count=log_count,
            )
            self.chain.append(new_block)
            return new_block

    def verify_chain(self) -> Tuple[bool, Optional[str]]:
        """
        Validates the complete cryptographic chain:
        1. Correct sequential heights
        2. Recalculated block hash matches stored block hash
        3. previous_hash matches preceding block's hash
        Returns (True, None) if valid, or (False, reason) if corrupted/tampered.
        """
        with self._lock:
            if not self.chain:
                return False, "Chain is empty"

            # Check Genesis
            genesis = self.chain[0]
            if genesis.height != 0 or genesis.previous_hash != self.GENESIS_PREVIOUS_HASH:
                return False, "Invalid genesis block structure"
            if genesis.compute_hash() != genesis.block_hash:
                return False, f"Genesis block hash mismatch: computed {genesis.compute_hash()} != {genesis.block_hash}"

            # Check subsequent blocks
            for i in range(1, len(self.chain)):
                prev = self.chain[i - 1]
                curr = self.chain[i]

                if curr.height != prev.height + 1:
                    return False, f"Broken height sequence at index {i}: expected {prev.height + 1}, got {curr.height}"

                if curr.previous_hash != prev.block_hash:
                    return False, (
                        f"Hash link broken at block height {curr.height}: "
                        f"previous_hash {curr.previous_hash} does not match predecessor hash {prev.block_hash}"
                    )

                recomputed_hash = curr.compute_hash()
                if recomputed_hash != curr.block_hash:
                    return False, (
                        f"Block hash integrity violation at height {curr.height}: "
                        f"recomputed {recomputed_hash} != stored {curr.block_hash}"
                    )

            return True, None
