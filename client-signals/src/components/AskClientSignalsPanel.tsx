import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { AskClientSignalsDrawer } from "./AskClientSignalsDrawer";
import type {
  ClientProfile,
  SignalOpportunity,
  CRMNote,
  MarketDevelopment,
} from "../types";
import type { Simulation } from "../domain/workflow";

// Legacy embedded entry point delegates to the same authenticated, conversational
// drawer. There is no second provider client or unprotected chat implementation.
interface Props {
  selectedClient?: ClientProfile;
  selectedOpportunity?: SignalOpportunity;
  clients: ClientProfile[];
  opportunities: SignalOpportunity[];
  notes: CRMNote[];
  events: MarketDevelopment[];
  simulation?: Simulation;
  className?: string;
}
export function AskClientSignalsPanel({
  className = "",
  simulation = "NONE",
  ...context
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`p-5 ${className}`}>
      <h2 className="font-bold">Portfolio copilot</h2>
      <p className="mt-2 text-sm text-slate-600">
        Discuss economics, research public developments and prepare client
        conversations. Server configuration and private demo access are
        required.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex gap-2 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
      >
        <Sparkles className="w-4 h-4" />
        Ask AI
      </button>
      <AskClientSignalsDrawer
        {...context}
        simulation={simulation}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
