import React, { useState } from 'react';
import { 
  FileText, CheckCircle2, XCircle, Search, Key, ChevronDown, ChevronRight, 
  User, Server, Shield, Database, Lock, Copy, Check, Filter
} from 'lucide-react';

function getActorIcon(actor) {
  if (actor.includes('admin')) return <Shield className="w-3.5 h-3.5 text-amber-400" />;
  if (actor.includes('service') || actor.includes('gateway')) return <Server className="w-3.5 h-3.5 text-cyan-400" />;
  if (actor.includes('agent')) return <Database className="w-3.5 h-3.5 text-purple-400" />;
  return <User className="w-3.5 h-3.5 text-blue-400" />;
}

function getActionBadgeStyle(action, isCompromised) {
  if (isCompromised) {
    return 'bg-red-600/30 text-red-300 border-red-500 font-extrabold animate-pulse';
  }
  if (action.includes('AUTH')) {
    return 'bg-violet-950/70 text-violet-300 border-violet-800/60';
  }
  if (action.includes('FILE')) {
    return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
  }
  if (action.includes('PERMISSION') || action.includes('PRIVILEGE') || action.includes('KEY')) {
    return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
  }
  if (action.includes('CONFIG')) {
    return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
  }
  return 'bg-blue-950/70 text-blue-300 border-blue-800/60';
}

export default function LogTable({
  logs,
  compromisedLogIds,
  onInspectProof,
  selectedBlock,
  onClearFilter,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const copyText = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBlock =
      selectedBlock === null || selectedBlock === undefined || log.block_height === selectedBlock;

    return matchesSearch && matchesBlock;
  });

  return (
    <div className="rounded-xl glass-card border border-white/[0.08] shadow-2xl overflow-hidden mb-12">
      {/* Table Top Controls */}
      <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              System Audit Event Ledger
              <span className="text-[10px] text-gray-400 font-normal lowercase tracking-normal">
                (Immutable SQLite WAL Records)
              </span>
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-300 ml-1">
            {filteredLogs.length} Records
          </span>
          {selectedBlock !== null && (
            <button
              onClick={onClearFilter}
              className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900 transition-colors flex items-center gap-1"
            >
              <span>Block #{selectedBlock}</span>
              <span className="text-cyan-400 font-bold">✕</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter actor, action, resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/[0.08] rounded-lg text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-black/40 text-gray-400 border-b border-white/[0.06] uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Log ID</th>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Resource Target</th>
              <th className="py-3 px-4 text-center">Block Height</th>
              <th className="py-3 px-4 text-center">Cryptographic Proof Badge</th>
              <th className="py-3 px-4 text-right">Audit Path</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-gray-500 font-mono">
                  {loading ? "Refreshing cryptographic records..." : "No log records found."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isCompromised = compromisedLogIds.includes(log.id);
                const isBatched = log.block_height !== null;
                const isExpanded = expandedRow === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isCompromised
                          ? 'bg-red-950/30 hover:bg-red-950/50 text-red-200 border-l-2 border-l-red-500'
                          : 'hover:bg-slate-900/50 text-gray-300'
                      }`}
                    >
                      {/* Expand Toggle */}
                      <td className="py-3 px-3 text-center text-gray-500">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>

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
                        <div className="flex items-center gap-1.5">
                          {getActorIcon(log.actor)}
                          <span>{log.actor}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                          getActionBadgeStyle(log.action, isCompromised)
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate font-mono text-[11px]" title={log.resource}>
                        {log.resource}
                      </td>

                      {/* Block Height */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isBatched ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 font-bold text-[11px]">
                            #{log.block_height}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px] italic">Unbatched</span>
                        )}
                      </td>

                      {/* Cryptographic Proof Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCompromised ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white font-mono shadow-lg glow-rose-sm animate-pulse">
                            <XCircle className="w-3.5 h-3.5 text-white" />
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

                      {/* Inspect Proof Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isBatched ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectProof(log.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-cyan-950 text-gray-300 hover:text-cyan-300 border border-gray-800 hover:border-cyan-700/60 transition-colors text-[11px]"
                          >
                            <Key className="w-3 h-3 text-cyan-400" />
                            Proof Path
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable JSON Payload Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-black/60 border-y border-white/[0.06]">
                        <td colSpan="9" className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-gray-400 uppercase text-[10px] block mb-1 font-bold">
                                Raw Event Identifiers:
                              </span>
                              <div className="bg-black/80 p-2.5 rounded-lg border border-gray-800 text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Event UUID:</span>
                                  <span className="text-gray-200 select-all">{log.event_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Leaf Index:</span>
                                  <span className="text-cyan-300">Position {log.leaf_index} in Merkle Tree</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Ingested At:</span>
                                  <span className="text-gray-300">{log.created_at}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <span className="text-gray-400 uppercase text-[10px] block mb-1 font-bold">
                                SHA-256 Leaf Digest & Payload:
                              </span>
                              <div className="bg-black/80 p-2.5 rounded-lg border border-gray-800 text-[11px]">
                                <div className="mb-2">
                                  <span className="text-gray-500 block text-[10px]">Leaf Node Hash:</span>
                                  <span className="text-emerald-400/90 break-all select-all">{log.leaf_hash}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-[10px]">Payload:</span>
                                  <pre className="text-gray-300 text-[10px] mt-1 overflow-x-auto p-1.5 rounded bg-gray-950 border border-gray-900">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
