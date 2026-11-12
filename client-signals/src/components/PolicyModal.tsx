import React from 'react';
import { X, ShieldCheck, Lock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { SIMULATED_POLICY_RULES } from '../data/fixtures';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-800" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Simulated Policy Checks | Demo Ruleset v1
              </h3>
              <p className="text-[11px] text-slate-500">
                Governance, information-barrier filtering, and deterministic decision constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Illustrative Pre-Retrieval Authorization Gate</span>
              <p className="text-[11px] text-emerald-900 leading-relaxed mt-0.5">
                The demonstration uses synthetic records and illustrates different client visibility and read/comment/edit permissions through selectable demo personas. These are NOT authenticated user identities or production security controls. An example information-barrier exclusion is included in the audit trail. No restricted banking records are connected or processed. A production deployment would require bank-approved access controls, data classification, privacy and PII policies, and independent compliance validation before use.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Simulated Policy Rules · Not Production Certification
            </h4>

            {SIMULATED_POLICY_RULES.map((rule) => (
              <div key={rule.ruleId} className="p-3.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px]">
                      {rule.ruleId}
                    </span>
                    <span className="font-bold text-slate-900">
                      {rule.title}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {rule.version} · Demo rule
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 text-slate-500 text-[11px] space-y-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>All corporate accounts, CRM excerpts, and market developments are synthetic fixtures.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simulated integrations represent hypothetical corporate CRM and authorized research feeds; no live BNP Paribas systems are connected.</span>
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
