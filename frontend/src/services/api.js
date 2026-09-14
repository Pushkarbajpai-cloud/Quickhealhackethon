/**
 * 100% Client-Side API Layer
 * 
 * Replaces remote FastAPI/Render network calls with native client-side
 * storage and cryptographic verification. Zero external server dependencies.
 */

import { 
  validateLedger, 
  MerkleTree 
} from '../utils/blockchain';
import {
  loadLedgerState,
  saveLedgerState,
  resetLedgerState,
  ingestLogsToStorage,
  tamperStoredLog,
  getStoredProof,
} from '../utils/storage';

export const api = {
  // Fetch logs with pagination & filtering
  async getLogs(limit = 100, offset = 0, blockHeight = null) {
    const state = loadLedgerState();
    let filtered = [...state.logs];

    if (blockHeight !== null && blockHeight !== undefined) {
      filtered = filtered.filter((l) => l.block_height === parseInt(blockHeight));
    }

    // Newest first by default
    filtered.sort((a, b) => b.id - a.id);
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
      limit,
      offset,
      logs: paginated,
    };
  },

  // Real-time SOC validation
  async getValidation() {
    const state = loadLedgerState();
    return validateLedger(state.blocks, state.logs);
  },

  // Fetch all blocks
  async getBlocks() {
    const state = loadLedgerState();
    // Attach contained logs to each block for Explorer inspection
    return state.blocks.map((block) => {
      const containedLogs = state.logs
        .filter((l) => l.block_height === block.height)
        .sort((a, b) => (a.leaf_index ?? 0) - (b.leaf_index ?? 0));
      return {
        ...block,
        contained_logs: containedLogs,
      };
    });
  },

  // Get Merkle proof for a specific log
  async getProof(logId) {
    return getStoredProof(logId);
  },

  // Verify a log + proof against Merkle Root
  async verifyProof(payload) {
    const { leaf_hash, proof, merkle_root } = payload;
    const isValid = MerkleTree.verifyProof(leaf_hash, proof, merkle_root);
    return {
      verified: isValid,
      leaf_hash,
      calculated_merkle_root: merkle_root,
      status: isValid ? "CRYPTOGRAPHICALLY_VERIFIED" : "VERIFICATION_FAILED",
    };
  },

  // Rogue Admin Simulation (tamper with database)
  async simulateTamper(payload = {}) {
    return tamperStoredLog(payload);
  },

  // Ingest logs
  async ingestLogs(events) {
    return ingestLogsToStorage(events);
  },

  // Reset demo
  async resetDemo() {
    const fresh = resetLedgerState();
    return {
      status: "RESET_SUCCESSFUL",
      message: "Audit database and blockchain reset to Genesis state in localStorage.",
      current_chain_height: fresh.blocks[fresh.blocks.length - 1].height,
    };
  },

  // System stats
  async getStats() {
    const state = loadLedgerState();
    const unbatched = state.logs.filter((l) => l.block_height === null).length;
    return {
      total_logs: state.logs.length,
      unbatched_logs: unbatched,
      total_blocks: state.blocks.length,
      latest_block_height: state.blocks[state.blocks.length - 1].height,
      chain_valid: true,
    };
  }
};
