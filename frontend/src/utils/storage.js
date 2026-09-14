/**
 * Client-Side LocalStorage State Manager
 * 
 * Manages persisting and retrieving blockchain blocks, audit logs, and unbatched events.
 * Automatically seeds 20 audit events across 2 sealed blocks and a Genesis block
 * if localStorage is empty.
 */

import { 
  BlockchainLedger, 
  MerkleTree, 
  hashLog, 
  validateLedger 
} from './blockchain';

const STORAGE_KEY = 'veri_audit_ledger_v1';

const INITIAL_ACTORS = [
  "admin@corp.net",
  "service_worker_auth",
  "alice_dev",
  "bob_devops",
  "carol_dbadmin",
  "ingress_gateway",
  "threat_detection_agent",
];

const INITIAL_ACTIONS = [
  ["AUTH_SUCCESS", "/api/v1/login"],
  ["FILE_WRITE", "/etc/nginx/nginx.conf"],
  ["PERMISSION_GRANT", "/roles/admin"],
  ["DATABASE_QUERY", "SELECT * FROM users WHERE role='root'"],
  ["KEY_ROTATION", "/kms/keys/master-secret"],
  ["CONFIG_CHANGE", "/k8s/cluster-policy.yaml"],
  ["AUTH_FAILURE", "/ssh/port-22"],
  ["TOKEN_ISSUE", "/oauth/token"],
  ["NETWORK_RULE_ADD", "/iptables/allow-443"],
  ["SERVICE_RESTART", "systemctl restart auditd"],
];

function generateSeedLog(id, indexInBatch, blockHeight) {
  const actor = INITIAL_ACTORS[id % INITIAL_ACTORS.length];
  const [action, resource] = INITIAL_ACTIONS[id % INITIAL_ACTIONS.length];
  const baseDate = new Date(Date.now() - (25 - id) * 60 * 1000);

  const log = {
    id,
    event_id: `evt-${id.toString().padStart(4, '0')}-init`,
    timestamp: baseDate.toISOString(),
    actor,
    action,
    resource,
    payload: {
      source_ip: `192.168.1.${10 + (id % 50)}`,
      severity: id % 5 === 0 ? "WARN" : "INFO",
      session_id: `sess-${10000 + id}`,
    },
    block_height: blockHeight,
    leaf_index: indexInBatch,
  };

  log.leaf_hash = hashLog(log);
  return log;
}

export function createInitialSeedState() {
  const ledger = new BlockchainLedger(); // creates Genesis block at height 0

  const allLogs = [];

  // Seed Block #1 (Logs 1 to 10)
  const batch1 = [];
  for (let i = 0; i < 10; i++) {
    const logId = i + 1;
    batch1.push(generateSeedLog(logId, i, 1));
  }
  const tree1 = new MerkleTree(batch1);
  const block1 = ledger.appendBlock(tree1.getRoot(), 10, new Date(Date.now() - 20 * 60 * 1000).toISOString());
  allLogs.push(...batch1);

  // Seed Block #2 (Logs 11 to 20)
  const batch2 = [];
  for (let i = 0; i < 10; i++) {
    const logId = 10 + i + 1;
    batch2.push(generateSeedLog(logId, i, 2));
  }
  const tree2 = new MerkleTree(batch2);
  const block2 = ledger.appendBlock(tree2.getRoot(), 10, new Date(Date.now() - 5 * 60 * 1000).toISOString());
  allLogs.push(...batch2);

  return {
    blocks: ledger.blocks,
    logs: allLogs,
  };
}

export function loadLedgerState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.blocks) && Array.isArray(parsed.logs) && parsed.blocks.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load state from localStorage, re-seeding default state:", err);
  }

  // Generate initial state if empty or corrupt
  const initial = createInitialSeedState();
  saveLedgerState(initial);
  return initial;
}

export function saveLedgerState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

export function resetLedgerState() {
  const fresh = createInitialSeedState();
  saveLedgerState(fresh);
  return fresh;
}

/**
 * Ingests new log events and batches every 10 events into a new sealed block.
 */
export function ingestLogsToStorage(events = []) {
  const state = loadLedgerState();
  const nextIdStart = state.logs.length > 0 ? Math.max(...state.logs.map((l) => l.id)) + 1 : 1;

  const formattedNewLogs = events.map((event, idx) => {
    const logId = nextIdStart + idx;
    const log = {
      id: logId,
      event_id: event.event_id || `evt-${logId}-${Date.now().toString().slice(-4)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      actor: event.actor || 'anonymous',
      action: event.action || 'OPERATION',
      resource: event.resource || '/system',
      payload: event.payload || {},
      block_height: null,
      leaf_index: null,
    };
    log.leaf_hash = hashLog(log);
    return log;
  });

  state.logs.push(...formattedNewLogs);

  // Automatically seal batches of 10 unbatched logs
  const ledger = new BlockchainLedger(state.blocks);

  while (true) {
    const unbatched = state.logs.filter((l) => l.block_height === null);
    if (unbatched.length < 10) break;

    const currentBatch = unbatched.slice(0, 10);
    const newHeight = ledger.getLatestBlock().height + 1;

    // Assign block height and leaf index to this batch
    currentBatch.forEach((log, index) => {
      log.block_height = newHeight;
      log.leaf_index = index;
      log.leaf_hash = hashLog(log);
    });

    const batchTree = new MerkleTree(currentBatch);
    ledger.appendBlock(batchTree.getRoot(), currentBatch.length);
  }

  state.blocks = ledger.blocks;
  saveLedgerState(state);

  return {
    ingested_count: events.length,
    total_logs: state.logs.length,
    latest_block_height: state.blocks[state.blocks.length - 1].height,
  };
}

/**
 * Simulates direct database tampering bypassing blockchain consensus.
 */
export function tamperStoredLog({ field = 'action', new_value = 'UNAUTHORIZED_ACCESS', log_id = null }) {
  const state = loadLedgerState();

  // Find target log (either requested log_id or latest batched log)
  let targetLog = null;
  if (log_id) {
    targetLog = state.logs.find((l) => l.id === parseInt(log_id));
  } else {
    const batched = state.logs.filter((l) => l.block_height !== null);
    if (batched.length > 0) {
      targetLog = batched[batched.length - 1];
    }
  }

  if (!targetLog) {
    throw new Error(`Target log not found in storage for tampering.`);
  }

  const originalValue = targetLog[field];
  targetLog[field] = new_value;
  // NOTE: We deliberately DO NOT recalculate or update targetLog.leaf_hash
  // or the block's Merkle root, simulating a stealth rogue database update!

  saveLedgerState(state);

  return {
    status: "TAMPER_SIMULATED",
    tampered_log_id: targetLog.id,
    event_id: targetLog.event_id,
    block_height: targetLog.block_height,
    leaf_index: targetLog.leaf_index,
    field,
    original_value: originalValue,
    new_value,
    stored_leaf_hash: targetLog.leaf_hash,
    bypassed_blockchain: true,
    warning: "Database record altered directly in localStorage. Blockchain ledger header unchanged. Validation will detect cryptographic divergence.",
  };
}

/**
 * Generates client-side Merkle proof for a given log ID.
 */
export function getStoredProof(logId) {
  const state = loadLedgerState();
  const log = state.logs.find((l) => l.id === parseInt(logId));

  if (!log) {
    throw new Error(`Log #${logId} not found`);
  }

  if (log.block_height === null) {
    throw new Error(`Log #${logId} is not yet anchored into a sealed block`);
  }

  const block = state.blocks.find((b) => b.height === log.block_height);
  if (!block) {
    throw new Error(`Block #${log.block_height} not found`);
  }

  const blockLogs = state.logs
    .filter((l) => l.block_height === log.block_height)
    .sort((a, b) => (a.leaf_index ?? 0) - (b.leaf_index ?? 0));

  // Build Merkle tree from canonical log hashes
  const tree = new MerkleTree(blockLogs);
  const proof = tree.getProof(log.leaf_index);

  return {
    log_id: log.id,
    event_id: log.event_id,
    block_height: log.block_height,
    leaf_index: log.leaf_index,
    leaf_hash: log.leaf_hash || hashLog(log),
    merkle_root: block.merkle_root,
    proof,
  };
}
