import datetime
from typing import Any, Dict, List, Optional, Union
import uuid

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from crypto.ledger import Block, BlockchainLedger
from crypto.merkle_tree import MerkleTree, canonical_json, sha256
from crypto.validator import SOCValidator
from database import Database

# Initialize database and ledger
db = Database()
ledger = db.load_ledger()

app = FastAPI(
    title="Immutable Audit Logging Engine",
    description="Tamper-evident audit logging backend using Merkle trees, simulated blockchain ledger, and SQLite.",
    version="1.0.0",
)

# Enable CORS for frontend or local integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---

class LogEvent(BaseModel):
    event_id: Optional[str] = Field(default=None, description="Unique event identifier (UUID generated if null)")
    timestamp: Optional[str] = Field(default=None, description="ISO-8601 UTC timestamp")
    actor: str = Field(..., description="Actor or service performing action", json_schema_extra={"example": "alice@security.org"})
    action: str = Field(..., description="Action performed", json_schema_extra={"example": "FILE_DELETE"})
    resource: str = Field(..., description="Target resource or object", json_schema_extra={"example": "/etc/shadow"})
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary event payload")


class LogBatchInput(BaseModel):
    logs: List[LogEvent] = Field(..., description="List of log events to ingest in batch")


class IngestResponse(BaseModel):
    status: str
    ingested_count: int
    new_blocks_minted: int
    new_block_heights: List[int]
    current_chain_height: int
    ingested_event_ids: List[str]


class LogRecordResponse(BaseModel):
    id: int
    event_id: str
    timestamp: str
    actor: str
    action: str
    resource: str
    payload: Any
    leaf_hash: str
    block_height: Optional[int]
    leaf_index: Optional[int]
    created_at: str
    block_hash: Optional[str] = None
    merkle_root: Optional[str] = None


class LogsListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    logs: List[LogRecordResponse]


class BlockModel(BaseModel):
    height: int
    timestamp: str
    merkle_root: str
    previous_hash: str
    block_hash: str
    log_count: int


class ProofStep(BaseModel):
    position: str
    hash: str


class MerkleProofResponse(BaseModel):
    log_id: int
    event_id: str
    block_height: int
    leaf_index: int
    leaf_hash: str
    merkle_root: str
    block_hash: str
    proof: List[ProofStep]


class VerifyProofRequest(BaseModel):
    log: Dict[str, Any]
    proof: List[ProofStep]
    block_height: int


class VerifyProofResponse(BaseModel):
    proof_valid: bool
    block_height: int
    block_merkle_root: str
    calculated_leaf_hash: str
    message: str


class TamperRequest(BaseModel):
    log_id: Optional[int] = Field(default=None, description="Specific log ID to tamper with. If null, latest batched log is chosen.")
    field: str = Field(default="action", description="Database column to modify ('action', 'actor', 'resource', 'payload')")
    new_value: str = Field(default="UNAUTHORIZED_PRIVILEGE_ESCALATION", description="Malicious value to write directly into database bypassing blockchain")


class TamperResponse(BaseModel):
    status: str
    tampered_log_id: int
    event_id: str
    block_height: int
    leaf_index: int
    field: str
    original_value: Any
    new_value: Any
    stored_leaf_hash: str
    bypassed_blockchain: bool
    warning: str


class CompromisedLogInfo(BaseModel):
    log_id: int
    event_id: str
    leaf_index: int
    actor: str
    action: str
    resource: str
    stored_leaf_hash: str
    computed_leaf_hash: str
    reason: str


class TamperAlert(BaseModel):
    alert_id: str
    timestamp: str
    severity: str
    alert_type: str
    block_height: int
    block_hash: str
    expected_merkle_root: str
    recalculated_merkle_root: str
    root_mismatch: bool
    compromised_log_count: int
    compromised_logs: List[CompromisedLogInfo]
    message: str


class ValidationResponse(BaseModel):
    status: str
    timestamp: str
    blocks_checked: int
    logs_checked: int
    tampered_blocks_count: int
    alerts: List[TamperAlert]
    summary: str


# --- Endpoints ---

@app.get("/", tags=["Info"])
def root_info():
    return {
        "service": "Immutable Audit Logging Engine",
        "status": "online",
        "batch_size_threshold": 10,
        "latest_block_height": ledger.get_latest_block().height,
        "docs_url": "/docs"
    }


@app.post(
    "/logs/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Ingestion"],
    summary="Ingest simulated audit events and trigger ledger batching",
)
def ingest_logs(data: Union[LogEvent, List[LogEvent], LogBatchInput]):
    """
    Accepts high-velocity simulated system events, stores them locally in SQLite,
    and automatically batches them into a new ledger block every 10 logs.
    """
    # Normalize input
    if isinstance(data, LogBatchInput):
        events = data.logs
    elif isinstance(data, list):
        events = data
    else:
        events = [data]

    if not events:
        raise HTTPException(status_code=400, detail="Empty event list provided")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_entries: List[Dict[str, Any]] = []

    for event in events:
        entry = {
            "event_id": event.event_id or str(uuid.uuid4()),
            "timestamp": event.timestamp or now_iso,
            "actor": event.actor,
            "action": event.action,
            "resource": event.resource,
            "payload": event.payload or {},
        }
        raw_entries.append(entry)

    # 1. Insert into SQLite
    inserted = db.insert_logs(raw_entries)

    # 2. Check and process batches (threshold = 10)
    new_blocks = db.check_and_process_batches(ledger, batch_size=10)

    return IngestResponse(
        status="success",
        ingested_count=len(inserted),
        new_blocks_minted=len(new_blocks),
        new_block_heights=[b.height for b in new_blocks],
        current_chain_height=ledger.get_latest_block().height,
        ingested_event_ids=[item["event_id"] for item in inserted],
    )


@app.get(
    "/logs",
    response_model=LogsListResponse,
    tags=["Query"],
    summary="Retrieve raw database entries alongside associated block height",
)
def get_logs(
    limit: int = Query(50, ge=1, le=500, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    block_height: Optional[int] = Query(None, description="Filter by block height"),
):
    """
    Retrieves raw database entries alongside their associated block height,
    Merkle leaf index, and block hash.
    """
    logs_data, total = db.get_logs(limit=limit, offset=offset, block_height=block_height)
    return LogsListResponse(
        total=total,
        limit=limit,
        offset=offset,
        logs=[LogRecordResponse(**item) for item in logs_data],
    )


@app.get(
    "/logs/{log_id}/proof",
    response_model=MerkleProofResponse,
    tags=["Cryptographic Proofs"],
    summary="Generate Merkle inclusion proof for a specific log",
)
def get_log_proof(log_id: int):
    """
    Generates the cryptographic Merkle proof for a leaf node within its block.
    """
    log = db.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail=f"Log with ID {log_id} not found")

    block_height = log.get("block_height")
    if block_height is None:
        raise HTTPException(
            status_code=400,
            detail="Log has not yet been sealed into a block (waiting for 10-log batch threshold)",
        )

    leaf_index = log.get("leaf_index")
    if leaf_index is None:
        raise HTTPException(status_code=500, detail="Log has block height but missing leaf index")

    # Fetch all logs in this block to reconstruct the tree
    block_logs = db.get_logs_for_block(block_height)
    log_dicts = [db.format_log_for_merkle(r) for r in block_logs]

    merkle_tree = MerkleTree(log_dicts)
    proof = merkle_tree.get_proof(leaf_index)

    block = ledger.get_block_by_height(block_height)
    block_hash = block.block_hash if block else log.get("block_hash", "")

    return MerkleProofResponse(
        log_id=log["id"],
        event_id=log["event_id"],
        block_height=block_height,
        leaf_index=leaf_index,
        leaf_hash=log["leaf_hash"],
        merkle_root=merkle_tree.get_root(),
        block_hash=block_hash,
        proof=[ProofStep(**p) for p in proof],
    )


@app.post(
    "/logs/verify",
    response_model=VerifyProofResponse,
    tags=["Cryptographic Proofs"],
    summary="Verify cryptographic proof of a log against ledger block root",
)
def verify_log_proof(request: VerifyProofRequest):
    """
    Verifies a log dictionary and its Merkle proof against the Merkle root of the specified block.
    """
    block = ledger.get_block_by_height(request.block_height)
    if not block:
        raise HTTPException(status_code=404, detail=f"Block height {request.block_height} not found on ledger")

    proof_steps = [p.model_dump() for p in request.proof]
    calc_hash = sha256(request.log)

    is_valid = MerkleTree.verify_proof(request.log, proof_steps, block.merkle_root)

    message = "Proof is cryptographically valid against block Merkle root" if is_valid else "Proof verification failed"
    return VerifyProofResponse(
        proof_valid=is_valid,
        block_height=request.block_height,
        block_merkle_root=block.merkle_root,
        calculated_leaf_hash=calc_hash,
        message=message,
    )


@app.get("/blocks", response_model=List[BlockModel], tags=["Ledger"], summary="Get all ledger blocks")
def get_blocks():
    """Retrieves all blocks in the simulated blockchain ledger."""
    return [BlockModel(**b.to_dict()) for b in ledger.chain]


@app.get("/blocks/{height}", tags=["Ledger"], summary="Get block details and associated logs")
def get_block_by_height(height: int):
    """Retrieves block header and all contained logs by block height."""
    block = ledger.get_block_by_height(height)
    if not block:
        raise HTTPException(status_code=404, detail=f"Block height {height} not found")
    logs = db.get_logs_for_block(height)
    return {
        "block": block.to_dict(),
        "logs": logs,
    }


@app.get("/chain/verify", tags=["Ledger"], summary="Validate full blockchain integrity")
def verify_chain():
    """
    Cryptographically verifies the sequential hash pointers and header integrity
    for the entire blockchain.
    """
    is_valid, reason = ledger.verify_chain()
    return {
        "chain_valid": is_valid,
        "total_blocks": len(ledger.chain),
        "latest_block_height": ledger.get_latest_block().height,
        "error": reason,
    }


@app.get("/stats", tags=["Info"], summary="Get audit system statistics")
def get_stats():
    """Returns total logs count, unbatched count, and block heights."""
    stats = db.get_stats()
    is_valid, _ = ledger.verify_chain()
    stats["chain_valid"] = is_valid
    return stats


# --- SOC Validator & Tamper Detection Endpoints ---

@app.get(
    "/validate",
    response_model=ValidationResponse,
    tags=["SOC Validator & Tamper Detection"],
    summary="Recalculate Merkle roots for all historical log batches and detect tampering",
)
def validate_ledger():
    """
    Recalculates the Merkle root for all historical log batches stored in the local SQLite database.
    Compares the recalculated roots against the immutable roots anchored in the BlockchainLedger.
    If a hash mismatch is detected, immediately returns a high-priority JSON security alert
    identifying the exact block and log entry that failed cryptographic verification.
    """
    report = SOCValidator.validate_database(db, ledger)
    return report


@app.post(
    "/simulate-tamper",
    response_model=TamperResponse,
    tags=["SOC Validator & Tamper Detection"],
    summary="Rogue Admin Simulation: direct SQL UPDATE on historical log bypassing blockchain",
)
def simulate_tamper(payload: Optional[TamperRequest] = None):
    """
    Rogue Admin Simulation:
    Connects directly to the SQLite database and executes an UPDATE query
    to alter a historical log's message/action, bypassing the blockchain entirely.
    """
    req = payload or TamperRequest()
    try:
        res = db.tamper_log_entry(
            log_id=req.log_id,
            field=req.field,
            new_value=req.new_value
        )
        return TamperResponse(
            status="TAMPER_SIMULATED",
            tampered_log_id=res["tampered_log_id"],
            event_id=res["event_id"],
            block_height=res["block_height"],
            leaf_index=res["leaf_index"],
            field=res["field"],
            original_value=res["original_value"],
            new_value=res["new_value"],
            stored_leaf_hash=res["stored_leaf_hash"],
            bypassed_blockchain=True,
            warning="Database row was modified directly via SQL. The blockchain ledger was bypassed. Run GET /validate to trigger real-time detection."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post(
    "/reset-demo",
    tags=["Info"],
    summary="Reset database and blockchain to fresh initial state for demo repeatability",
)
def reset_demo():
    """Resets the SQLite database and ledger chain to Genesis block."""
    global ledger
    db.reset_database()
    ledger = db.load_ledger()
    return {
        "status": "RESET_SUCCESSFUL",
        "message": "Audit database and blockchain reset to Genesis block.",
        "current_chain_height": ledger.get_latest_block().height,
    }


