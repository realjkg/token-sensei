// One chat bubble. Role-driven styling (spec §7.3): user = right-aligned body
// font, assistant = left-accented mono, system = full-width mono (green welcome
// / red error). Uses the shared dark surface + purple AI tokens so the panel
// renders identically on both the executive (light) and technical (dark) surfaces.

import type { AIChatMessage } from '@/store/useStore';

export function ChatMessage({ message }: { message: AIChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ml-6 self-end rounded-lg rounded-br-sm bg-raised px-3 py-2 text-sm text-txt">
        {message.content}
      </div>
    );
  }

  if (message.role === 'system') {
    const isError = message.content.startsWith('AI error');
    return (
      <div
        className={`whitespace-pre-wrap font-mono text-[11px] leading-relaxed ${
          isError ? 'text-cost' : 'text-value'
        }`}
        role={isError ? 'alert' : undefined}
      >
        {message.content}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap border-l-2 border-purple pl-3 font-mono text-[11px] leading-relaxed text-sub">
      {message.content}
    </div>
  );
}

