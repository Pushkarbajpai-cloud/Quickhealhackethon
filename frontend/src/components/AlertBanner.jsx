import React from 'react';
import { AlertTriangle, ShieldX, Terminal, ArrowRight } from 'lucide-react';

export default function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {alerts.map((alert) => (
        <div
          key={alert.alert_id}
          className="relative overflow-hidden rounded-xl border-2 border-red-500 bg-red-950/40 p-4 lg:p-6 shadow-2xl glow-rose animate-flash-red"
        >
          {/* Top Banner Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-600/30 border border-red-500 text-red-300 animate-bounce">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500 text-white uppercase tracking-wider font-mono">
                    CRITICAL SOC ALERT
                  </span>
                  <span className="text-xs text-red-300 font-mono">
                    BLOCK HEIGHT #{alert.block_height}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-red-200 mt-0.5">
                  Cryptographic Integrity Breach Detected: Merkle Root Mismatch!
                </h3>
              </div>
            </div>

            <div className="text-right text-xs text-red-300 font-mono">
              <div>Time: {new Date(alert.timestamp).toLocaleTimeString()}</div>
              <div className="text-[11px] text-red-400 opacity-80">{alert.alert_id.slice(0, 18)}...</div>
            </div>
          </div>

          {/* Root Comparison Section */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected Merkle Root */}
            <div className="p-3.5 rounded-lg bg-gray-900/90 border border-emerald-500/40">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Anchored Blockchain Root (Immutable)
                </span>
                <span className="text-gray-400 font-mono">Height #{alert.block_height}</span>
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all p-2 rounded bg-black/40 border border-emerald-900/50 select-all">
                {alert.expected_merkle_root}
              </div>
            </div>

            {/* Recalculated Root from SQLite */}
            <div className="p-3.5 rounded-lg bg-gray-900/90 border border-red-500/50 glow-rose">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Recalculated Database Root (Tampered)
                </span>
                <span className="text-red-400 font-mono font-bold">MISMATCH</span>
              </div>
              <div className="font-mono text-xs text-red-300 break-all p-2 rounded bg-red-950/30 border border-red-800/60 select-all">
                {alert.recalculated_merkle_root}
              </div>
            </div>
          </div>

          {/* Pinpointed Compromised Logs */}
          {alert.compromised_logs && alert.compromised_logs.length > 0 && (
            <div className="mt-4 p-3.5 rounded-lg bg-black/50 border border-red-900/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300 mb-2 font-mono">
                <Terminal className="w-4 h-4 text-red-400" />
                PINPOINTED COMPROMISED DATABASE RECORD(S):
              </div>
              <div className="space-y-2">
                {alert.compromised_logs.map((log) => (
                  <div
                    key={log.log_id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded bg-red-950/20 border border-red-500/30 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">
                        LOG #{log.log_id}
                      </span>
                      <span className="text-gray-300">Actor: <strong className="text-white">{log.actor}</strong></span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-300">Action: <span className="text-red-300 font-bold underline">{log.action}</span></span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-300">Resource: {log.resource}</span>
                    </div>

                    <div className="text-[11px] text-red-400 italic">
                      {log.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation Alert Footer */}
          <div className="mt-3 flex items-center gap-2 text-xs text-red-200/90 font-mono">
            <ShieldX className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              Forensic Verdict: An adversary modified records directly in the SQLite database. Because blockchain blocks are cryptographically anchored, this tampering was instantly isolated.
            </span>
          </div>

        </div>
      ))}
    </div>
  );
}
