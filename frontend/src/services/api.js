const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = {
  // Fetch logs with pagination & filtering
  async getLogs(limit = 100, offset = 0, blockHeight = null) {
    let url = `${API_BASE}/logs?limit=${limit}&offset=${offset}`;
    if (blockHeight !== null && blockHeight !== undefined) {
      url += `&block_height=${blockHeight}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`);
    return await res.json();
  },

  // Real-time SOC validation
  async getValidation() {
    const res = await fetch(`${API_BASE}/validate`);
    if (!res.ok) throw new Error(`Validation check failed: ${res.statusText}`);
    return await res.json();
  },

  // Fetch all blocks
  async getBlocks() {
    const res = await fetch(`${API_BASE}/blocks`);
    if (!res.ok) throw new Error(`Failed to fetch blocks: ${res.statusText}`);
    return await res.json();
  },

  // Get Merkle proof for a specific log
  async getProof(logId) {
    const res = await fetch(`${API_BASE}/logs/${logId}/proof`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch proof: ${res.statusText}`);
    }
    return await res.json();
  },

  // Verify a log + proof against backend
  async verifyProof(payload) {
    const res = await fetch(`${API_BASE}/logs/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Verification failed: ${res.statusText}`);
    return await res.json();
  },

  // Rogue Admin Simulation (tamper with database)
  async simulateTamper(payload = {}) {
    const res = await fetch(`${API_BASE}/simulate-tamper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Tamper simulation failed");
    }
    return await res.json();
  },

  // Ingest logs
  async ingestLogs(events) {
    const res = await fetch(`${API_BASE}/logs/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    });
    if (!res.ok) throw new Error(`Failed to ingest logs: ${res.statusText}`);
    return await res.json();
  },

  // Reset demo
  async resetDemo() {
    const res = await fetch(`${API_BASE}/reset-demo`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`Reset demo failed: ${res.statusText}`);
    return await res.json();
  },

  // System stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return await res.json();
  }
};
