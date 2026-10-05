'use client';

export type ReactionOption = {
  /** Reaction identifier and user-facing label are supplied by app constants/API. */
  type: string;
  label: string;
  count?: number;
  selected?: boolean;
};

export type ReactionControlProps = {
  reactions: ReactionOption[];
  onToggle?: (reactionType: string) => void;
  pendingType?: string | null;
  error?: string | null;
  className?: string;
};

/** A data-driven accessible group of reaction toggles; no reaction taxonomy is defined here. */
export default function ReactionControl({
  reactions,
  onToggle,
  pendingType = null,
  error = null,
  className = '',
}: ReactionControlProps) {
  return (
    <div className={`reaction-control ${className}`}>
      <div className="reaction-list" role="group" aria-label="Reactions">
        {reactions.map((reaction) => {
          const selected = reaction.selected === true;
          const pending = pendingType === reaction.type;
          const count = reaction.count ?? 0;
          return (
            <button
              key={reaction.type}
              className={`reaction-button${selected ? ' selected' : ''}${pending ? ' pending' : ''}`}
              type="button"
              aria-label={`${reaction.label}, ${count} ${count === 1 ? 'reaction' : 'reactions'}${selected ? ', selected' : ''}${pending ? ', updating' : ''}`}
              aria-pressed={selected}
              aria-busy={pending || undefined}
              disabled={pending}
              onClick={() => onToggle?.(reaction.type)}
            >
              <span>{reaction.label}</span>
              <span className="count" aria-hidden="true">{count}</span>
            </button>
          );
        })}
      </div>
      {pendingType && <span className="pending-message" role="status">Updating reaction…</span>}
      {error && <span className="error-message" role="alert">{error}</span>}
      <style jsx>{`
        .reaction-control { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .reaction-list { display: inline-flex; flex-wrap: wrap; gap: 6px; }
        .reaction-button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 9px; border: 1px solid var(--color-line); border-radius: 999px; background: var(--color-surface); color: var(--color-quiet-ink); font-size: 13px; cursor: pointer; transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease; }
        .reaction-button:hover:not(:disabled) { border-color: var(--color-brand); color: var(--color-brand); }
        .reaction-button.selected { border-color: var(--color-brand); background: var(--color-brand-soft); color: #173b37; font-weight: 600; }
        .reaction-button.pending { opacity: .65; cursor: progress; }
        .reaction-button:disabled { cursor: wait; }
        .count { min-width: 1ch; font-variant-numeric: tabular-nums; }
        .pending-message { color: var(--color-quiet-ink); font-size: 12px; }
        .error-message { color: var(--color-danger); font-size: 12px; }
        @media (prefers-reduced-motion: reduce) { .reaction-button { transition: none; } }
      `}</style>
    </div>
  );
}
