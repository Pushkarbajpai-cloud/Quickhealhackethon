import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const AuditContext = createContext(null);

const SAMPLE_ACTORS = [
  "admin@corp.net",
  "service_worker_auth",
  "alice_dev",
  "bob_devops",
  "carol_dbadmin",
  "ingress_gateway",
  "threat_detection_agent",
];

const SAMPLE_ACTIONS = [
  ["AUTH_SUCCESS", "/api/v1/login"],
  ["FILE_WRITE", "/etc/nginx/nginx.conf"],
  ["PERMISSION_GRANT", "/roles/admin"],
  ["DATABASE_QUERY", "SELECT * FROM users WHERE role='root'"],
  ["KEY_ROTATION", "/kms/keys/master-secret"],
  ["CONFIG_CHANGE", "/k8s/cluster-policy.yaml"],
  ["AUTH_FAILURE", "/ssh/port-22"],
  ["TOKEN_ISSUE", "/oauth/token"],
];

function generateRandomLog() {
  const actor = SAMPLE_ACTORS[Math.floor(Math.random() * SAMPLE_ACTORS.length)];
  const [action, resource] = SAMPLE_ACTIONS[Math.floor(Math.random() * SAMPLE_ACTIONS.length)];
  return {
    actor,
    action,
    resource,
    payload: {
      source_ip: `192.168.1.${Math.floor(Math.random() * 200) + 10}`,
      severity: ["INFO", "WARN", "CRITICAL"][Math.floor(Math.random() * 3)],
      session_id: `sess-${Math.floor(Math.random() * 89999) + 10000}`,
    },
  };
}

export function AuditProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [activeProofLogId, setActiveProofLogId] = useState(null);
  const [lastTamperResult, setLastTamperResult] = useState(null);

  const isPollingRef = useRef(isPolling);
  isPollingRef.current = isPolling;

  // Global data fetcher
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [logsData, blocksData, valData] = await Promise.all([
        api.getLogs(200, 0),
        api.getBlocks(),
        api.getValidation(),
      ]);

      setLogs(logsData.logs || []);
      setBlocks(blocksData || []);
      setValidation(valData || null);
      setConnected(true);
    } catch (err) {
      console.error("Data load failed:", err);
      setConnected(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global 2.5s radar polling loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPollingRef.current) {
        loadData(true);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [loadData]);

  // Derived compromised states
  const alerts = validation?.alerts || [];
  const tamperedBlockHeights = alerts.map((a) => a.block_height);
  const compromisedLogIds = alerts.flatMap((a) =>
    (a.compromised_logs || []).map((l) => l.log_id)
  );

  // Actions
  const handleTamper = async (config) => {
    setLoading(true);
    try {
      const res = await api.simulateTamper(config);
      setLastTamperResult(res);
      await loadData();
      return res;
    } catch (err) {
      alert("Tamper simulation failed: " + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleIngestBatch = async () => {
    setLoading(true);
    try {
      const events = Array.from({ length: 10 }, () => generateRandomLog());
      await api.ingestLogs(events);
      await loadData();
    } catch (err) {
      alert("Batch ingestion failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset audit ledger to initial Genesis state?")) return;
    setLoading(true);
    try {
      await api.resetDemo();
      setLastTamperResult(null);
      setSelectedBlock(null);
      await loadData();
    } catch (err) {
      alert("Reset failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    logs,
    blocks,
    validation,
    alerts,
    tamperedBlockHeights,
    compromisedLogIds,
    loading,
    connected,
    isPolling,
    setIsPolling,
    selectedBlock,
    setSelectedBlock,
    activeProofLogId,
    setActiveProofLogId,
    lastTamperResult,
    loadData,
    handleTamper,
    handleIngestBatch,
    handleReset,
  };

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAudit must be used within an AuditProvider");
  }
  return context;
}
