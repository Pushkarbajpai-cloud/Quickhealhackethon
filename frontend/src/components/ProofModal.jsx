import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function ProofModal({ logId, onClose }) {
  const [proofData, setProofData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState(null);

  useEffect(() => {
    if (!logId) return;
    setLoading(true);
    setError(null);
    setVerifyStatus(null);

    api.getProof(logId)
      .then((data) => {
        setProofData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load Merkle proof");
        setLoading(false);
      });
  }, [logId]);

  if (!logId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel border border-cyan-500/30 p-6 shadow-2xl glow-cyan text-left font-mono">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Cryptographic Inclusion Proof (Merkle Audit Path)
              </h3>
              <p className="text-xs text-gray-400">
                Log #{logId} • Block #{proofData?.block_height ?? "..."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-12 text-center text-cyan-400 text-sm animate-pulse">
            Computing cryptographic proof path from Merkle tree...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-sm">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-400" />
            {error}
          </div>
        ) : proofData ? (
          <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Metadata Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <span className="text-[10px] text-gray-500 block">EVENT ID</span>
                <span className="text-gray-200 truncate block" title={proofData.event_id}>
                  {proofData.event_id.slice(0, 10)}...
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <span className="text-[10px] text-gray-500 block">BLOCK HEIGHT</span>
                <span className="text-cyan-400 font-bold">#{proofData.block_height}</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <span className="text-[10px] text-gray-500 block">LEAF INDEX</span>
                <span className="text-emerald-400 font-bold">Node {proofData.leaf_index}</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <span className="text-[10px] text-gray-500 block">AUDIT STEPS</span>
                <span className="text-white font-bold">{proofData.proof?.length} steps</span>
              </div>
            </div>

            {/* Leaf Hash */}
            <div className="p-3 rounded-lg bg-black/60 border border-gray-800 text-xs">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                Leaf Node Hash (SHA-256 of Canonical Log Record):
              </span>
              <div className="text-cyan-300 break-all select-all font-mono">
                {proofData.leaf_hash}
              </div>
            </div>

            {/* Merkle Proof Steps */}
            <div>
              <span className="text-xs font-bold text-gray-300 uppercase block mb-2">
                Sibling Audit Path Traversals ({proofData.proof?.length} Levels):
              </span>
              <div className="space-y-2">
                {proofData.proof?.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-gray-900/90 border border-gray-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-cyan-300 border border-gray-700">
                        Level {idx + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        step.position === 'right' ? 'bg-blue-900/60 text-blue-300' : 'bg-purple-900/60 text-purple-300'
                      }`}>
                        Sibling: {step.position.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-300 truncate max-w-[320px] select-all">
                      {step.hash}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Root Verification Anchor */}
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Target Merkle Root (Anchored on Ledger):
                </span>
              </div>
              <div className="text-emerald-300 break-all select-all font-mono text-[11px]">
                {proofData.merkle_root}
              </div>
            </div>

          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
