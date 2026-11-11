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
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello Gabriel. I am your Client Signals corporate intelligence assistant. I analyze authorized CRM notes, permitted internal research briefs, and market shocks to explain prioritization and suggest banker discovery strategies.\n\nYou can ask about ${selectedClient ? `**${selectedClient.name}**` : 'any client in your portfolio'} or compare priorities across your coverage book.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  // Contextual suggested prompt questions
  const getSuggestedPrompts = () => {
    if (selectedClient?.id === 'atlas-mfg') {
      return [
        'Why should I contact Atlas Manufacturing before Apex BioTech?',
        'What specific EUR exposure is documented in CRM note CRM-8812?',
        'What discovery questions should I ask Claire Vance about currency hedging?',
      ];
    }
    if (selectedClient?.id === 'harbor-components') {
      return [
        'Why was the Mexico tariff recommendation suppressed for Harbor?',
        'What documented board decision in CRM-7702 invalidated this thesis?',
      ];
    }
    if (selectedClient?.id === 'northstar-logistics') {
      return [
        'Why is Northstar in the Needs Verification queue instead of Top 3?',
        'What is conflicting between note CRM-6502 and note CRM-7210?',
      ];
    }
    if (selectedClient?.id === 'apex-biotech') {
      return [
        'Why is Apex ranked #2 behind Atlas?',
        'How does the 24 bps Treasury yield spike impact their $35M facility?',
      ];
    }
    return [
      'Why should I contact Atlas Manufacturing before Apex BioTech?',
      'Summarize all three actionable priorities in my portfolio.',
      'Explain why Harbor Components was suppressed.',
    ];
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

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

      const data = await res.json();

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
          text: 'AI Assistant is currently offline: connection to server failed. Please inspect authorized evidence directly in the main workbench.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. I am ready to answer questions about ${selectedClient ? `**${selectedClient.name}**` : 'your portfolio'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      
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

      {/* Message History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
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
              disabled={isLoading}
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
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about prioritization, CRM notes, or market developments..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
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
  );
};
