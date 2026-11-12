import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Sparkles,
  Building2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import type {
  ClientProfile,
  SignalOpportunity,
  CRMNote,
  MarketDevelopment,
} from "../types";
import type { Simulation } from "../domain/workflow";
import type { CopilotReply, AnswerKind } from "../copilotTypes";

interface Props {
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
interface Message {
  id: string;
  role: "user" | "assistant";
  text?: string;
  reply?: CopilotReply;
  error?: boolean;
}
interface Availability {
  configured: boolean;
  accessConfigured: boolean;
  authenticated: boolean;
  guestDemoEnabled?: boolean;
  guest?: boolean;
  reason?: string | null;
  model?: string;
}
const requestHeaders = {
  "Content-Type": "application/json",
  "X-Client-Signals": "copilot",
};
const kindLabels: Record<AnswerKind, string> = {
  general_explanation: "Economic explanation",
  synthetic_evidence: "Synthetic CRM evidence",
  external_information: "External information · Web-sourced",
  analysis: "Analytical inference",
  hypothetical: "Hypothetical scenario",
  workflow_rule: "Deterministic workflow safeguard · Not AI advice",
};

export function AskClientSignalsDrawer({
  isOpen,
  onClose,
  selectedClient,
  opportunities,
  notes,
  events,
  simulation,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const ready = Boolean(
    availability?.configured &&
      availability.accessConfigured &&
      availability.authenticated,
  );
  const readJson = async (response: Response) => {
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error("The chat endpoint did not return JSON.");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Copilot request unavailable.");
    return data;
  };
  const checkAvailability = async () => {
    setChecking(true);
    setSessionError("");
    try {
      const status = await readJson(await fetch("/api/copilot/session"));
      if (status.configured && status.accessConfigured && status.guestDemoEnabled && !status.authenticated) {
        try {
          const guest = await readJson(await fetch("/api/copilot/guest", {
            method: "POST",
            headers: requestHeaders,
            body: "{}",
          }));
          setAvailability(guest);
        } catch (e: any) {
          setAvailability(status);
          setSessionError("Guest demo unavailable: " + (e.message || "Access limit reached.") + " Private access code remains available.");
        }
      } else {
        setAvailability(status);
      }
    } catch {
      setAvailability(null);
      setSessionError(
        "Copilot server unavailable. Evidence and banker decisions remain usable.",
      );
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    if (isOpen) void checkAvailability();
  }, [isOpen]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Close assistant"]')
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]",
        ) || [],
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError("");
    setBusy(true);
    try {
      const data = await readJson(
        await fetch("/api/copilot/session", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ code }),
        }),
      );
      setAvailability(data);
      setMessages([]);
    } catch (e: any) {
      setSessionError(e.message);
    } finally {
      setCode("");
      setBusy(false);
    }
  };
  const send = async (prompt?: string, forceResearch = false) => {
    const text = (prompt || input).trim();
    if (!text || busy || !ready) return;
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          message: text,
          research: research || forceResearch,
          selectedClientId: selectedClient?.id,
          context: {
            simulation,
            opportunities: opportunities.map((o) => ({
              id: o.id,
              status: o.status,
            })),
          },
        }),
      });
      if (response.status === 401)
        setAvailability((a) => (a ? { ...a, authenticated: false } : a));
      let data: any;
      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        if (!response.body) throw new Error("Research response stream unavailable.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError: string | null = null;
        const handle = (line: string) => {
          if (!line.trim()) return;
          const item = JSON.parse(line);
          if (item.type === "result") data = item.data;
          if (item.type === "error") streamError = item.error || "Research unavailable.";
        };
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) handle(line);
        }
        buffer += decoder.decode();
        if (buffer.trim()) handle(buffer);
        if (streamError) throw new Error(streamError);
        if (!data)
          throw new Error("Research stream ended without an answer. Please avoid retrying repeatedly.");
      } else if (response.headers.get("content-type")?.includes("application/json")) {
        data = await readJson(response);
      } else {
        throw new Error(`Research gateway returned HTTP ${response.status} instead of an AI response. It may have timed out or restarted.`);
      }
      if (
        !data.success ||
        data.provider !== "openai" ||
        !data.reply?.responseId
      )
        throw new Error("No verified model response was returned.");
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", reply: data.reply },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e.message || "AI unavailable. Portfolio data is unchanged.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  const clear = async () => {
    if (busy) return;
    if (!ready) {
      setMessages([]);
      return;
    }
    try {
      await readJson(
        await fetch("/api/copilot/conversation", {
          method: "POST",
          headers: requestHeaders,
          body: "{}",
        }),
      );
      setMessages([]);
    } catch (e: any) {
      setSessionError(e.message);
    }
  };
  const prompts = [
    {
      label: "Explain my priorities",
      text: "Why does Atlas rank ahead of Apex in the baseline, and what changes under the current scenario and banker decisions? Cite the synthetic CRM evidence.",
    },
    {
      label: "Research market developments",
      text: "Research the latest Federal Reserve development using official sources. Give publication/effective dates where stated, distinguish retrieval time, and explain possible relevance to our synthetic exposures without changing rankings.",
      research: true,
    },
    {
      label: "Challenge an assumption",
      text: "Challenge the assumption that a 25 bps Fed move means an identical borrowing-cost increase for Apex. What would we need to verify?",
    },
    {
      label: "Prepare a client conversation",
      text: `Help prepare a conversation or internal verification step for ${selectedClient?.name || "my clients"}. Give an objective and discovery questions while respecting current workflow safeguards.`,
    },
  ];
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Ask AI"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[600px] max-w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col"
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold">Ask Client Signals</h2>
              <p className="text-xs text-slate-300 mt-1">
                OpenAI copilot · Economics, portfolio &amp; web research
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clear}
              disabled={busy}
              aria-label="New conversation"
              title="New conversation (keeps session budget)"
              className="p-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close assistant"
              className="p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0" />
          <span>{selectedClient?.name || "Portfolio overview"}</span>
          <span className="ml-auto text-emerald-800">
            CRM &amp; rankings are read-only
          </span>
        </div>
        <div className="p-4 border-b border-slate-200 text-sm" role="status">
          {checking
            ? "Checking OpenAI availability…"
            : !availability?.configured
              ? `AI unavailable: ${availability?.reason || "OpenAI API key is not configured."} No model response can be generated.`
              : !availability.accessConfigured
                ? "AI unavailable: server access control is not configured. An administrator must set a private access code."
                : !availability.authenticated
                  ? "OpenAI is configured. Unlock this private demo to send budgeted requests. Model access is not yet verified."
                  : availability.guest
                    ? "Temporary judge demo session · At most four questions per session. Live responses remain subject to shared usage limits."
                    : "Private session unlocked · Requests use server-side budgets. Live answer provenance is shown per response."}
          {!ready && (
            <button
              onClick={checkAvailability}
              disabled={checking || busy}
              className="block mt-2 text-emerald-900 font-semibold underline"
            >
              Check availability again
            </button>
          )}
          {sessionError && (
            <p role="alert" className="mt-2 text-rose-800">
              {sessionError}
            </p>
          )}
          {availability?.configured &&
            availability.accessConfigured &&
            !availability.authenticated && (
              <form onSubmit={unlock} className="mt-3 flex gap-2">
                <input
                  aria-label="Demo access code"
                  type="password"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={200}
                  placeholder="Private demo access code"
                  className="min-w-0 flex-1 rounded border border-slate-300 p-2"
                />
                <button
                  disabled={busy || !code.trim()}
                  className="rounded bg-emerald-800 text-white px-3 py-2 font-semibold"
                >
                  Unlock copilot
                </button>
              </form>
            )}
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50"
          aria-label="Conversation"
        >
          {messages.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 leading-relaxed">
              <h3 className="font-bold text-slate-900">
                Ask a question, then keep exploring
              </h3>
              <p className="mt-2">
                Ask about economics, finance or your synthetic portfolio.
                Challenge an assumption, compare clients, or follow up on an
                earlier answer.
              </p>
              <p className="mt-2">
                External research is evidence to investigate—not an approved
                recommendation. General news is not an authoritative
                market-price feed.
              </p>
              <p className="mt-2">
                Northstar remains VERIFY; Harbor’s canceled expansion remains
                SUPPRESS. No answer changes your records or decisions.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-xl p-4 text-sm leading-relaxed ${message.role === "user" ? "bg-emerald-900 text-white ml-8" : message.error ? "bg-rose-50 border border-rose-200 text-rose-900" : "bg-white border border-slate-200"}`}
              aria-label={
                message.role === "user"
                  ? "Your question"
                  : message.error
                    ? "Request unavailable"
                    : "Copilot answer"
              }
            >
              {message.text && (
                <p className="whitespace-pre-wrap">{message.text}</p>
              )}
              {message.reply && (
                <>
                  <div className="text-xs text-slate-500 mb-4">
                    OpenAI response · {message.reply.model}
                    <p className="mt-1">
                      Generated{" "}
                      {new Date(message.reply.generatedAt).toLocaleString()} ·{" "}
                      {message.reply.searchedThisTurn
                        ? "Web search completed this turn"
                        : "No new web search this turn"}
                    </p>
                  </div>
                  {message.reply.blocks.map((block, index) => (
                    <section key={index} className="mb-4 last:mb-0">
                      <h3
                        className={`text-xs font-bold uppercase tracking-wide mb-2 ${block.kind === "external_information" ? "text-blue-800" : block.kind === "workflow_rule" ? "text-amber-900" : "text-emerald-900"}`}
                      >
                        {kindLabels[block.kind]}
                      </h3>
                      <p className="whitespace-pre-wrap">{block.text}</p>
                      {block.syntheticSourceIds.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          Synthetic sources:{" "}
                          {block.syntheticSourceIds
                            .map((id) => {
                              const source =
                                notes.find((n) => n.id === id) ||
                                events.find((e) => e.id === id);
                              return `${id}${source ? " · " + ("date" in source ? source.date : source.publishedAt) : ""}`;
                            })
                            .join("; ")}
                        </p>
                      )}
                      {block.webSourceUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {block.webSourceUrls.map((url) => {
                            const source = message.reply!.sources.find(
                              (s) => s.url === url,
                            );
                            return source ? (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-800 underline inline-flex items-center gap-1"
                              >
                                {source.title}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : null;
                          })}
                        </div>
                      )}
                    </section>
                  ))}
                  {message.reply.sources.length > 0 && (
                    <section
                      aria-label="Web sources"
                      className="mt-4 pt-3 border-t border-slate-200 space-y-3"
                    >
                      <h3 className="text-xs font-semibold">
                        External source dates &amp; retrieval
                      </h3>
                      {message.reply.sources.map((source) => (
                        <div
                          key={source.url}
                          className="rounded-lg bg-blue-50 p-3 text-xs"
                        >
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-900 underline break-words"
                          >
                            {source.title}
                          </a>
                          <p className="mt-1">
                            Publication date:{" "}
                            {source.publishedAt ||
                              "Not supplied in search metadata; see source"}
                          </p>
                          <p>
                            Retrieved:{" "}
                            {new Date(source.retrievedAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </section>
                  )}
                  {message.reply.workflow.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
                      Portfolio decisions unchanged:{" "}
                      {message.reply.workflow
                        .map((w) => `${w.name}: ${w.action} (${w.status})`)
                        .join(" · ")}
                    </div>
                  )}
                  <details className="mt-3 text-xs text-slate-500">
                    <summary className="cursor-pointer">
                      Response provenance
                    </summary>
                    <p className="mt-1 break-all">
                      Responses API ID: {message.reply.responseId}. This
                      identifies the completed API response; it is not proof
                      that every claim is correct.
                    </p>
                  </details>
                </>
              )}
            </article>
          ))}
          {busy && (
            <p role="status" className="text-sm text-slate-600">
              {ready
                ? "Generating an answer; current questions may need web research…"
                : "Unlocking private session…"}
            </p>
          )}
          <div ref={end} />
        </div>
        <div className="p-3 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => send(prompt.text, prompt.research)}
                disabled={!ready || busy}
                className="text-left rounded-lg border border-slate-200 p-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="p-3 border-t border-slate-200 space-y-2"
        >
          <label className="flex gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={research}
              onChange={(e) => setResearch(e.target.checked)}
              disabled={!ready || busy}
            />
            Require fresh web research (current questions also trigger this
            automatically)
          </label>
          <div className="flex gap-2">
            <textarea
              aria-label="Question for AI"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
              rows={2}
              placeholder="Ask about economics, markets or your clients…"
              disabled={!ready || busy}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="submit"
              disabled={!ready || busy || !input.trim()}
              className="rounded-lg bg-emerald-800 px-3 text-white text-sm font-semibold flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Bounded server conversation · New conversation clears context, not
            usage limits · Nothing sent to a client
          </p>
        </form>
      </div>
    </>
  );
}
