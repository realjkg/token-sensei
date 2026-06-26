// Contextual preset questions (spec §7.3) — a 2×2 grid that seeds the agent
// with the four highest-value executive questions. Disabled while a turn is in
// flight so the user can't queue overlapping requests.

export const QUICK_PROMPTS = [
  'Which initiatives are at risk?',
  "What's driving cloud cost?",
  'How much can we save?',
  'Summarize the portfolio',
] as const;

interface ChatQuickPromptsProps {
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

export function ChatQuickPrompts({ disabled, onSelect }: ChatQuickPromptsProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 border-b border-edge p-3">
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-md border border-edge bg-slab px-2 py-1.5 text-left text-[11px] text-sub transition-colors hover:border-purple hover:text-txt disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

