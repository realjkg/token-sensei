// Chat input — a growable textarea + send button (spec §7.3). Enter submits;
// Shift+Enter inserts a newline. Disabled while a turn is in flight. Owns only
// the draft string; the parent owns the conversation and the send action.

import { useState, type KeyboardEvent } from 'react';

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-edge p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        aria-label="Ask about your initiative portfolio"
        placeholder="Ask about initiative risk, cost, or savings…"
        className="max-h-28 flex-1 resize-none rounded-md border border-edge bg-slab px-3 py-2 font-mono text-xs text-txt outline-none placeholder:text-dim focus:border-purple"
      />
      <button
        type="submit"
        disabled={disabled || !draft.trim()}
        className="rounded-md border border-purple bg-purple/20 px-3 py-2 font-mono text-xs font-bold text-purple transition-colors hover:bg-purple/30 disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}

