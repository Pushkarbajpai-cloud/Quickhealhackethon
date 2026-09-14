import React, { useState } from 'react';
import { Skull, Zap, SearchCheck, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SimulatorPanel({
  onTamper,
  onIngestBatch,
  onValidate,
  onReset,
  loading,
  lastTamperResult
}) {
  const [tamperField, setTamperField] = useState("action");
  const [tamperValue, setTamperValue] = useState("UNAUTHORIZED_PRIVILEGE_ESCALATION");

  const handleTamperClick = () => {
    onTamper({
      field: tamperField,
      new_value: tamperValue,
    });
  };

  return (
    <div className="mb-8 rounded-xl glass-panel p-5 border border-gray-800 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 glow-cyan animate-pulse" />
            FORENSIC SIMULATOR & ATTACK CONTROL PANEL
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Simulate an unauthorized adversary modifying historical logs in the database to test real-time Merkle tree detection.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Simulate Rogue Tampering button */}
          <button
            onClick={handleTamperClick}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono text-xs font-bold rounded-lg shadow-lg glow-rose transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Skull className="w-4 h-4 animate-bounce" />
            Simulate Rogue Tampering
          </button>

          {/* Burst Ingest +10 Events */}
          <button
            onClick={onIngestBatch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-lg shadow-lg glow-cyan transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Ingest 10 System Logs
          </button>

          {/* Manual Run Validation */}
          <button
            onClick={onValidate}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-xs font-semibold rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            <SearchCheck className="w-4 h-4 text-emerald-400" />
            Run SOC Audit
          </button>

          {/* Reset Demo */}
          <button
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white font-mono text-xs rounded-lg border border-gray-800 transition-colors disabled:opacity-50"
            title="Reset database to fresh state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>
      </div>

      {/* Advanced Attack Configuration Settings */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
        <div>
          <label className="block text-gray-400 mb-1">Target Database Column:</label>
          <select
            value={tamperField}
            onChange={(e) => setTamperField(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-red-500"
          >
            <option value="action">action (e.g. AUTH_FAILURE → PRIVILEGE_ESCALATION)</option>
            <option value="actor">actor (e.g. attacker → admin_impersonation)</option>
            <option value="resource">resource (e.g. /public → /root/secret_keys)</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 mb-1">Injected Malicious Value:</label>
          <input
            type="text"
            value={tamperValue}
            onChange={(e) => setTamperValue(e.target.value)}
            placeholder="Malicious string"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-red-300 font-mono focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-col justify-end">
          <div className="text-[11px] text-gray-400 bg-black/40 p-2 rounded-lg border border-gray-800/80">
            <span className="text-red-400 font-bold">Direct SQL Injection:</span> Executes <code className="text-gray-300">UPDATE logs SET...</code> bypassing the blockchain.
          </div>
        </div>
      </div>

      {/* Last Tamper Result Confirmation */}
      {lastTamperResult && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-gray-300">
            <span className="font-bold text-red-400">Rogue Admin Attack Executed: </span>
            Modified Log <strong className="text-white">#{lastTamperResult.tampered_log_id}</strong> in Block <strong className="text-cyan-400">#{lastTamperResult.block_height}</strong>.
            Changed <code className="text-gray-400">{lastTamperResult.field}</code> from <code className="text-emerald-400">"{lastTamperResult.original_value}"</code> to <code className="text-red-400 font-bold">"{lastTamperResult.new_value}"</code>.
          </div>
        </div>
      )}
    </div>
  );
}
