import React from 'react';
import { 
  ShieldAlert, ShieldCheck, SearchCheck, AlertTriangle, Key, Terminal, 
  ArrowRight, FileCheck, CheckCircle2, XCircle, Copy
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import AlertBanner from '../components/AlertBanner';

export default function ForensicsPage() {
  const {
    blocks,
    alerts,
    tamperedBlockHeights,
    setActiveProofLogId,
    loadData,
    loading,
  } = useAudit();

  const isBreached = alerts.length > 0;

  return (
    <div className="space-y-6">
      
      {/* Active Critical Alerts */}
      <AlertBanner alerts={alerts} />

      {/* Forensic Health Status Banner */}
      <div className={`glass-card rounded-xl p-6 border transition-all ${
        isBreached ? 'glass-card-danger glow-rose-sm' : 'border-emerald-500/30'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl border ${
              isBreached
                ? 'bg-red-950 border-red-500 text-red-400 animate-bounce'
                : 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
            }`}>
              {isBreached ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded uppercase tracking-wider ${
                  isBreached
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {isBreached ? 'INCIDENT IN PROGRESS' : 'ALL BLOCKS VERIFIED'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {blocks.length} Sealed Ledger Blocks Audited
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {isBreached
                  ? `Cryptographic Tampering Detected in ${alerts.length} Block(s)`
                  : 'Zero Cryptographic Discrepancies Detected'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                {isBreached
                  ? 'The automated SOC validator recalculated historical Merkle roots across the SQLite database and identified mathematical divergence from the immutable blockchain headers.'
                  : 'Every block in the local database has been verified against the sequential blockchain ledger. SHA-256 hash pointers and Merkle roots match 100%.'}
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-cyan-400 text-xs font-mono font-bold rounded-lg border border-cyan-800/60 shadow transition-colors"
            >
              Re-Run Cryptographic Audit
            </button>
          </div>
        </div>
      </div>

      {/* Merkle Root Ledger Audit Log Table */}
      <div className="glass-card rounded-xl p-5 border border-white/[0.08] shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <SearchCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-white">
              Historical Block Merkle Root Audit Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {blocks.length} Block Headers Audited
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-400 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Block Height</th>
                <th className="py-2.5 px-4">Batch Size</th>
                <th className="py-2.5 px-4">Anchored Ledger Merkle Root</th>
                <th className="py-2.5 px-4">Validation Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {blocks.map((block) => {
                const isTampered = tamperedBlockHeights.includes(block.height);
                const matchingAlert = alerts.find((a) => a.block_height === block.height);

                return (
                  <tr
                    key={block.height}
                    className={`transition-colors ${
                      isTampered ? 'bg-red-950/30 text-red-200' : 'hover:bg-slate-900/40 text-gray-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      Block #{block.height}
                    </td>

                    <td className="py-3 px-4 text-gray-400">
                      {block.log_count} logs
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-300 select-all max-w-[280px] truncate" title={block.merkle_root}>
                      {block.merkle_root}
                    </td>

                    <td className="py-3 px-4">
                      {isTampered ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white font-mono shadow glow-rose-sm animate-pulse">
                          <XCircle className="w-3 h-3" />
                          ROOT MISMATCH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ANCHORED MATCH
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isTampered && matchingAlert && matchingAlert.compromised_logs?.length > 0 ? (
                        <button
                          onClick={() => setActiveProofLogId(matchingAlert.compromised_logs[0].log_id)}
                          className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded text-[11px] font-mono border border-red-500"
                        >
                          Inspect Breach
                        </button>
                      ) : (
                        <span className="text-gray-500 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
