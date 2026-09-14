import React, { useState } from 'react';
import { Link2, Link2Off, Box, CheckCircle2, AlertOctagon, Layers, Copy, Check } from 'lucide-react';

export default function ChainVisualizer({
  blocks,
  tamperedBlockHeights,
  selectedBlock,
  onSelectBlock
}) {
  const [copiedHash, setCopiedHash] = useState(null);

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!blocks || blocks.length === 0) {
    return (
      <div className="p-8 rounded-xl glass-card text-center text-gray-400 font-mono text-xs border border-white/[0.06]">
        No blocks minted on ledger yet. Ingest at least 10 events to mint Block #1.
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              Sequential Blockchain Hash Chain
              <span className="text-[10px] text-gray-400 font-normal lowercase tracking-normal">
                (tamper-evident SHA-256 chain)
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
          <span className="hidden sm:inline-block">Click block to isolate logs</span>
          <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-cyan-400 text-[11px]">
            {blocks.length} Block(s) Minted
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Blockchain Shelf */}
      <div className="overflow-x-auto pb-4 pt-2 scrollbar-thin">
        <div className="flex items-center gap-3 min-w-max px-1">
          {blocks.map((block, index) => {
            const isTampered = tamperedBlockHeights.includes(block.height);
            const isSelected = selectedBlock === block.height;
            const isGenesis = block.height === 0;
            const hasPrev = index > 0;
            const prevBlock = hasPrev ? blocks[index - 1] : null;
            const prevTampered = prevBlock && tamperedBlockHeights.includes(prevBlock.height);
            const linkSevered = isTampered || prevTampered;

            return (
              <React.Fragment key={block.height}>
                {/* Cryptographic Hash Chain Link */}
                {hasPrev && (
                  <div className="flex flex-col items-center justify-center px-1">
                    {linkSevered ? (
                      <div className="flex flex-col items-center animate-bounce group relative">
                        <div className="p-2 rounded-full bg-red-950 border-2 border-red-500 text-red-400 glow-rose-sm shadow-xl">
                          <Link2Off className="w-5 h-5 animate-pulse text-red-400" />
                        </div>
                        <span className="text-[9px] font-mono text-red-400 uppercase font-extrabold tracking-widest mt-1 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800">
                          LINK SEVERED
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center group">
                        <div className="p-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 glow-cyan-sm group-hover:scale-110 transition-transform">
                          <Link2 className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-[8px] font-mono text-cyan-500/70 tracking-tight mt-0.5 uppercase">
                          SHA-256 Link
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Block Card */}
                <div
                  onClick={() => onSelectBlock(selectedBlock === block.height ? null : block.height)}
                  className={`relative cursor-pointer transition-all duration-300 w-72 rounded-xl p-4 border text-left ${
                    isTampered
                      ? 'glass-card-danger shadow-2xl animate-flash-red'
                      : isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-xl glow-cyan-border scale-[1.02]'
                      : 'glass-card hover:border-gray-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        isTampered ? 'bg-red-900/50 text-red-400' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                      }`}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono font-bold text-sm text-white block leading-tight">
                          {isGenesis ? 'GENESIS BLOCK' : `BLOCK #${block.height}`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isTampered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white font-mono shadow animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                          TAMPERED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          VERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Block Metadata */}
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Batch Sealed:</span>
                      <span className="text-gray-200 font-semibold px-2 py-0.5 rounded bg-black/40 border border-gray-800">
                        {block.log_count} log entries
                      </span>
                    </div>

                    {/* Merkle Root */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase mb-0.5">
                        <span>Merkle Root:</span>
                        <button
                          onClick={(e) => copyToClipboard(block.merkle_root, e)}
                          className="hover:text-cyan-400 text-gray-500 transition-colors"
                          title="Copy Merkle Root"
                        >
                          {copiedHash === block.merkle_root ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className={`p-1.5 rounded text-[10px] break-all select-all ${
                        isTampered
                          ? 'bg-red-950/80 text-red-200 border border-red-800 font-bold'
                          : 'bg-black/50 text-gray-300 border border-white/[0.05]'
                      }`}>
                        {block.merkle_root.slice(0, 18)}...{block.merkle_root.slice(-10)}
                      </div>
                    </div>

                    {/* Block Hash */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase mb-0.5">
                        <span>Block Hash:</span>
                        <button
                          onClick={(e) => copyToClipboard(block.block_hash, e)}
                          className="hover:text-cyan-400 text-gray-500 transition-colors"
                          title="Copy Block Hash"
                        >
                          {copiedHash === block.block_hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-cyan-300/80 bg-black/30 p-1.5 rounded border border-white/[0.05] truncate select-all">
                        {block.block_hash.slice(0, 24)}...
                      </div>
                    </div>

                    {/* Previous Hash pointer */}
                    <div className="pt-2 text-[10px] text-gray-400 border-t border-white/[0.06] flex items-center justify-between">
                      <span>Prev Hash:</span>
                      <span className="text-gray-300 font-mono">{block.previous_hash.slice(0, 12)}...</span>
                    </div>
                  </div>

                  {/* Active Filter Pill */}
                  {isSelected && (
                    <div className="absolute -top-2.5 -right-2 px-2.5 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-extrabold uppercase font-mono shadow-lg glow-cyan-sm">
                      Active Filter
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
