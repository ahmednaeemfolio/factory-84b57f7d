'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import CommentList, { type KudosComment } from '@/components/CommentList';
import ReactionControl, { type ReactionOption } from '@/components/ReactionControl';
import ReportDialog from '@/components/ReportDialog';
import { apiGet, apiRequest } from '@/lib/api';
import { getSessionUser } from '@/lib/session';

type Person = { id: string; displayName: string; team?: { name: string } | null };
type Reaction = { id?: string; userId: string; reactionType: string };
type SupportedReaction = string | { type?: string; reactionType?: string; label?: string };
type KudosDetail = {
  id: string;
  message: string;
  companyValue: string;
  createdAt: string;
  isHidden?: boolean;
  sender: Person;
  recipients: Array<{ recipient: Person } | Person>;
  reactions: Reaction[];
  comments: KudosComment[];
  myReaction?: string | null;
  supportedReactions?: SupportedReaction[];
  reactionTypes?: SupportedReaction[];
};

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error';

export function supportedReactionTypes(detail: KudosDetail): Array<{ type: string; label: string }> {
  const supplied = detail.supportedReactions ?? detail.reactionTypes ?? [];
  const values: SupportedReaction[] = supplied.length ? supplied : (detail.reactions ?? []).map((reaction) => reaction.reactionType);
  const seen = new Set<string>();
  return values.flatMap((entry) => {
    const type = typeof entry === 'string' ? entry : entry.type ?? entry.reactionType ?? '';
    if (!type || seen.has(type)) return [];
    seen.add(type);
    const label = typeof entry === 'string' ? entry : entry.label ?? entry.type ?? entry.reactionType ?? type;
    return [{ type, label }];
  });
}

export function toggleKudosReaction(kudosId: string, reactionType: string) {
  return apiRequest<{ myReaction?: string | null; reactionType?: string | null; reactions?: Reaction[] }>(
    `/kudos/${encodeURIComponent(kudosId)}/reaction`,
    { method: 'PUT', body: JSON.stringify({ reactionType }) },
  );
}

export function KudosDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<KudosDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState('You');

  const loadDetail = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const result = await apiGet<KudosDetail>(`/kudos/${encodeURIComponent(id)}`);
      if (!result || result.isHidden === true) {
        setDetail(null);
        setLoadState('unavailable');
        return;
      }
      setDetail(result);
      setLoadState('ready');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'We couldn’t load this kudos. Try again.';
      setDetail(null);
      if (/not found|unavailable|hidden/i.test(message)) {
        setLoadState('unavailable');
      } else {
        setLoadError(message);
        setLoadState('error');
      }
    }
  }, [id]);

  useEffect(() => {
    setCurrentUser(getSessionUser()?.displayName ?? 'You');
    void loadDetail();
  }, [loadDetail]);

  const reactionTypes = useMemo(() => detail ? supportedReactionTypes(detail) : [], [detail]);
  const reactionOptions: ReactionOption[] = reactionTypes.map(({ type, label }) => ({
    type,
    label,
    count: detail?.reactions.filter((reaction) => reaction.reactionType === type).length ?? 0,
    selected: detail?.myReaction === type,
  }));

  async function toggleReaction(reactionType: string) {
    if (!detail || pendingReaction) return;
    setPendingReaction(reactionType);
    setReactionError('');
    try {
      const result = await toggleKudosReaction(id, reactionType);
      const activeReaction = result.myReaction !== undefined ? result.myReaction : result.reactionType ?? null;
      setDetail((current) => current ? {
        ...current,
        myReaction: activeReaction,
        reactions: result.reactions ?? current.reactions,
      } : current);
    } catch (caught) {
      setReactionError(caught instanceof Error ? caught.message : 'Unable to update reaction. Try again.');
    } finally {
      setPendingReaction(null);
    }
  }

  const closeReport = useCallback(() => setReportOpen(false), []);
  const recipients = detail?.recipients.map((entry) => 'recipient' in entry ? entry.recipient : entry) ?? [];

  return (
    <>
      <AppNav />
      <main className="detail-main">
        <Link className="back-link" href="/">← <span>Back to feed</span></Link>
        <h1>Kudos details</h1>
        <p className="page-intro">A closer look at this recognition.</p>

        {loadState === 'loading' && (
          <div className="loading-state" aria-busy="true" aria-label="Loading kudos details">
            <p role="status">Loading kudos…</p>
            <div className="skeleton" />
            <div className="skeleton short" />
          </div>
        )}
        {loadState === 'error' && (
          <section className="state-card error-state" role="alert">
            <p><strong>We couldn’t load this kudos. Try again.</strong>{loadError ? ` ${loadError}` : ''}</p>
            <button type="button" onClick={() => void loadDetail()}>Retry</button>
          </section>
        )}
        {loadState === 'unavailable' && (
          <section className="state-card unavailable-state" role="status">
            <h2>This kudos isn’t available.</h2>
            <p>It may have been removed or hidden.</p>
            <Link href="/">Return to feed</Link>
          </section>
        )}
        {loadState === 'ready' && detail && (
          <>
            <article className="kudos-detail-card" aria-label={`Kudos from ${detail.sender.displayName}`}>
              <div className="card-topline">
                <span className="recognition-label">{detail.companyValue}</span>
                <time className="posted-time" dateTime={detail.createdAt}>{new Date(detail.createdAt).toLocaleString()}</time>
              </div>
              <div className="people-row" aria-label={`From ${detail.sender.displayName} to ${recipients.map((person) => person.displayName).join(', ')}`}>
                <div className="person">
                  <span className="person-avatar" aria-hidden="true">{detail.sender.displayName.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{detail.sender.displayName}</strong><small>{detail.sender.team?.name ?? 'Sender'}</small></span>
                </div>
                <span className="to-arrow" aria-hidden="true">→</span>
                <div className="person recipients">
                  {recipients.map((person) => (
                    <span className="recipient" key={person.id}>
                      <span className="person-avatar recipient-avatar" aria-hidden="true">{person.displayName.slice(0, 2).toUpperCase()}</span>
                      <span><strong>{person.displayName}</strong><small>{person.team?.name ?? 'Recipient'}</small></span>
                    </span>
                  ))}
                </div>
              </div>
              <p className="message">{detail.message}</p>
              <div className="card-bottom">
                <ReactionControl reactions={reactionOptions} onToggle={toggleReaction} pendingType={pendingReaction} error={reactionError} />
              </div>
            </article>
            <div className="report-block">
              <span className="report-note">You can report this kudos once. Duplicate reports aren’t accepted.</span>
              <button className="text-button" type="button" onClick={() => setReportOpen(true)}>⚑ <span>Report kudos</span></button>
            </div>
            <CommentList kudosId={id} comments={detail.comments ?? []} currentUserName={currentUser} />
            <ReportDialog kudosId={id} open={reportOpen} onClose={closeReport} />
          </>
        )}
      </main>
      <style jsx>{`
        .detail-main { width:min(760px,calc(100% - 48px)); margin:0 auto; padding:32px 0 64px; }
        .back-link { display:inline-flex; align-items:center; gap:8px; margin-bottom:16px; color:var(--color-quiet-ink); font-size:14px; font-weight:550; }
        .back-link:hover { color:var(--color-brand); }
        h1 { margin:0; font-size:26px; font-weight:650; line-height:34px; }
        .page-intro { margin:4px 0 24px; color:var(--color-quiet-ink); font-size:14px; }
        .kudos-detail-card { padding:24px 26px 19px; background:var(--color-surface); border:1px solid var(--color-line); border-radius:var(--radius-card); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        .card-topline { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; }
        .recognition-label { padding:5px 10px; border-radius:999px; background:var(--color-brand-soft); color:#173b37; font-size:12px; font-weight:600; }
        .posted-time { color:var(--color-quiet-ink); font-size:12px; }
        .people-row { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-bottom:20px; }
        .person,.recipient { display:flex; align-items:center; gap:9px; }
        .person-avatar { width:38px; height:38px; display:grid; place-items:center; flex:none; border-radius:50%; background:var(--color-brand-soft); color:#315d52; font-size:12px; font-weight:650; }
        .recipient-avatar { background:#f4e8dc; color:#86572f; }
        .person strong { display:block; font-size:14px; }
        .person small { display:block; color:var(--color-quiet-ink); font-size:12px; }
        .to-arrow { display:grid; place-items:center; width:27px; height:27px; border-radius:50%; background:var(--color-muted); color:var(--color-quiet-ink); }
        .recipients { flex-wrap:wrap; gap:12px; }
        .message { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:18px; line-height:1.65; }
        .card-bottom { margin-top:22px; padding-top:16px; border-top:1px solid var(--color-line); }
        .report-block { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:14px 2px 28px; }
        .report-note { color:var(--color-quiet-ink); font-size:12px; }
        .text-button { padding:5px 0; border:0; background:transparent; color:var(--color-quiet-ink); font-size:13px; font-weight:550; cursor:pointer; }
        .text-button:hover { color:var(--color-danger); }
        .text-button:focus-visible,button:focus-visible { outline:3px solid rgba(23,107,99,.32); outline-offset:3px; }
        .loading-state,.state-card { padding:22px; background:var(--color-surface); border:1px solid var(--color-line); border-radius:var(--radius-card); }
        .loading-state p { color:var(--color-quiet-ink); }
        .skeleton { height:18px; margin:16px 0; border-radius:6px; background:var(--color-muted); }
        .skeleton.short { width:64%; }
        .error-state { color:var(--color-danger); }
        .error-state p { margin:0 0 14px; }
        .error-state button,.unavailable-state a { padding:8px 12px; border:1px solid var(--color-line); border-radius:var(--radius-control); background:var(--color-surface); color:var(--color-brand); font-weight:600; cursor:pointer; }
        .unavailable-state h2 { margin:0 0 6px; font-size:20px; }
        .unavailable-state p { margin:0 0 14px; color:var(--color-quiet-ink); }
        @media(max-width:767px) { .detail-main { width:calc(100% - 36px); padding:24px 0 44px; } .kudos-detail-card { padding:19px 17px; } .message { font-size:17px; } .report-block { align-items:flex-start; flex-direction:column; gap:5px; } }
        @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; transition-duration:.01ms!important; } }
      `}</style>
    </>
  );
}

export default function KudosDetailPage() {
  const params = useParams<{ id: string }>();
  return <KudosDetailClient id={params.id} />;
}
