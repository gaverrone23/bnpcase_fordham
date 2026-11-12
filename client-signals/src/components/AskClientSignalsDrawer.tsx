import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Building2, 
  FileText, 
  AlertCircle, 
  CornerDownRight, 
  ShieldAlert, 
  RotateCcw,
  Bot,
  User
} from 'lucide-react';
import type { Simulation } from '../domain/workflow';
import { ClientProfile, SignalOpportunity, CRMNote, MarketDevelopment } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface AskClientSignalsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClient?: ClientProfile;
  selectedOpportunity?: SignalOpportunity;
  clients: ClientProfile[];
  opportunities: SignalOpportunity[];
  notes: CRMNote[];
  events: MarketDevelopment[];
  simulation: Simulation;
}

export const AskClientSignalsDrawer: React.FC<AskClientSignalsDrawerProps> = ({
  isOpen,
  onClose,
  selectedClient,
  selectedOpportunity,
  clients,
  opportunities,
  notes,
  events,
  simulation,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availability, setAvailability] = useState<'checking' | 'configured' | 'unavailable' | 'offline'>('checking');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const panelRef = useRef<HTMLDivElement>(null);
  const checkAvailability = async () => {
    setAvailability('checking');
    try {
      const res = await fetch('/api/health');
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const data = await res.json();
      setAvailability(data.hasGeminiKey ? 'configured' : 'unavailable');
    } catch { setAvailability('offline'); }
  };
  useEffect(() => { if (isOpen) void checkAvailability(); }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>('[title="Close assistant"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const elements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') || []);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;



  // Contextual suggested prompt questions
  const getSuggestedPrompts = () => [
    `Summarize ${selectedClient?.name || 'my portfolio'} and the documented client history.`,
    `Which market developments are relevant to ${selectedClient?.name || 'my clients'}, and what needs verification?`,
    'Compare Atlas and Apex using the current ranks and banker decision status.',
    'If 90% of Atlas’s unpaid EUR balance were hedged, what would remain exposed? Do not change records.',
    `Help prepare the next conversation and internal follow-up for ${selectedClient?.name || 'my portfolio'}.`,
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading || availability !== 'configured') return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      // Build authorized context payload
      const payload = {
        message: userMsg.text,
        history: messages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        selectedClientId: selectedClient?.id,
        context: {
          simulation,
          client: selectedClient,
          opportunity: selectedOpportunity,
          portfolioClients: clients.map((c) => ({
            id: c.id,
            name: c.name,
            sector: c.sector,
            revenue: c.annualRevenue,
          })),
          opportunities: opportunities.map((o) => ({
            id: o.id,
            clientId: o.clientId,
            status: o.status,
            priorityRank: o.priorityRank,
            priorityTier: o.priorityTier,
            whyThisClient: o.whyThisClient,
            whyNow: o.whyNow,
            financialImpact: o.financialImpactHypothesis,
            factors: o.factors,
            suppressionReason: o.suppressionAuditReason,
          })),
          authorizedNotes: notes.filter((n) => !n.isSuperseded).map((n) => ({
            id: n.id,
            clientId: n.clientId,
            date: n.date,
            title: n.title,
            classification: n.classification,
            excerpt: n.excerpt,
            fullText: n.fullText,
          })),
          marketEvents: events.map((e) => ({
            id: e.id,
            title: e.title,
            sourceType: e.sourceType,
            summary: e.summary,
            marketShockMetric: e.marketShockMetric,
          })),
        },
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('The chat endpoint did not return JSON.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request unavailable.');

      if (data.success && data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: data.response,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: data.error || 'AI Assistant is currently offline. Unable to complete live inference.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: err.message === 'The chat endpoint did not return JSON.' ? err.message : 'AI response unavailable or withheld by workflow checks. Your records and decisions are unchanged. Continue using client evidence and the action plan.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => setMessages([]);

  return (
    <>
    <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Ask AI" className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Ask Client Signals
              </h2>
              <span className="text-[10px] font-mono font-medium bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                AI Assistant
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contextual Intelligence &amp; Prioritization Reasoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Reset conversation history"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Context Bar */}
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 truncate">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-900 truncate">
            {selectedClient ? selectedClient.name : 'Portfolio Overview'}
          </span>
          {selectedOpportunity && (
            <span className="text-slate-400 font-mono text-[11px]">
              ({selectedOpportunity.priorityTier})
            </span>
          )}
        </div>
        <span className="text-[10px] text-emerald-900 font-medium bg-emerald-100 px-2 py-0.5 rounded shrink-0">
          Authorized Sources Only
        </span>
      </div>

      <div className="p-4 border-b border-slate-200 text-sm" role="status">
        {availability === 'checking' ? 'Checking AI availability…' : availability === 'configured' ? 'Gemini key configured · Responses may still fail. Workflow rules remain authoritative.' : availability === 'unavailable' ? 'AI unavailable: Gemini API key is not configured. No AI answer will be generated. You can review evidence, prepare questions and save internal follow-ups without AI.' : 'AI unavailable: the server could not be reached. Your deterministic workflow remains available.'}
        <button onClick={checkAvailability} className="block mt-2 text-emerald-900 font-semibold underline">Check availability again</button>
      </div>
      {/* Message History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
        {messages.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600"><p className="font-semibold text-slate-900">Portfolio copilot</p><p className="mt-2">Use this assistant for client history, market relevance, comparisons, exposure hypotheticals and conversation preparation when Gemini is available.</p><p className="mt-2">Northstar requires verification. Harbor’s canceled-expansion thesis stays suppressed. AI cannot send messages, record decisions or execute transactions.</p></div>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                msg.isError ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-emerald-400'
              }`}>
                {msg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-900 text-white rounded-tr-none shadow-xs'
                  : msg.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap space-y-1">
                {msg.text.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>
                    {paragraph.split('**').map((chunk, cIdx) =>
                      cIdx % 2 === 1 ? (
                        <strong key={cIdx} className="font-semibold">
                          {chunk}
                        </strong>
                      ) : (
                        chunk
                      )
                    )}
                  </p>
                ))}
              </div>
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-tl-none shadow-xs flex items-center gap-2 text-slate-500 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
              <span>Analyzing authorized CRM records &amp; market context...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 bg-white border-t border-slate-200 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
          Suggested Questions:
        </span>
        <div className="flex flex-col gap-1.5">
          {getSuggestedPrompts().map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading || availability !== 'configured'}
              className="text-left p-1.5 rounded bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px] cursor-pointer disabled:opacity-50"
            >
              <CornerDownRight className="w-3 h-3 text-emerald-700 shrink-0" />
              <span className="truncate">{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            aria-label="Question for AI"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about prioritization, CRM notes, or market developments..."
            disabled={isLoading || availability !== 'configured'}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading || availability !== 'configured'}
            className="px-3.5 py-2 rounded bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Client Signals domain-restricted assistant · Answers strictly grounded in authorized fixtures.
        </p>
      </div>

    </div>
    </>
  );
};
