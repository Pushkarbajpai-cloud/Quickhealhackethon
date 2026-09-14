import React from 'react';
import { ShieldCheck, ShieldAlert, Blocks, Database, Activity, Cpu, ArrowUpRight } from 'lucide-react';

export default function MetricRibbon({
  chainHeight,
  totalLogs,
  unbatchedCount = 0,
  tamperCount = 0,
  isPolling
}) {
  const progressPercent = Math.min(100, Math.round(((totalLogs % 10) / 10) * 100));
  const isHealthy = tamperCount === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Blockchain Ledger State */}
      <div className="glass-card rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
            <Blocks className="w-4 h-4 text-cyan-400" />
            Blockchain State
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-mono">
            Sequential
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              Block #{chainHeight}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              10 logs / sealed block
            </div>
          </div>
          <div className="text-right font-mono text-xs text-cyan-400/80 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-900/40">
            Genesis → #{chainHeight}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-transparent" />
      </div>

      {/* 2. Cryptographic Integrity Status */}
      <div className={`glass-card rounded-xl p-4 relative overflow-hidden transition-all duration-300 ${
        isHealthy ? 'hover:border-emerald-500/40' : 'glass-card-danger animate-flash-red'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
            {isHealthy ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
            )}
            Cryptographic Integrity
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
            isHealthy
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
              : 'bg-red-600 text-white animate-pulse'
          }`}>
            {isHealthy ? '100% ANCHORED' : 'BREACH DETECTED'}
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${
              isHealthy ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isHealthy ? 'SECURE' : `${tamperCount} BLOCKS FAILED`}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {isHealthy ? 'All Merkle roots match ledger' : 'Merkle root divergence alert!'}
            </div>
          </div>
          <div className={`text-right font-mono text-xs px-2 py-1 rounded border ${
            isHealthy
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
              : 'bg-red-950 text-red-300 border-red-800'
          }`}>
            {isHealthy ? 'SHA-256 Valid' : 'Tampered SQL'}
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          isHealthy
            ? 'bg-gradient-to-r from-emerald-500/50 to-transparent'
            : 'bg-red-500'
        }`} />
      </div>

      {/* 3. Ingestion Pipeline & Next Block Buffer */}
      <div className="glass-card rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-400" />
            Batching Pipeline
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-800/60 font-mono">
            {totalLogs % 10}/10 Logs
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-gray-300 font-semibold">Next Block Seal:</span>
            <span className="text-purple-400 font-bold">{progressPercent}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800 p-0.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-mono flex justify-between">
            <span>Buffer: {totalLogs % 10} unsealed</span>
            <span>Trigger threshold: 10</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/40 via-indigo-500/40 to-transparent" />
      </div>

      {/* 4. Total Ingested Audit Records */}
      <div className="glass-card rounded-xl p-4 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-400" />
            Total Audit Records
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
            SQLite WAL
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalLogs} Events
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Cryptographically verified
            </div>
          </div>
          <div className="text-right font-mono text-xs text-blue-400/90 bg-blue-950/40 px-2 py-1 rounded border border-blue-900/40 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Active
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/40 to-transparent" />
      </div>

    </div>
  );
}
