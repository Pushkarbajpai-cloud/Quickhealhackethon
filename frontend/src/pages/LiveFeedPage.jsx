import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  Database, Blocks, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, 
  Key, ArrowRight, TrendingUp, Clock, User, Server, AlertTriangle
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import AlertBanner from '../components/AlertBanner';

export default function LiveFeedPage() {
  const {
    logs,
    blocks,
    alerts,
    tamperedBlockHeights,
    compromisedLogIds,
    setActiveProofLogId,
    loading,
  } = useAudit();

  const isBreached = tamperedBlockHeights.length > 0;
  const latestBlockHeight = blocks.length > 0 ? blocks[blocks.length - 1].height : 0;
  const recentLogs = logs.slice(0, 10);

  // Activity breakdown data for quick Recharts throughput graph
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        name: `T-${6 - i}m`,
        count: 0,
      }));
    }

    const counts = {};
    logs.forEach((log) => {
      const act = log.action || "OTHER";
      counts[act] = (counts[act] || 0) + 1;
    });

    return Object.entries(counts).map(([action, count]) => ({
      name: action.length > 13 ? `${action.slice(0, 11)}...` : action,
      action,
      count,
    }));
  }, [logs]);

  return (
    <div className="space-y-6">
      
      {/* Critical Alert Banner (flashes when tampering is detected) */}
      <AlertBanner alerts={alerts} />

      {/* 3 Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Total Logs */}
        <div className="glass-card rounded-xl p-5 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                <Database className="w-4 h-4" />
              </div>
              Total Logs
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              Live Ingested
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {logs.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Immutable audit events stored
              </div>
            </div>
            <div className="text-right font-mono text-xs text-cyan-400/80 bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-900/40">
              SQLite WAL
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/50 via-blue-500/30 to-transparent" />
        </div>

        {/* Card 2: Blocks Anchored */}
        <div className="glass-card rounded-xl p-5 border border-white/[0.08] relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <Blocks className="w-4 h-4" />
              </div>
              Blocks Anchored
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60">
              Height #{latestBlockHeight}
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {blocks.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                10 logs per sealed block
              </div>
            </div>
            <div className="text-right font-mono text-xs text-purple-400/80 bg-purple-950/30 px-2.5 py-1 rounded border border-purple-900/40">
              SHA-256 Chain
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/50 via-indigo-500/30 to-transparent" />
        </div>

        {/* Card 3: System Integrity (TURNS RED IF MISMATCH DETECTED) */}
        <div className={`rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
          isBreached
            ? 'glass-card-danger border-2 border-red-500 glow-rose animate-flash-red'
            : 'glass-card border border-emerald-500/30 hover:border-emerald-500/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${
                isBreached
                  ? 'bg-red-950 border-red-500 text-red-400 animate-bounce'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              }`}>
                {isBreached ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              System Integrity
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isBreached
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {isBreached ? 'MISMATCH DETECTED' : 'OPTIMAL'}
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                isBreached ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {isBreached ? 'COMPROMISED' : '100% VERIFIED'}
              </div>
              <div className={`text-xs mt-1 ${isBreached ? 'text-red-300 font-semibold' : 'text-gray-400'}`}>
                {isBreached
                  ? `${tamperedBlockHeights.length} block(s) failed cryptographic check!`
                  : 'All Merkle roots anchored to blockchain'}
              </div>
            </div>
            <div className={`text-right font-mono text-xs px-2.5 py-1 rounded border ${
              isBreached
                ? 'bg-red-950 text-red-300 border-red-800'
                : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
            }`}>
              {isBreached ? 'CRITICAL' : 'SECURE'}
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${
            isBreached ? 'bg-red-500' : 'bg-emerald-500/60'
          }`} />
        </div>

      </div>

      {/* Quick Dashboard Recharts Graph */}
      <div className="glass-card rounded-xl p-5 border border-white/[0.08] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Live Ingestion Activity Telemetry
            </h3>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Real-time event action frequency
          </span>
        </div>

        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="liveAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  color: '#E2E8F0',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#06B6D4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#liveAreaGradient)"
                name="Action Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simplified Table of the Most Recent 10 Logs */}
      <div className="glass-card rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden">
        
        {/* Table Header with View All Link */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-xs text-white uppercase tracking-wider">
              Most Recent 10 Audit Logs
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Live Buffer
            </span>
          </div>

          <Link
            to="/ledger"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>Explore All Ledger Blocks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Simplified Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-400 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4 text-center">Block Height</th>
                <th className="py-3 px-4 text-center">Cryptographic Proof Badge</th>
                <th className="py-3 px-4 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500 font-mono">
                    {loading ? "Loading audit feed..." : "No logs available. Click '+10 Logs' to ingest simulated events."}
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => {
                  const isCompromised = compromisedLogIds.includes(log.id);
                  const isBatched = log.block_height !== null;

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isCompromised
                          ? 'bg-red-950/30 text-red-200 border-l-2 border-l-red-500'
                          : 'hover:bg-slate-900/50 text-gray-300'
                      }`}
                    >
                      {/* Log ID */}
                      <td className="py-3 px-4 font-bold text-gray-400">
                        #{log.id}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-gray-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {log.actor}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          isCompromised
                            ? 'bg-red-600/40 text-red-200 border-red-500'
                            : 'bg-gray-800 text-cyan-300 border-gray-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate" title={log.resource}>
                        {log.resource}
                      </td>

                      {/* Block Height */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isBatched ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/80 text-[11px]">
                            Block #{log.block_height}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px] italic">Unbatched</span>
                        )}
                      </td>

                      {/* Cryptographic Proof Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCompromised ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white font-mono shadow-lg glow-rose-sm animate-pulse">
                            <XCircle className="w-3.5 h-3.5" />
                            COMPROMISED
                          </span>
                        ) : isBatched ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-mono glow-emerald-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            VERIFIED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] text-yellow-400 bg-yellow-950/40 border border-yellow-800/60 font-mono">
                            Pending Batch
                          </span>
                        )}
                      </td>

                      {/* Proof Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isBatched ? (
                          <button
                            onClick={() => setActiveProofLogId(log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 hover:bg-cyan-950 text-gray-300 hover:text-cyan-300 rounded text-[11px] font-mono border border-gray-800 transition-colors"
                          >
                            <Key className="w-3 h-3 text-cyan-400" />
                            Proof
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
