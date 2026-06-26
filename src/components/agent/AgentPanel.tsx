// TODO(wave3b): superseded by ChatPanel + the server-proxied AIClient seam
// (src/ai, pages/api/v1/ai/chat.ts). Kept for backward compat during the UI
// transition; remove once ChatPanel fully replaces this surface.
//
// Right panel — AI agent chat (spec §3.5). Quick prompts, scrollable message
// history (user = body font, agent = mono with a left accent, system = green
// mono), and a mono input. The responder is the data-grounded mock client by
// default; a live Claude client drops in when VITE_ANTHROPIC_API_KEY is set.

import { useEffect, useRef, useState } from 'react';
import { useStore, type ChatMessage } from '@/store/useStore';

const QUICK_PROMPTS = [
  'Why is my spend spiking?',
  'Which model should I switch to?',
  "What's my riskiest workload?",
  "Show today's budget status",
];

export function AgentPanel() {
  const messages = useStore((s) => s.messages);
  const agentThinking = useStore((s) => s.agentThinking);
  const agentMode = useStore((s) => s.agentMode);
  const sendMessage = useStore((s) => s.sendMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, agentThinking]);

  const submit = (text: string) => {
    if (!text.trim() || agentThinking) return;
    void sendMessage(text);
    setInput('');
  };

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-edge bg-deep">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-bold text-void" style={{ background: 'var(--purple)' }}>
            R
          </span>
          <span className="text-sm font-semibold text-txt">Ratio Agent</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{agentMode}</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-b border-edge p-3">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={agentThinking}
            onClick={() => submit(prompt)}
            className="rounded-md border border-edge bg-slab px-2 py-1.5 text-left text-[11px] text-sub transition-colors hover:border-purple hover:text-txt disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {agentThinking && (
          <div className="font-mono text-xs text-purple">Ratio is computing…</div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-edge p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about cost, budget, forecast…"
          className="flex-1 rounded-md border border-edge bg-slab px-3 py-2 font-mono text-xs text-txt outline-none placeholder:text-dim focus:border-purple"
        />
        <button
          type="submit"
          disabled={agentThinking || !input.trim()}
          className="rounded-md border border-purple bg-purple/20 px-3 py-2 font-mono text-xs font-bold text-purple transition-colors hover:bg-purple/30 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ml-6 rounded-lg rounded-br-sm bg-raised px-3 py-2 text-sm text-txt">
        {message.text}
      </div>
    );
  }
  if (message.role === 'system') {
    return (
      <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-value">
        {message.text}
      </div>
    );
  }
  return (
    <div className="whitespace-pre-wrap border-l-2 border-purple pl-3 font-mono text-[11px] leading-relaxed text-sub">
      {message.text}
    </div>
  );
}

