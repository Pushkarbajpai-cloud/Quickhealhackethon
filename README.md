# Immutable Audit Logging Engine (Phase 1, Phase 2 & Phase 3)

High-throughput, tamper-evident audit logging backend and real-time React SOC Forensic Audit Explorer.

## Full System Architecture

- **Cryptographic Engine (`crypto/merkle_tree.py`)**:
  - Deterministic canonical JSON serialization (`canonical_json`).
  - SHA-256 Merkle Tree construction with duplicate handling for odd batch sizes.
  - Cryptographic audit proof generation (`get_proof`) and verification (`verify_proof`).
- **Simulated Blockchain Ledger (`crypto/ledger.py`)**:
  - Sequential blocks linking to `previous_hash` and the batch `merkle_root`.
  - Cryptographic chain integrity verification (`verify_chain`).
- **Storage & Ingestion Pipeline (`database.py` & `main.py`)**:
  - SQLite persistence in WAL mode.
  - High-velocity ingestion endpoint `POST /logs/ingest`.
  - Automatic batching into a new ledger block every 10 logs.
  - Query endpoint `GET /logs` with pagination and block height association.
- **SOC Validator & Tamper Detection (`crypto/validator.py`)**:
  - Real-time validation endpoint `GET /validate` that recalculates Merkle roots for all historical log batches in SQLite and compares them against immutable roots anchored in `BlockchainLedger`.
  - Rogue Admin Simulation endpoint `POST /simulate-tamper` executing direct SQL `UPDATE` queries on SQLite, bypassing the blockchain entirely.
  - Immediate high-priority JSON alert generation with pinpoint accuracy.
- **SOC Forensic Audit Explorer UI (`frontend/`)**:
  - React + Tailwind CSS v3 dark-mode command center.
  - Live polling radar checking cryptographic integrity every 2.5s.
  - Interactive blockchain hash chain visualizer showing intact vs. severed links.
  - Real-time audit log data table with green `[✓ Verified]` and red `[✕ Compromised]` badges.
  - Forensic Simulator control panel with 1-click Rogue Admin Tampering simulation.
  - Flashing critical SOC alert banner comparing expected vs. actual Merkle roots.
  - Cryptographic inclusion proof modal displaying the full Merkle audit path.

---

## Running the Application

### 1. Start FastAPI Backend (Port 8000)
```bash
python -m uvicorn main:app --reload --port 8000
```
Swagger UI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start React Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing & Simulation

### Automated Test Suite
```bash
python -m pytest -v tests/test_system.py
```
All 7 unit and integration tests pass with isolated databases.

### Standalone CLI Simulator
```bash
python simulate_ingestion.py --clean
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/logs/ingest` | Ingest single or batch log events; automatically mints block every 10 logs |
| `GET` | `/logs` | Retrieve raw database entries with associated block height & leaf index |
| `GET` | `/logs/{log_id}/proof` | Generate cryptographic Merkle inclusion proof for a log |
| `POST` | `/logs/verify` | Validate log and proof against block Merkle root |
| `GET` | `/blocks` | Retrieve all blocks on the simulated blockchain ledger |
| `GET` | `/blocks/{height}` | Retrieve block details and all logs sealed within that block |
| `GET` | `/chain/verify` | Validate complete blockchain hash chain integrity |
| `GET` | `/validate` | Real-time SOC validation: recalculates Merkle roots & pinpoints tampering |
| `POST` | `/simulate-tamper` | Rogue Admin Simulation: executes direct SQL UPDATE bypassing blockchain |
| `POST` | `/reset-demo` | Reset database and ledger back to Genesis state |
| `GET` | `/stats` | View total logs, unbatched buffer size, and chain height |
