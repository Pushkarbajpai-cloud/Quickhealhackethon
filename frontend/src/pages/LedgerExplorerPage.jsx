import React, { useState } from 'react';
import { 
  Blocks, Layers, Box, CheckCircle2, AlertOctagon, Key, 
  Link2, Link2Off, ArrowDown, ArrowUp, Copy, Check, ChevronDown, ChevronRight,
  Database, Clock, Hash, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';

export default function LedgerExplorerPage() {
  const {
    blocks,
    logs,
    tamperedBlockHeights,
    compromisedLogIds,
    setActiveProofLogId,
  } = useAudit();

  const [copiedHash, setCopiedHash] = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = Genesis down to Latest, 'desc' = Latest down to Genesis

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const toggleExpand = (height) => {
    setExpandedBlock(expandedBlock === height ? null : height);
  };

  // Sort blocks based on user preference
  const sortedBlocks = [...blocks].sort((a, b) => 
    sortOrder === 'asc' ? a.height - b.height : b.height - a.height
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="glass-card rounded-xl p-5 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-mono">
                Blockchain Timeline & Hash Pointer Explorer
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                Sequential Hash Chain
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Vertical ledger timeline showing how each block links to the preceding block's hash and anchors its batch Merkle root.
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-400 text-[11px]">Timeline Order:</span>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-gray-800 rounded-lg transition-colors"
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Genesis → Latest</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Latest → Genesis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vertical Timeline Representation */}
      <div className="relative pl-6 sm:pl-10 space-y-8">
        
        {/* Continuous Vertical Timeline Spine */}
        <div className="absolute left-2.5 sm:left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500/40 to-blue-500/20" />

        {sortedBlocks.map((block, index) => {
          const isTampered = tamperedBlockHeights.includes(block.height);
          const isGenesis = block.height === 0;
          const isExpanded = expandedBlock === block.height;
          const containedLogs = logs.filter((l) => l.block_height === block.height);

          // Find logical predecessor in chronological order
          const prevBlockInChain = blocks.find((b) => b.height === block.height - 1);
          const isPrevTampered = prevBlockInChain && tamperedBlockHeights.includes(prevBlockInChain.height);
          const isLinkSevered = isTampered || (isPrevTampered && !isGenesis);

          return (
            <div key={block.height} className="relative group">
              
              {/* Timeline Node Icon */}
              <div className={`absolute -left-6 sm:-left-10 top-5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-xl ${
                isTampered
                  ? 'bg-red-950 border-red-500 text-red-400 glow-rose-sm animate-pulse'
                  : 'bg-black border-cyan-400 text-cyan-400 glow-cyan-sm'
              }`}>
                {isTampered ? (
                  <AlertOctagon className="w-3.5 h-3.5" />
                ) : (
                  <Box className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Inter-Block Linking Indicator Banner */}
              {!isGenesis && sortOrder === 'asc' && index > 0 && (
                <div className="mb-3 -mt-4 pl-2 flex items-center gap-2 font-mono text-[10px]">
                  {isLinkSevered ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-500 text-red-300 glow-rose-sm animate-pulse">
                      <Link2Off className="w-3.5 h-3.5 text-red-400" />
                      <span>CRYPTOGRAPHIC LINK SEVERED (HASH DIVERGENCE)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300/80">
                      <Link2 className="w-3 h-3 text-cyan-400" />
                      <span>Cryptographic Hash Pointer Anchored</span>
                    </div>
                  )}
                </div>
              )}

              {/* Main Block Card */}
              <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isTampered
                  ? 'glass-card-danger shadow-2xl animate-flash-red'
                  : 'glass-card hover:border-white/[0.15]'
              }`}>
                
                {/* Block Header Bar */}
                <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      isTampered
                        ? 'bg-red-950 border-red-500 text-red-400'
                        : 'bg-cyan-950/60 border-cyan-800 text-cyan-400'
                    }`}>
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold font-mono text-white tracking-tight">
                          {isGenesis ? 'Genesis Block (Index #0)' : `Block Index #${block.height}`}
                        </h3>
                        {isTampered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono animate-pulse">
                            <AlertOctagon className="w-3 h-3" />
                            ROOT MISMATCH DETECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            CRYPTOGRAPHICALLY ANCHORED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>Timestamp: <strong>{new Date(block.timestamp).toUTCString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Batch summary count */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/[0.06]">
                      Batch Size: <strong className="text-white">{block.log_count} Logs</strong>
                    </span>
                  </div>
                </div>

                {/* Cryptographic Linkage Details Grid */}
                <div className="p-4 sm:p-5 space-y-3 font-mono text-xs">
                  
                  {/* 1. Previous Block Hash */}
                  <div className="p-3 rounded-lg bg-black/50 border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-purple-400" />
                        Previous Block Hash (Parent Link):
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(block.previous_hash, e)}
                        className="hover:text-cyan-400 text-gray-500 transition-colors"
                        title="Copy Previous Hash"
                      >
                        {copiedHash === block.previous_hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="text-gray-300 break-all select-all text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-gray-800">
                      {block.previous_hash}
                    </div>
                  </div>

                  {/* 2. Merkle Root */}
                  <div className={`p-3 rounded-lg border ${
                    isTampered
                      ? 'bg-red-950/40 border-red-500/70'
                      : 'bg-black/50 border-white/[0.06]'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Hash className={`w-3 h-3 ${isTampered ? 'text-red-400' : 'text-cyan-400'}`} />
                        The Merkle Root (Batch Root Hash):
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(block.merkle_root, e)}
                        className="hover:text-cyan-400 text-gray-500 transition-colors"
                        title="Copy Merkle Root"
                      >
                        {copiedHash === block.merkle_root ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className={`break-all select-all text-[11px] font-mono p-2 rounded border ${
                      isTampered
                        ? 'bg-red-950/80 text-red-200 border-red-800 font-bold'
                        : 'bg-slate-950/80 text-cyan-300 border-gray-800'
                    }`}>
                      {block.merkle_root}
                    </div>
                  </div>

                  {/* 3. Block Hash */}
                  <div className="p-3 rounded-lg bg-black/50 border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Current Block Hash:
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(block.block_hash, e)}
                        className="hover:text-cyan-400 text-gray-500 transition-colors"
                        title="Copy Block Hash"
                      >
                        {copiedHash === block.block_hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="text-emerald-300 break-all select-all text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-gray-800">
                      {block.block_hash}
                    </div>
                  </div>

                </div>

                {/* Contained Logs Expand Toggle */}
                <div className="px-4 py-3 bg-black/40 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(block.height)}
                    className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span>{isExpanded ? 'Collapse Contained Logs' : `Inspect Contained Logs (${containedLogs.length} Records)`}</span>
                  </button>

                  <span className="text-[11px] font-mono text-gray-500">
                    {isGenesis ? 'Genesis Block (No Logs)' : `Leaf Range: 0 to ${block.log_count - 1}`}
                  </span>
                </div>

                {/* Expandable Logs Sub-Table */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-black/60 p-4">
                    {containedLogs.length === 0 ? (
                      <div className="py-4 text-center text-gray-500 font-mono text-xs">
                        No logs recorded for this block.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                          <thead>
                            <tr className="bg-black/60 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                              <th className="py-2 px-3">Leaf Index</th>
                              <th className="py-2 px-3">Log ID</th>
                              <th className="py-2 px-3">Actor</th>
                              <th className="py-2 px-3">Action</th>
                              <th className="py-2 px-3">Resource Target</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              <th className="py-2 px-3 text-right">Proof</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60">
                            {containedLogs.map((log) => {
                              const isLogCompromised = compromisedLogIds.includes(log.id);

                              return (
                                <tr
                                  key={log.id}
                                  className={isLogCompromised ? 'bg-red-950/40 text-red-200' : 'hover:bg-slate-900/40 text-gray-300'}
                                >
                                  <td className="py-2 px-3 font-bold text-cyan-400">
                                    Leaf #{log.leaf_index}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-gray-400">
                                    #{log.id}
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-white">
                                    {log.actor}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isLogCompromised ? 'bg-red-600/40 text-red-200 border border-red-500' : 'bg-gray-800 text-gray-300'
                                    }`}>
                                      {log.action}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 truncate max-w-[180px]" title={log.resource}>
                                    {log.resource}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isLogCompromised ? (
                                      <span className="text-[10px] font-bold text-red-400">
                                        TAMPERED
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-400">
                                        VERIFIED
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      onClick={() => setActiveProofLogId(log.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-900 hover:bg-cyan-950 text-cyan-300 rounded text-[10px] border border-gray-800"
                                    >
                                      <Key className="w-3 h-3 text-cyan-400" />
                                      Proof
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
