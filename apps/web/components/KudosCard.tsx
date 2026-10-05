'use client';

import type { ReactNode } from 'react';
import ReactionControl, { type ReactionOption } from './ReactionControl';

export type KudosCardState = 'loading' | 'default' | 'reacted' | 'hidden' | 'error';

export type KudosCardData = {
  id?: string;
  giver: string;
  recipients: string[];
  /** Supplied by the API or app constants; this component adds no taxonomy labels. */
  companyValue: string;
  message: string;
  createdAt: string | Date;
  reactionCount: number;
  commentCount: number;
};

export type KudosCardProps = {
  kudos?: KudosCardData;
  state?: KudosCardState;
  reactions?: ReactionOption[];
  onReactionToggle?: (reactionType: string) => void;
  errorMessage?: string;
  className?: string;
  /** Optional supplementary content, e.g. a reported-preview context. */
  footer?: ReactNode;
};

function formatTimestamp(value: string | Date): { dateTime: string; label: string } {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { dateTime: String(value), label: String(value) };
  return { dateTime: date.toISOString(), label: date.toLocaleString() };
}

export default function KudosCard({
  kudos,
  state = 'default',
  reactions,
  onReactionToggle,
  errorMessage = 'This recognition could not be loaded.',
  className = '',
  footer,
}: KudosCardProps) {
  if (state === 'loading') {
    return (
      <article className={`kudos-card kudos-loading ${className}`} aria-busy="true" aria-label="Loading recognition">
        <span className="loading-line loading-short" />
        <span className="loading-line loading-long" />
        <span className="loading-line loading-medium" />
        <span className="sr-only" role="status">Loading recognition…</span>
        <style jsx>{`
          .kudos-card { padding: 24px; border: 1px solid var(--color-line); border-radius: var(--radius-card); background: var(--color-surface); }
          .loading-line { display: block; height: 14px; margin: 0 0 14px; border-radius: 6px; background: var(--color-muted); }
          .loading-short { width: 34%; }
          .loading-long { width: 94%; height: 20px; }
          .loading-medium { width: 62%; }
          .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
          @media (prefers-reduced-motion: no-preference) { .loading-line { animation: loading-pulse 1.4s ease-in-out infinite alternate; } @keyframes loading-pulse { to { opacity: .55; } } }
        `}</style>
      </article>
    );
  }

  if (state === 'hidden') {
    return (
      <article className={`kudos-card kudos-hidden ${className}`} aria-label="Recognition hidden">
        <p><span className="state-label" aria-hidden="true">Hidden</span> This recognition is no longer available.</p>
        <style jsx>{`
          .kudos-card { padding: 20px 24px; border: 1px solid var(--color-line); border-radius: var(--radius-card); background: var(--color-surface); }
          p { margin: 0; color: var(--color-quiet-ink); }
          .state-label { margin-right: 8px; padding: 3px 8px; border-radius: 999px; background: var(--color-muted); color: var(--color-ink); font-size: 12px; font-weight: 650; }
        `}</style>
      </article>
    );
  }

  if (state === 'error' || !kudos) {
    return (
      <article className={`kudos-card kudos-error ${className}`} role="alert">
        <p><strong>Unable to show recognition.</strong> {errorMessage}</p>
        <style jsx>{`
          .kudos-card { padding: 20px 24px; border: 1px solid #e6baba; border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-danger); }
          p { margin: 0; }
        `}</style>
      </article>
    );
  }

  const timestamp = formatTimestamp(kudos.createdAt);
  const recipientText = kudos.recipients.join(', ');

  return (
    <article className={`kudos-card ${className}`} aria-label={`Recognition from ${kudos.giver}`}>
      <header className="card-header">
        <div className="people">
          <span className="giver">{kudos.giver}</span>
          <span className="to-label">recognized</span>
          <span className="recipients">{recipientText}</span>
        </div>
        <time dateTime={timestamp.dateTime}>{timestamp.label}</time>
      </header>
      <div className="value">{kudos.companyValue}</div>
      <p className="message">{kudos.message}</p>
      {state === 'reacted' && <p className="reacted-status" role="status">You reacted to this recognition.</p>}
      <footer className="card-footer">
        <div className="interactions">
          {reactions && reactions.length > 0 && (
            <ReactionControl reactions={reactions} onToggle={onReactionToggle} />
          )}
          <span className="comment-count" aria-label={`${kudos.commentCount} comments`}>
            <span aria-hidden="true">▤</span> {kudos.commentCount} comments
          </span>
          {kudos.reactionCount > 0 && <span className="total-reactions">{kudos.reactionCount} reactions</span>}
        </div>
        {footer}
      </footer>
      <style jsx>{`
        .kudos-card { padding: 24px; border: 1px solid var(--color-line); border-radius: var(--radius-card); background: var(--color-surface); box-shadow: 0 1px 2px rgba(32,40,39,.06); }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; min-width: 0; }
        .giver, .recipients { color: var(--color-ink); font-weight: 620; }
        .to-label, time, .comment-count, .total-reactions { color: var(--color-quiet-ink); font-size: 14px; }
        time { flex: none; font-size: 12px; }
        .value { display: inline-flex; margin-top: 16px; padding: 4px 10px; border-left: 3px solid var(--color-accent); border-radius: 4px; background: var(--color-muted); color: var(--color-ink); font-size: 14px; font-weight: 550; }
        .message { margin: 16px 0 20px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
        .reacted-status { margin: -8px 0 14px; color: var(--color-brand); font-size: 13px; }
        .card-footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid var(--color-line); }
        .interactions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .comment-count { display: inline-flex; align-items: center; gap: 5px; }
        .comment-count span { font-size: 16px; }
        @media (max-width: 520px) { .kudos-card { padding: 18px; } .card-header { flex-direction: column; gap: 4px; } }
      `}</style>
    </article>
  );
}
