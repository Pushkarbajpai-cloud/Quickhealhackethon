import React from 'react';
import { ShieldCheck, ShieldAlert, Activity, RefreshCw, Zap, RotateCcw, Terminal, Radio } from 'lucide-react';

export default function Navbar({
  chainHeight,
  totalLogs,
  tamperCount,
  isPolling,
  onTogglePolling,
  onIngestBatch,
  onReset,
  onRefresh,
  loading,
  connected
}) {
  const isBreached = tamperCount > 0;

  return (
    <header className="sticky top-0 z-40 bg-[#080B11]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-8 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & SOC Security Posture */}
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
            isBreached
              ? 'bg-red-950/80 border-red-500 text-red-400 glow-rose animate-bounce'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 glow-cyan-sm'
          }`}>
            {isBreached ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-extrabold tracking-wider text-white font-mono flex items-center gap-2">
                VERI-AUDIT
                <span className="text-gray-500 font-light">/</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.05] text-cyan-300 border border-cyan-500/20 font-mono tracking-normal">
                  FORENSIC EXPLORER
                </span>
              </span>

              {/* Security Posture Badge */}
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                isBreached
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
              }`}>
                {isBreached ? 'DEFCON 1 // BREACH' : 'DEFCON 5 // NOMINAL'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className={`w-2 h-2 rounded-full ${
                  connected
                    ? isBreached ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'
                    : 'bg-gray-600'
                }`} />
                {connected ? 'Browser Engine Active' : 'Engine Offline'}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-[11px] font-mono text-gray-400">SHA-256 Merkle Verification</span>
            </div>
          </div>
        </div>

        {/* Live Controls & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Real-time Radar Toggle */}
          <button
            onClick={onTogglePolling}
            title={isPolling ? "Pause continuous validation radar" : "Resume continuous validation radar"}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
              isPolling
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/40 glow-cyan-sm'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isPolling ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
            {isPolling ? 'Live Radar (2.5s)' : 'Radar Idle'}
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Recalculate Merkle roots manually"
            className="p-2 rounded-lg bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white border border-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Burst Ingest Events button */}
          <button
            onClick={onIngestBatch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono rounded-lg shadow-lg glow-cyan-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            +10 Logs (Seal Block)
          </button>

          {/* Reset Demo button */}
          <button
            onClick={onReset}
            disabled={loading}
            title="Reset database and blockchain to initial Genesis state"
            className="p-2 rounded-lg bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white border border-gray-800 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
