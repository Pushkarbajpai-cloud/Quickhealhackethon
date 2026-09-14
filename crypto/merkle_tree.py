import hashlib
import json
from typing import Any, Dict, List, Union


def canonical_json(data: Any) -> bytes:
    """
    Serializes a dictionary or value into canonical JSON bytes.
    Keys are sorted, whitespace is stripped, and UTF-8 encoded
    to guarantee deterministic hashing across systems.
    """
    if isinstance(data, bytes):
        return data
    if isinstance(data, str):
        return data.encode("utf-8")
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False
    ).encode("utf-8")


def sha256(data: Union[bytes, str, Dict[str, Any]]) -> str:
    """Computes SHA-256 hexadecimal digest for bytes, string, or dictionary."""
    if isinstance(data, dict):
        raw = canonical_json(data)
    elif isinstance(data, str):
        raw = data.encode("utf-8")
    elif isinstance(data, bytes):
        raw = data
    else:
        raw = canonical_json(data)
    return hashlib.sha256(raw).hexdigest()


class MerkleTree:
    """
    Cryptographic Merkle Tree built with SHA-256.
    Takes a batch of log dictionaries or strings, computes the Merkle root,
    and generates cryptographic inclusion proofs for any leaf node.
    """

    def __init__(self, leaves: List[Union[Dict[str, Any], str]]):
        self.raw_leaves = list(leaves)
        self.leaf_hashes: List[str] = [sha256(leaf) for leaf in self.raw_leaves]
        self.levels: List[List[str]] = []
        self._build_tree()

    def _build_tree(self) -> None:
        """Constructs the tree levels from leaves to root."""
        if not self.leaf_hashes:
            self.root: str = sha256(b"")
            self.levels = [[]]
            return

        current_level = list(self.leaf_hashes)
        self.levels.append(current_level)

        while len(current_level) > 1:
            next_level: List[str] = []
            num_nodes = len(current_level)

            # If odd number of nodes, duplicate the last node
            if num_nodes % 2 != 0:
                current_level.append(current_level[-1])

            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1]
                parent = hashlib.sha256((left + right).encode("utf-8")).hexdigest()
                next_level.append(parent)

            self.levels.append(next_level)
            current_level = next_level

        self.root = self.levels[-1][0]

    def get_root(self) -> str:
        """Returns the Merkle root hash."""
        return self.root

    def get_leaf_hash(self, index: int) -> str:
        """Returns the leaf hash at the given index."""
        if index < 0 or index >= len(self.leaf_hashes):
            raise IndexError(f"Leaf index {index} out of bounds (0 to {len(self.leaf_hashes)-1})")
        return self.leaf_hashes[index]

    def get_proof(self, index: int) -> List[Dict[str, str]]:
        """
        Generates a cryptographic inclusion proof (Merkle audit path) for the leaf at `index`.
        Each element in the proof indicates the sibling hash and its position relative
        to the current path node ('left' or 'right').
        """
        if not self.leaf_hashes:
            return []
        if index < 0 or index >= len(self.leaf_hashes):
            raise IndexError(f"Leaf index {index} out of bounds (0 to {len(self.leaf_hashes)-1})")

        proof: List[Dict[str, str]] = []
        curr_idx = index

        # Traverse from leaf level up to the level just below the root
        for level in self.levels[:-1]:
            # Working copy of the level (including duplicated odd sibling if needed)
            level_nodes = list(level)
            if len(level_nodes) % 2 != 0:
                level_nodes.append(level_nodes[-1])

            if curr_idx % 2 == 0:
                # Current node is left child -> sibling is right
                sibling_idx = curr_idx + 1
                proof.append({
                    "position": "right",
                    "hash": level_nodes[sibling_idx]
                })
            else:
                # Current node is right child -> sibling is left
                sibling_idx = curr_idx - 1
                proof.append({
                    "position": "left",
                    "hash": level_nodes[sibling_idx]
                })

            curr_idx = curr_idx // 2

        return proof

    @staticmethod
    def verify_proof(leaf: Union[Dict[str, Any], str, bytes], proof: List[Dict[str, str]], expected_root: str) -> bool:
        """
        Cryptographically verifies a Merkle proof for a given leaf against an expected root.
        """
        current_hash = sha256(leaf)

        for step in proof:
            sibling_hash = step["hash"]
            position = step["position"]

            if position == "right":
                combined = (current_hash + sibling_hash).encode("utf-8")
            elif position == "left":
                combined = (sibling_hash + current_hash).encode("utf-8")
            else:
                raise ValueError(f"Invalid proof position: {position}")

            current_hash = hashlib.sha256(combined).hexdigest()

        return current_hash.lower() == expected_root.lower()
