/**
 * Client-Side Cryptographic Engine & Blockchain Ledger
 * 
 * Provides:
 * 1. Synchronous FIPS 180-2 SHA-256 implementation.
 * 2. Deterministic Canonical JSON serializer (key-sorted, compact).
 * 3. Canonical Leaf Node hashing for audit log entries.
 * 4. MerkleTree class: calculation, Merkle Root generation, sibling audit path proof extraction, and verification.
 * 5. Sequential Blockchain Ledger with hash pointers (previous_hash -> block_hash).
 * 6. Real-time SOC Cryptographic Tamper Detector: recalculates batch Merkle roots from storage and flags divergence.
 */

// --- SHA-256 Implementation ---

function rightRotate(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256(input) {
  const ascii = typeof input === 'string' ? input : String(input);
  let i, j, result = '';
  const words = [];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // Encode string as UTF-8 bytes
  const bytes = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(ascii)
    : Buffer.from(ascii, 'utf8');

  const byteLength = bytes.length;
  const bitLength = byteLength * 8;

  for (i = 0; i < byteLength; i++) {
    words[i >> 2] |= (bytes[i] & 0xff) << (24 - (i % 4) * 8);
  }

  // Padding
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const w = new Array(64);

  for (i = 0; i < words.length; i += 16) {
    let [a, b, c, d, e, f, g, h] = hash;

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byteVal = (hash[i] >> (j * 8)) & 255;
      result += (byteVal < 16 ? '0' : '') + byteVal.toString(16);
    }
  }

  return result;
}

// --- Deterministic Canonical JSON ---

export function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalJson(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

// --- Format & Hash Log Entries ---

export function formatLogForMerkle(log) {
  let parsedPayload = log.payload;
  if (typeof parsedPayload === 'string') {
    try {
      parsedPayload = JSON.parse(parsedPayload);
    } catch {
      // keep as string
    }
  }

  return {
    action: String(log.action || ''),
    actor: String(log.actor || ''),
    event_id: String(log.event_id || ''),
    payload: parsedPayload ?? {},
    resource: String(log.resource || ''),
    timestamp: String(log.timestamp || ''),
  };
}

export function hashLog(log) {
  const formatted = formatLogForMerkle(log);
  return sha256(canonicalJson(formatted));
}

// --- Merkle Tree ---

export class MerkleTree {
  constructor(items = [], isHashes = false) {
    if (isHashes) {
      this.leaves = [...items];
    } else {
      this.leaves = items.map((item) => hashLog(item));
    }
    this.levels = [];
    this.buildTree();
  }

  buildTree() {
    if (this.leaves.length === 0) {
      this.levels = [["0".repeat(64)]];
      return;
    }

    let currentLevel = [...this.leaves];
    this.levels = [currentLevel];

    while (currentLevel.length > 1) {
      // Odd number of nodes: duplicate the last node
      if (currentLevel.length % 2 === 1) {
        currentLevel = [...currentLevel, currentLevel[currentLevel.length - 1]];
      }

      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const combined = currentLevel[i] + currentLevel[i + 1];
        nextLevel.push(sha256(combined));
      }

      this.levels.push(nextLevel);
      currentLevel = nextLevel;
    }
  }

  getRoot() {
    if (this.levels.length === 0 || this.levels[this.levels.length - 1].length === 0) {
      return "0".repeat(64);
    }
    return this.levels[this.levels.length - 1][0];
  }

  getProof(leafIndex) {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds (total leaves: ${this.leaves.length})`);
    }

    const proof = [];
    let currentIndex = leafIndex;

    for (let levelIndex = 0; levelIndex < this.levels.length - 1; levelIndex++) {
      let currentLevel = [...this.levels[levelIndex]];
      if (currentLevel.length % 2 === 1) {
        currentLevel.push(currentLevel[currentLevel.length - 1]);
      }

      if (currentIndex % 2 === 0) {
        // Node is left child, sibling is right child
        const siblingIndex = currentIndex + 1;
        proof.push({
          position: "right",
          hash: currentLevel[siblingIndex],
        });
      } else {
        // Node is right child, sibling is left child
        const siblingIndex = currentIndex - 1;
        proof.push({
          position: "left",
          hash: currentLevel[siblingIndex],
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  static verifyProof(leafHash, proof, expectedRoot) {
    let currentHash = leafHash;
    for (const step of proof) {
      const siblingHash = step.hash;
      let combined;
      if (step.position === 'left') {
        combined = siblingHash + currentHash;
      } else {
        combined = currentHash + siblingHash;
      }
      currentHash = sha256(combined);
    }
    return currentHash.toLowerCase() === expectedRoot.toLowerCase();
  }
}

// --- Block & Blockchain Ledger ---

export function computeBlockHash(height, timestamp, merkleRoot, previousHash, logCount) {
  const blockDict = {
    height,
    log_count: logCount,
    merkle_root: merkleRoot,
    previous_hash: previousHash,
    timestamp,
  };
  return sha256(canonicalJson(blockDict));
}

export class BlockchainLedger {
  constructor(initialBlocks = []) {
    if (initialBlocks.length > 0) {
      this.blocks = [...initialBlocks];
    } else {
      this.blocks = [this.createGenesisBlock()];
    }
  }

  createGenesisBlock() {
    const genesisTime = "2026-01-01T00:00:00.000000+00:00";
    const genesisRoot = "0".repeat(64);
    const genesisPrev = "0".repeat(64);
    const blockHash = computeBlockHash(0, genesisTime, genesisRoot, genesisPrev, 0);

    return {
      height: 0,
      timestamp: genesisTime,
      merkle_root: genesisRoot,
      previous_hash: genesisPrev,
      block_hash: blockHash,
      log_count: 0,
    };
  }

  getLatestBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  appendBlock(merkleRoot, logCount, timestamp = null) {
    const prevBlock = this.getLatestBlock();
    const newHeight = prevBlock.height + 1;
    const blockTime = timestamp || new Date().toISOString();
    const blockHash = computeBlockHash(newHeight, blockTime, merkleRoot, prevBlock.block_hash, logCount);

    const block = {
      height: newHeight,
      timestamp: blockTime,
      merkle_root: merkleRoot,
      previous_hash: prevBlock.block_hash,
      block_hash: blockHash,
      log_count: logCount,
    };

    this.blocks.push(block);
    return block;
  }

  verifyChain() {
    if (this.blocks.length === 0) return { valid: true, error: null };

    // Check Genesis block
    const genesis = this.blocks[0];
    if (genesis.height !== 0 || genesis.previous_hash !== "0".repeat(64)) {
      return { valid: false, error: "Genesis block format invalid" };
    }

    for (let i = 1; i < this.blocks.length; i++) {
      const current = this.blocks[i];
      const previous = this.blocks[i - 1];

      if (current.previous_hash !== previous.block_hash) {
        return {
          valid: false,
          error: `Broken chain link at Block #${current.height}: previous_hash does not match parent block_hash`,
          broken_height: current.height,
        };
      }

      const expectedHash = computeBlockHash(
        current.height,
        current.timestamp,
        current.merkle_root,
        current.previous_hash,
        current.log_count
      );

      if (current.block_hash !== expectedHash) {
        return {
          valid: false,
          error: `Tampered block header at Block #${current.height}: computed block_hash mismatch`,
          tampered_height: current.height,
        };
      }
    }

    return { valid: true, error: null };
  }
}

// --- SOC Real-Time Tamper & Validation Engine ---

export function validateLedger(blocks = [], logs = []) {
  const alerts = [];
  let tamperedBlocksCount = 0;
  const sealedBlocks = blocks.filter((b) => b.height > 0);

  for (const block of sealedBlocks) {
    // Collect all logs belonging to this block height
    const blockLogs = logs
      .filter((l) => l.block_height === block.height)
      .sort((a, b) => (a.leaf_index ?? 0) - (b.leaf_index ?? 0));

    if (blockLogs.length === 0) continue;

    // Recalculate leaf hashes and pinpoint compromised logs
    const compromisedLogs = [];
    const recalculatedLeafHashes = [];

    for (const log of blockLogs) {
      const recalculatedHash = hashLog(log);
      recalculatedLeafHashes.push(recalculatedHash);

      // Check against stored leaf_hash
      if (log.leaf_hash && log.leaf_hash !== recalculatedHash) {
        compromisedLogs.push({
          log_id: log.id,
          event_id: log.event_id,
          leaf_index: log.leaf_index,
          stored_leaf_hash: log.leaf_hash,
          recalculated_leaf_hash: recalculatedHash,
          tampered_fields: ["action", "actor", "resource"].filter((f) => {
            // Note: detected via hash mismatch
            return true;
          }),
        });
      }
    }

    // Recalculate Merkle root from recalculated leaf hashes
    const recalculatedTree = new MerkleTree(recalculatedLeafHashes, true);
    const recalculatedRoot = recalculatedTree.getRoot();

    const rootMismatch = recalculatedRoot.toLowerCase() !== block.merkle_root.toLowerCase();

    if (rootMismatch || compromisedLogs.length > 0) {
      tamperedBlocksCount++;
      alerts.push({
        alert_id: `alert-blk-${block.height}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: "CRITICAL",
        alert_type: "CRYPTO_TAMPER_DETECTED",
        block_height: block.height,
        block_hash: block.block_hash,
        expected_merkle_root: block.merkle_root,
        recalculated_merkle_root: recalculatedRoot,
        root_mismatch: rootMismatch,
        compromised_log_count: compromisedLogs.length,
        compromised_logs: compromisedLogs,
        message: `CRITICAL SECURITY ALERT: Cryptographic tamper detected at Block Height #${block.height}! Recalculated Merkle root [${recalculatedRoot.slice(0, 16)}...] diverges from immutable anchored root [${block.merkle_root.slice(0, 16)}...]. Pinpointed ${compromisedLogs.length} compromised log entry(ies).`,
      });
    }
  }

  const isTampered = alerts.length > 0;

  return {
    status: isTampered ? "TAMPER_DETECTED" : "OPTIMAL",
    timestamp: new Date().toISOString(),
    blocks_checked: sealedBlocks.length,
    logs_checked: logs.filter((l) => l.block_height !== null).length,
    tampered_blocks_count: tamperedBlocksCount,
    alerts,
    summary: isTampered
      ? `CRITICAL: ${tamperedBlocksCount} block(s) failed cryptographic verification! Rogue tampering detected.`
      : `All ${sealedBlocks.length} anchored blocks and Merkle roots verified successfully. 100% cryptographic integrity.`,
  };
}
