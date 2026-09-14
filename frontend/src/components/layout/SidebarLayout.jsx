import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Radio, SearchCheck, Blocks, Skull, ShieldCheck, ShieldAlert, 
  Activity, RefreshCw, Zap, RotateCcw, Terminal, ChevronRight,
  Shield, Layers, Database
} from 'lucide-react';
import { useAudit } from '../../context/AuditContext';
import ProofModal from '../ProofModal';

export default function SidebarLayout() {
  const {
    blocks,
    logs,
    tamperedBlockHeights,
    isPolling,
    setIsPolling,
    loadData,
    handleIngestBatch,
    handleReset,
    loading,
    connected,
    activeProofLogId,
    setActiveProofLogId,
  } = useAudit();

  const location = useLocation();
  const tamperCount = tamperedBlockHeights.length;
  const isBreached = tamperCount > 0;
  const latestBlockHeight = blocks.length > 0 ? blocks[blocks.length - 1].height : 0;

  const navItems = [
    {
      name: 'Live Feed',
      path: '/',
      icon: Radio,
      badge: `${logs.length} logs`,
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800/80',
    },
    {
      name: 'Forensic Analysis',
      path: '/forensics',
      icon: isBreached ? ShieldAlert : SearchCheck,
      badge: isBreached ? `${tamperCount} BREACH` : 'SECURE',
      badgeColor: isBreached ? 'bg-red-600 text-white font-bold animate-pulse' : 'bg-emerald-950 text-emerald-400 border-emerald-800/80',
    },
    {
      name: 'Ledger Explorer',
      path: '/ledger',
      icon: Blocks,
      badge: `#${latestBlockHeight}`,
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800/80',
    },
    {
      name: 'Red Team Sandbox',
      path: '/simulate',
      icon: Skull,
      badge: 'ATTACK LAB',
      badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    },
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Real-Time Audit Ingestion Feed', subtitle: 'Live event stream, throughput telemetry, and cryptographic verification ledger' };
      case '/forensics':
        return { title: 'SOC Forensic Incident Center', subtitle: 'Real-time Merkle root mismatch auditing, cryptographic divergence detection, and log isolation' };
      case '/ledger':
        return { title: 'Blockchain Ledger Explorer', subtitle: 'Sequential SHA-256 block chain, hash pointer inspection, and cryptographic audit proofs' };
      case '/simulate':
      case '/sandbox':
        return { title: 'Red Team Adversary Terminal', subtitle: 'Simulate direct SQLite database modifications bypassing the blockchain to test SOC detection' };
      default:
        return { title: 'SOC Forensic Explorer', subtitle: 'Cryptographically Verifiable Audit System' };
    }
  };

  const pageMeta = getPageTitle();

  return (
    <div className="min-h-screen bg-[#080B11] text-gray-100 flex flex-col md:flex-row font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Persistent Left-Hand Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0B0F17] border-r border-white/[0.08] flex flex-col flex-shrink-0 z-30 shadow-2xl">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
            isBreached
              ? 'bg-red-950/80 border-red-500 text-red-400 glow-rose-sm animate-bounce'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 glow-cyan-sm'
          }`}>
            {isBreached ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-base tracking-wider text-white">
                VERI-AUDIT
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-mono">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              SOC Security Platform
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500 px-3 py-1 font-bold">
            Audit Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 group ${
                    isActive
                      ? 'bg-cyan-950/50 text-white border border-cyan-500/40 shadow-lg glow-cyan-sm font-semibold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'
                      }`} />
                      <span>{item.name}</span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* DEFCON Posture Card in Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-black/30 space-y-3">
          <div className={`p-3 rounded-xl border text-xs font-mono transition-all ${
            isBreached
              ? 'bg-red-950/40 border-red-500/80 glow-rose-sm animate-flash-red'
              : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                DEFCON POSTURE
              </span>
              <span className={`w-2 h-2 rounded-full ${
                isBreached ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
              }`} />
            </div>
            <div className={`font-bold ${isBreached ? 'text-red-400' : 'text-emerald-400'}`}>
              {isBreached ? 'DEFCON 1 // BREACH' : 'DEFCON 5 // NOMINAL'}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {isBreached
                ? `${tamperCount} block(s) compromised`
                : 'All Merkle roots verified'}
            </div>
          </div>

          {/* Quick Telemetry Indicators */}
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-500'}`} />
              {connected ? 'Local Engine' : 'Offline'}
            </span>
            <span className="text-cyan-400">Block #{latestBlockHeight}</span>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-radial-glow">
        
        {/* Global Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#080B11]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <h1 className="text-sm lg:text-base font-bold text-white font-mono flex items-center gap-2">
              <span>{pageMeta.title}</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pageMeta.subtitle}
            </p>
          </div>

          {/* Header Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Live Radar Toggle */}
            <button
              onClick={() => setIsPolling(!isPolling)}
              title={isPolling ? "Pause 2.5s radar polling" : "Resume 2.5s radar polling"}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                isPolling
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 glow-cyan-sm'
                  : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isPolling ? 'text-cyan-400 animate-spin' : 'text-gray-500'}`} />
              {isPolling ? 'Radar Active (2.5s)' : 'Radar Paused'}
            </button>

            {/* Manual Audit Refresh */}
            <button
              onClick={() => loadData()}
              disabled={loading}
              title="Manual audit refresh"
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Ingest Events Button */}
            <button
              onClick={handleIngestBatch}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono rounded-lg shadow-lg glow-cyan-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              +10 Logs
            </button>

            {/* Reset State Button */}
            <button
              onClick={handleReset}
              disabled={loading}
              title="Reset database to Genesis state"
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>
        </header>

        {/* Active Page View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="border-t border-white/[0.06] py-3.5 px-6 text-center text-xs font-mono text-gray-500">
          VERI-AUDIT ENTERPRISE // Immutable SHA-256 Merkle Ledger • Real-Time SOC Detection
        </footer>

      </div>

      {/* Global Merkle Proof Modal */}
      {activeProofLogId && (
        <ProofModal
          logId={activeProofLogId}
          onClose={() => setActiveProofLogId(null)}
        />
      )}

    </div>
  );
}
