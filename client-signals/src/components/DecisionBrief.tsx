import React from "react";
import { Download, Sparkles, ArrowDownRight, Clock3, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import { INITIAL_CLIENTS, INITIAL_MARKET_DEVELOPMENTS } from "../data/fixtures";
import { portfolioBriefs, type InternalFollowUp } from "../domain/clientWorkflow";
import { bankerAction } from "../domain/workflow";
import type { SignalOpportunity } from "../types";

export function decisionTiming(opportunity: SignalOpportunity): string {
  if (opportunity.status === "SUPPRESSED" || opportunity.status === "DISMISSED")
    return "No outreach on this thesis; review only if new client evidence emerges.";
  if (opportunity.status === "VERIFY_FIRST")
    return "Verify missing or conflicting evidence before any product conversation.";
  if (opportunity.status === "DEFERRED")
    return "Revisit in 48 hours; review the evidence before resuming.";
  if (opportunity.status === "REVIEWED")
    return "Internal review recorded; schedule or prepare the banker-controlled follow-up.";
  if (opportunity.priorityRank === 0)
    return "Monitor only; no active signal currently qualifies for outreach.";
  if (opportunity.clientId === "meridian-freight")
    return "Review ahead of the November 30 RFP decision; confirm timetable first.";
  if (opportunity.clientId === "apex-biotech")
    return "Review this working session; confirm the next loan reset and Q1 2027 refinancing timetable.";
  return "Review this working session; confirm current payment, hedge coverage and delivery timing before contact.";
}

export function decisionSourceIds(opportunity: SignalOpportunity): string[] {
  return [...new Set([
    opportunity.eventId,
    ...(opportunity.internalResearchId ? [opportunity.internalResearchId] : []),
    ...(opportunity.clientNoteIds || []),
  ])];
}

export function decisionFollowUp(opportunity: SignalOpportunity): string {
  const objective = portfolioBriefs[opportunity.clientId]?.objective || bankerAction(opportunity).detail;
  const prefix = opportunity.status === "SUPPRESSED" || opportunity.status === "DISMISSED"
    ? "No outreach. "
    : opportunity.status === "VERIFY_FIRST" ? "Verify first. " : "Prepare RM follow-up. ";
  return (prefix + objective).slice(0, 1900);
}

export function DecisionBrief({
  opportunity, tasks, canComment, onPrepare, onOpenChat,
}: {
  opportunity: SignalOpportunity;
  tasks: InternalFollowUp[];
  canComment: boolean;
  onPrepare: (note: string) => void;
  onOpenChat?: () => void;
}) {
  const client = INITIAL_CLIENTS.find(c => c.id === opportunity.clientId);
  const event = INITIAL_MARKET_DEVELOPMENTS.find(e => e.id === opportunity.eventId);
  if (!client) return null;
  const objective = portfolioBriefs[client.id]?.objective || bankerAction(opportunity).detail;
  const timing = decisionTiming(opportunity);
  const sources = decisionSourceIds(opportunity);
  const action = bankerAction(opportunity);
  const state = opportunity.status === "SURFACED" ? (opportunity.priorityRank > 0 ? "ACT · RM review" : "MONITOR") : opportunity.status === "VERIFY_FIRST" ? "VERIFY" : opportunity.status === "SUPPRESSED" ? "HOLD OFF" : opportunity.status;
  const questions = opportunity.recommendedQuestions.slice(0,2);
  const exportPdf = () => {
    const pdf = new jsPDF({unit:"pt",format:"letter"});
    const margin = 44, width = 524, bottom = 736;
    let y=0;
    pdf.setFillColor(7,66,56);pdf.rect(0,0,612,88,"F");
    pdf.setFont("helvetica","bold");pdf.setFontSize(21);pdf.setTextColor(255,255,255);
    pdf.text("CLIENT SIGNALS",margin,46);
    pdf.setFont("helvetica","normal");pdf.setFontSize(10);
    pdf.text("Relationship Manager Decision Brief  |  Internal working draft",margin,68);
    y=113;
    const block=(label:string,value:string)=>{
      const raw=value.replaceAll("€","EUR ").replaceAll("→","to").replaceAll("·"," | ").replace(/[–—]/g,"-");
      pdf.setFont("helvetica","normal");pdf.setFontSize(10.2);
      const lines=pdf.splitTextToSize(raw,width) as string[];
      const height=19+lines.length*14+13;
      if(y+height>bottom){pdf.addPage();y=54;}
      pdf.setTextColor(12,105,90);pdf.setFont("helvetica","bold");pdf.setFontSize(9);
      pdf.text(label.toUpperCase(),margin,y);
      y+=18;pdf.setTextColor(39,51,62);pdf.setFont("helvetica","normal");pdf.setFontSize(10.2);
      pdf.text(lines,margin,y);y+=lines.length*14+13;
    };
    block("Client",client.name+"  |  "+client.headquarters+"  |  "+client.sector);
    block("Primary finance contact",client.treasuryContact.name+" | "+client.treasuryContact.title+" | "+client.treasuryContact.email);
    block("Current decision",state+" | "+action.label);
    block("When to act",timing);
    block("Signal / development",event?.title || "Synthetic scenario under review");
    block("Why this client",opportunity.whyThisClient);
    block("Why now",opportunity.whyNow);
    block("Conversation objective",objective);
    block("Checks before action",opportunity.evidenceGap || questions.join("  /  "));
    block("Documented evidence references",sources.join(", "));
    if(tasks.length)block("Saved internal follow-ups",tasks.map(t=>(t.completed?"Completed: ":"Open: ")+t.text).join("  /  "));
    block("Controls","Banker review required; no client communication or trade is executed by this export.");
    const pages=pdf.getNumberOfPages();
    for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setDrawColor(208,217,222);pdf.line(margin,759,568,759);pdf.setFontSize(8);pdf.setTextColor(99,111,121);pdf.text("SYNTHETIC CLIENTS & MARKET SCENARIOS  |  NOT BANK RESEARCH OR AN EXECUTABLE RECOMMENDATION",margin,771);pdf.text(String(n)+"/"+String(pages),560,786,{align:"right"});}
    pdf.save(client.id+"-decision-brief.pdf");
  };
  return <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3" aria-label="Decision brief">
    <div className="flex flex-wrap justify-between items-center gap-2">
      <div><h3 className="font-bold text-sm text-emerald-950">Decision Brief</h3><p className="text-xs text-slate-500">Prepared from available relationship evidence; banker review required</p></div>
      <span className="rounded-full bg-white border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-900">{state}</span>
    </div>
    <div className="grid md:grid-cols-2 gap-3 text-sm">
      <div className="bg-white border rounded-lg p-3"><span className="text-xs font-semibold text-slate-500 flex gap-1 items-center"><Clock3 size={13}/> WHEN</span><p className="mt-1 text-slate-800 leading-snug">{timing}</p></div>
      <div className="bg-white border rounded-lg p-3"><span className="text-xs font-semibold text-slate-500 flex gap-1 items-center"><ArrowDownRight size={13}/> CONVERSATION OBJECTIVE</span><p className="mt-1 text-slate-800 leading-snug">{objective}</p></div>
    </div>
    <p className="text-xs text-slate-700"><strong>Evidence:</strong> {sources.join(" · ") || "No source references"} <span className="text-slate-500">· Scenario based, verify current conditions</span></p>
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={exportPdf} className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-900"><Download size={15}/> Download brief (PDF)</button>
      {canComment&&<button onClick={()=>onPrepare(decisionFollowUp(opportunity))} className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white"><FileText size={15}/> Prepare internal follow-up</button>}
      {onOpenChat&&<button onClick={onOpenChat} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"><Sparkles size={15}/> Refine with Ask AI</button>}
    </div>
  </section>;
}
