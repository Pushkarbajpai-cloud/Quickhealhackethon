import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, Skull, Zap, RotateCcw, AlertTriangle, ArrowRight, 
  ShieldAlert, Play, CheckCircle2, CornerDownLeft, Eye, ShieldX, Radio, SearchCheck
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';

export default function SandboxPage() {
  const {
    handleTamper,
    handleIngestBatch,
    handleReset,
    lastTamperResult,
    tamperedBlockHeights,
    loading,
    logs,
  } = useAudit();

  const [tamperField, setTamperField] = useState('action');
  const [tamperValue, setTamperValue] = useState('UNAUTHORIZED_ROOT_PRIVILEGE_ESCALATION');
  const [targetLogId, setTargetLogId] = useState('');
  
  // Terminal output log lines
  const [terminalLines, setTerminalLines] = useState([
    { type: 'system', text: 'ADVERSARY C2 // RED TEAM EXPLOIT CONSOLE v3.4' },
    { type: 'system', text: 'Target: SQLite Audit Storage Engine (Bypassing Blockchain Consensus)' },
    { type: 'info', text: 'Type an exploit command or click "Hack Database" below to inject a rogue SQL update...' }
  ]);

  const addTerminalOutput = (lines) => {
    setTerminalLines((prev) => [...prev, ...lines]);
  };

  const executeTamperAttack = async (field = tamperField, value = tamperValue, logId = targetLogId) => {
    const time = new Date().toLocaleTimeString();
    const targetPayload = {
      field,
      new_value: value,
      ...(logId ? { log_id: parseInt(logId) } : {})
    };

    addTerminalOutput([
      { type: 'cmd', text: `root@adversary-node:~$ ./tamper_sqlite.sh --field "${field}" --val "${value}" ${logId ? `--id ${logId}` : '--latest'}` },
      { type: 'exec', text: `[${time}] [*] Initializing rogue database hook...` },
      { type: 'exec', text: `[${time}] [+] Direct SQLite WAL file handle acquired. Application API bypassed.` },
    ]);

    try {
      const res = await handleTamper(targetPayload);
      const sqlQuery = `UPDATE logs SET ${res.field} = '${res.new_value}' WHERE id = ${res.tampered_log_id};`;

      addTerminalOutput([
        { type: 'sql', text: `[${time}] [!] RAW SQL EXECUTED: ${sqlQuery}` },
        { type: 'success', text: `[${time}] [✓] Target Log #${res.tampered_log_id} in Block #${res.block_height} successfully altered!` },
        { type: 'warning', text: `[${time}] [⚠️] BLOCKCHAIN WAS NOT UPDATED: Anchored root on ledger still expects original data.` },
        { type: 'alert', text: `[${time}] [🚨] HASH MISMATCH CREATED: SOC validator will detect cryptographic divergence!` },
        { type: 'action', text: `>>> NOTICE: Check 'Live Feed' (/) or 'Forensic Analysis' (/forensics) to see the red alerts flashing!` }
      ]);
    } catch (err) {
      addTerminalOutput([
        { type: 'error', text: `[${time}] [✕] Exploit failed: ${err.message}` }
      ]);
    }
  };

  const handleResetTerminal = async () => {
    const time = new Date().toLocaleTimeString();
    addTerminalOutput([
      { type: 'cmd', text: 'root@adversary-node:~$ ./reset_ledger.sh --force' },
      { type: 'exec', text: `[${time}] [*] Purging tampered SQLite entries and reloading Genesis block...` }
    ]);
    await handleReset();
    addTerminalOutput([
      { type: 'success', text: `[${time}] [✓] Database and blockchain ledger reset to Genesis state.` }
    ]);
  };

  const isBreached = tamperedBlockHeights.length > 0;
  const computedSql = `UPDATE logs SET ${tamperField} = '${tamperValue}' WHERE id = ${targetLogId ? targetLogId : '{latest_batched_id}'};`;

  return (
    <div className="space-y-6">
      
      {/* Alert Banner when Tampered with Direct Links back to other pages */}
      {isBreached && (
        <div className="rounded-xl border-2 border-red-500 bg-red-950/40 p-4 sm:p-5 glow-rose animate-flash-red shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600 text-white animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
                  DEFCON 1 // EXPLOIT ACTIVE
                </span>
                <span className="text-xs text-red-300 font-mono">
                  {tamperedBlockHeights.length} Block(s) Cryptographically Compromised
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-red-200 mt-0.5">
                Rogue SQL modification executed. Blockchain hash chain is now fractured!
              </h3>
            </div>
          </div>

          {/* Quick Click Back Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-lg shadow transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>View Live Feed Alerts</span>
            </Link>
            <Link
              to="/forensics"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black text-red-300 border border-red-500/60 text-xs font-mono font-bold rounded-lg transition-colors"
            >
              <SearchCheck className="w-3.5 h-3.5" />
              <span>Inspect Root Mismatch</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Terminal Window Frame */}
      <div className="rounded-2xl border border-gray-800 bg-black/90 shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Terminal Title Bar */}
        <div className="bg-[#12161F] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/90" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/90" />
            <span className="text-gray-400 text-xs ml-2 font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              <span>root@adversary-c2:~/exploits/blockchain-audit-bypass</span>
            </span>
          </div>

          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">
              UNAUTHORIZED ACCESS
            </span>
            <span className="text-gray-600">bash 5.2#</span>
          </div>
        </div>

        {/* Interactive Terminal Output Console */}
        <div className="p-4 sm:p-6 bg-[#06080D] min-h-[260px] max-h-[380px] overflow-y-auto space-y-2 border-b border-gray-800/80 scrollbar-thin">
          {terminalLines.map((line, idx) => {
            let textColor = 'text-gray-300';
            if (line.type === 'system') textColor = 'text-cyan-400 font-bold';
            if (line.type === 'cmd') textColor = 'text-yellow-400 font-bold';
            if (line.type === 'sql') textColor = 'text-amber-300 font-bold bg-amber-950/30 p-1.5 rounded border border-amber-800/40 select-all';
            if (line.type === 'success') textColor = 'text-emerald-400 font-bold';
            if (line.type === 'warning') textColor = 'text-yellow-300';
            if (line.type === 'alert') textColor = 'text-red-400 font-bold animate-pulse';
            if (line.type === 'action') textColor = 'text-cyan-300 bg-cyan-950/40 p-2 rounded border border-cyan-800/60 font-bold';
            if (line.type === 'error') textColor = 'text-red-500 font-bold';

            return (
              <div key={idx} className={`font-mono text-xs leading-relaxed ${textColor}`}>
                {line.text}
              </div>
            );
          })}
          
          {/* Blinking CLI Prompt */}
          <div className="flex items-center gap-2 text-gray-400 pt-1">
            <span className="text-emerald-400">root@adversary-node:~$</span>
            <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Exploit Injection Command Center / Hack Controls */}
        <div className="p-4 sm:p-6 bg-[#0E131F] space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Hack Database & Rogue SQL Injection Controls
              </span>
            </div>
            <span className="text-[10px] text-gray-400">
              Direct SQLite Socket • Bypass Consensus
            </span>
          </div>

          {/* Form Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">
                Target Column:
              </label>
              <select
                value={tamperField}
                onChange={(e) => setTamperField(e.target.value)}
                className="w-full bg-black/80 border border-gray-700 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-red-500 text-xs font-mono"
              >
                <option value="action">action (e.g. AUTH_FAILURE → PRIVILEGE_ESCALATION)</option>
                <option value="actor">actor (e.g. alice_dev → admin@corp.net_SPOOFED)</option>
                <option value="resource">resource (e.g. /public → /root/secret_keys)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">
                Rogue Replacement Value:
              </label>
              <input
                type="text"
                value={tamperValue}
                onChange={(e) => setTamperValue(e.target.value)}
                placeholder="Injected malicious payload"
                className="w-full bg-black/80 border border-gray-700 rounded-lg p-2 text-red-300 font-mono text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">
                Target Log ID (Optional):
              </label>
              <input
                type="number"
                value={targetLogId}
                onChange={(e) => setTargetLogId(e.target.value)}
                placeholder="Default: Latest Batched Log"
                className="w-full bg-black/80 border border-gray-700 rounded-lg p-2 text-gray-300 font-mono text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Live SQL Preview Box */}
          <div className="p-2.5 rounded-lg bg-black/80 border border-gray-800 flex items-center justify-between text-[11px] font-mono">
            <div className="text-gray-400">
              <span className="text-gray-500">Query Preview: </span>
              <code className="text-yellow-300">{computedSql}</code>
            </div>
            <span className="text-red-400 text-[10px] font-bold">BYPASS CHAIN</span>
          </div>

          {/* Action Execution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            
            {/* Main Hack Database Button */}
            <button
              onClick={() => executeTamperAttack()}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-extrabold rounded-lg shadow-xl glow-rose-sm transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Skull className="w-4 h-4 animate-bounce" />
              <span>HACK DATABASE (EXECUTE SQL UPDATE)</span>
            </button>

            {/* Attack Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => executeTamperAttack('action', 'UNAUTHORIZED_PRIVILEGE_ESCALATION')}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-red-300 text-[11px] font-mono rounded-lg border border-red-900/60 transition-colors"
              >
                Preset: Privilege Escalation
              </button>
              <button
                onClick={() => executeTamperAttack('actor', 'admin@corp.net_SPOOFED')}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-amber-300 text-[11px] font-mono rounded-lg border border-amber-900/60 transition-colors"
              >
                Preset: Spoof Actor
              </button>
              <button
                onClick={() => executeTamperAttack('resource', '/root/master_private_keys.pem')}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-purple-300 text-[11px] font-mono rounded-lg border border-purple-900/60 transition-colors"
              >
                Preset: Poison Resource
              </button>
              <button
                onClick={handleResetTerminal}
                disabled={loading}
                title="Reset database and ledger"
                className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Post-Attack Navigation Prompt Guide */}
      <div className="p-4 rounded-xl glass-card border border-white/[0.08] text-xs font-mono text-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CornerDownLeft className="w-4 h-4 text-cyan-400" />
          <span>
            <strong>Next Step:</strong> After executing the tamper command above, navigate back to <Link to="/" className="text-cyan-400 underline font-bold">Live Feed (/)</Link> or <Link to="/forensics" className="text-red-400 underline font-bold">Forensics (/forensics)</Link> to see the red alerts flashing and Merkle divergence pinpointed.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-colors"
          >
            <span>Live Feed</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/forensics"
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-red-950 text-red-300 border border-red-800 hover:bg-red-900 transition-colors"
          >
            <span>Forensics</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
