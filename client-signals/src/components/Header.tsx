import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  Building2, 
  Clock, 
  FileCheck2, 
  ChevronDown, 
  RefreshCw, 
  Zap, 
  TrendingUp,
  Moon,
  Info,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  onSimulateEvent: () => void;
  onSimulateFedHike: () => void;
  onSimulateQuietMarket: () => void;
  onResetDemo: () => void;
  isSimulatedEventActive: boolean;
  activeSimulation: 'NONE' | 'USTR_EXEMPTION' | 'FED_RATE_HIKE' | 'QUIET_MARKET';
  onOpenPolicyModal: () => void;
  onOpenChat?: () => void;
  reviewCounts: {
    pending: number;
    verify: number;
    muted: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  onSimulateEvent,
  onSimulateFedHike,
  onSimulateQuietMarket,
  onResetDemo,
  isSimulatedEventActive,
  activeSimulation,
  onOpenPolicyModal,
  onOpenChat,
  reviewCounts,
}) => {
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDemoMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="w-full px-4 sm:px-6">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between min-h-16 py-3 sm:py-0 gap-3">
          
          {/* Zone 1: Operational Brand & Portfolio Scope */}
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <div className="w-9 h-9 rounded bg-emerald-900 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs">
              CS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  Client Signals
                </span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold text-emerald-800 tracking-wide uppercase">
                  Corporate Banking
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  Portfolio: 5 Mid-Cap Accounts
                </span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  07:30 EST Demo Snapshot
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Operational Telemetry & Review Status */}
          <div className="hidden 2xl:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Synthetic CRM &amp; Research</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700">
              <span className="font-semibold text-slate-900">Queue:</span>
              <span className="text-emerald-800 font-semibold">{reviewCounts.pending} Actionable</span>
              <span className="text-slate-300">·</span>
              <span className="text-amber-800 font-medium">{reviewCounts.verify} Verify</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{reviewCounts.muted} Excluded</span>
            </div>

            <button
              onClick={onOpenPolicyModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors border border-slate-200 cursor-pointer"
              title="Inspect simulated bank policy rules"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simulated policy checks | Demo ruleset v1</span>
            </button>
          </div>

          <button onClick={onOpenChat} className="ml-auto shrink-0 rounded-lg bg-emerald-800 hover:bg-emerald-900 px-4 py-2 text-sm font-semibold text-white flex items-center gap-2" aria-haspopup="dialog"><Sparkles className="w-4 h-4" />Ask AI</button>
          {/* Zone 3: Demo Controls Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {activeSimulation !== 'NONE' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Active Sim: {activeSimulation === 'USTR_EXEMPTION' ? 'USTR Exemption' : activeSimulation === 'FED_RATE_HIKE' ? 'Fed +25 bps' : 'Quiet Market'}
              </span>
            )}

            {/* Demo Controls Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 rounded border border-slate-300 transition-colors shadow-xs cursor-pointer"
                title="Open simulated demonstration controls"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-800" />
                <span>Demo Controls</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Simulated Market Developments
                  </div>

                  {/* 1. USTR 90-Day Tariff Exemption */}
                  <button
                    onClick={() => {
                      onSimulateEvent();
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${activeSimulation === 'USTR_EXEMPTION' ? 'text-amber-600' : 'text-emerald-700'}`} />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {activeSimulation === 'USTR_EXEMPTION' ? 'Revert USTR Exemption' : 'Simulate Event: USTR 90-Day Exemption'}
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Hypothetical waiver; review Atlas customs eligibility and retained FX risk
                      </span>
                    </div>
                  </button>

                  {/* 2. Fed 25 bps Rate Increase */}
                  <button
                    onClick={() => {
                      onSimulateFedHike();
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <TrendingUp className={`w-4 h-4 shrink-0 mt-0.5 ${activeSimulation === 'FED_RATE_HIKE' ? 'text-blue-600' : 'text-emerald-700'}`} />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {activeSimulation === 'FED_RATE_HIKE' ? 'Revert Fed Rate Hike' : 'Simulate Event: Fed 25 bps Rate Hike'}
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Hypothetical +25 bps; review conditional Apex SOFR sensitivity before Atlas
                      </span>
                    </div>
                  </button>

                  {/* 3. Quiet Market Scenario (0 New Shocks) */}
                  <button
                    onClick={() => {
                      onSimulateQuietMarket();
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <Moon className={`w-4 h-4 shrink-0 mt-0.5 ${activeSimulation === 'QUIET_MARKET' ? 'text-purple-600' : 'text-slate-500'}`} />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Quiet Market Scenario (0 New Shocks)
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        No actionable signals in this scenario; creates no banker approvals
                      </span>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Reset Demo State */}
                  <button
                    onClick={() => {
                      onResetDemo();
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Reset Demo State</span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Restore seeded records; clears demo decisions and local follow-ups
                      </span>
                    </div>
                  </button>

                  {/* Inspect Policy Rules */}
                  <button
                    onClick={() => {
                      onOpenPolicyModal();
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Inspect Policy Rules</span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Review demo ruleset v1 &amp; PR-AUTH-01 barrier enforcement
                      </span>
                    </div>
                  </button>

                  <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[10px] text-slate-400 italic">
                    All client records, news, and policies are synthetic demonstration inputs.
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
