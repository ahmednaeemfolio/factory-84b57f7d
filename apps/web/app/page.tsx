'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppNav from '@/components/AppNav';
import FeedFilters, { buildFeedQuery, emptyFeedFilters, type FeedFilterValues, type FilterOption } from '@/components/FeedFilters';
import KudosCard, { type KudosCardData } from '@/components/KudosCard';
import KudosComposer, { type ComposerRecipient } from '@/components/KudosComposer';
import { apiGet } from '@/lib/api';
import { getSessionUser } from '@/lib/session';

type FeedRecipient = { id: string; displayName: string; team?: { id: string; name: string } };
type FeedRow = {
  id: string;
  message: string;
  companyValue: string;
  createdAt: string;
  sender: { displayName: string };
  recipients: Array<{ recipient: FeedRecipient }>;
  reactions?: unknown[];
  comments?: unknown[];
};
type FeedPage = { items: FeedRow[]; nextCursor: string | null };

function asCard(row: FeedRow): KudosCardData {
  return {
    id: row.id,
    giver: row.sender?.displayName ?? 'Colleague',
    recipients: (row.recipients ?? []).map(({ recipient }) => recipient?.displayName ?? 'Colleague'),
    companyValue: row.companyValue,
    message: row.message,
    createdAt: row.createdAt,
    reactionCount: Array.isArray(row.reactions) ? row.reactions.length : 0,
    commentCount: Array.isArray(row.comments) ? row.comments.length : 0,
  };
}

export default function HomePage() {
  const [filters, setFilters] = useState<FeedFilterValues>(emptyFeedFilters);
  const [items, setItems] = useState<FeedRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [teams, setTeams] = useState<FilterOption[]>([]);
  const [senderId, setSenderId] = useState('');
  const requestNumber = useRef(0);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    setSenderId(getSessionUser()?.id ?? '');
    void apiGet<Array<{ id: string; name: string }>>('/teams')
      .then((rows) => setTeams(rows.map(({ id, name }) => ({ id, label: name }))))
      .catch(() => setTeams([]));
  }, []);

  const feedQuery = buildFeedQuery(filters);
  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestNumber.current;
    setLoading(true);
    setError('');
    setMoreError('');
    setItems([]);
    setNextCursor(null);
    try {
      const page = await apiGet<FeedPage>(`/kudos${feedQuery}`);
      if (requestId !== requestNumber.current) return;
      setItems(page.items ?? []);
      setNextCursor(page.nextCursor ?? null);
    } catch {
      if (requestId === requestNumber.current) setError("The feed couldn't be loaded. Try again.");
    } finally {
      if (requestId === requestNumber.current) setLoading(false);
    }
  }, [feedQuery]);

  useEffect(() => { void loadFirstPage(); }, [loadFirstPage, refreshVersion]);

  const loadNextPage = async () => {
    if (!nextCursor || loadMore) return;
    setLoadMore(true);
    setMoreError('');
    try {
      const page = await apiGet<FeedPage>(`/kudos${buildFeedQuery(filters, nextCursor)}`);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(page.items ?? []).filter((item) => !seen.has(item.id) && seen.add(item.id))];
      });
      setNextCursor(page.nextCursor ?? null);
    } catch {
      setMoreError("More kudos couldn't be loaded. Try again.");
    } finally {
      setLoadMore(false);
    }
  };

  const filterValues = useMemo(() => [...new Set([...items.map((item) => item.companyValue), filters.companyValue].filter(Boolean))], [items, filters.companyValue]);
  const recipients = useMemo(() => {
    const all = new Map<string, ComposerRecipient>();
    items.forEach((item) => item.recipients?.forEach(({ recipient }) => {
      if (recipient?.id && recipient.displayName) all.set(recipient.id, { id: recipient.id, displayName: recipient.displayName });
    }));
    return [...all.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [items]);
  const recipientFilters = useMemo(() => {
    const all = new Map(recipients.map(({ id, displayName }) => [id, { id, label: displayName }]));
    if (filters.recipientId && !all.has(filters.recipientId)) all.set(filters.recipientId, { id: filters.recipientId, label: filters.recipientId });
    return [...all.values()];
  }, [recipients, filters.recipientId]);

  const clearFilters = () => setFilters(emptyFeedFilters);
  const updateFilters = (next: FeedFilterValues) => setFilters(next);

  return (
    <>
      <AppNav />
      <main className="home-main">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Recognition from across your team</p>
            <h1 id="page-title">Kudos</h1>
            <p className="heading-helper">Newest recognition appears first.</p>
          </div>
          <a className="primary-button" href="#send-kudos">＋ <span>Send kudos</span></a>
        </section>
        <div className="home-columns">
          <section className="feed-column" aria-label="Kudos feed and filters">
            <FeedFilters filters={filters} teams={teams} values={filterValues} recipients={recipientFilters} onChange={updateFilters} onClear={clearFilters} />
            <section className="feed-section" aria-labelledby="feed-title">
              <div className="feed-topline"><h2 id="feed-title">Latest kudos</h2><span className="feed-order">Newest first</span></div>
              {loading && (
                <>
                  <p className="loading-message" role="status">Loading kudos…</p>
                  <ol className="feed-list" aria-label="Kudos feed" aria-busy="true">
                    {[0, 1, 2].map((index) => <li key={index}><KudosCard state="loading" /></li>)}
                  </ol>
                </>
              )}
              {!loading && error && <div className="feed-error" role="alert"><p>{error}</p><button type="button" onClick={() => void loadFirstPage()}>Retry</button></div>}
              {!loading && !error && items.length === 0 && (
                <div className="empty-feed" role="status">
                  <p>{filters.recipientTeamId || filters.companyValue || filters.recipientId ? 'No kudos match these filters.' : 'No kudos yet.'}</p>
                  {(filters.recipientTeamId || filters.companyValue || filters.recipientId) && <button type="button" onClick={clearFilters}>Clear filters</button>}
                </div>
              )}
              {!loading && !error && items.length > 0 && (
                <ol className="feed-list" aria-label="Kudos feed" aria-live="polite">
                  {items.map((item) => <li key={item.id}><KudosCard kudos={asCard(item)} /></li>)}
                </ol>
              )}
              {!loading && !error && nextCursor && (
                <div className="load-more-wrap">
                  {moreError && <p className="more-error" role="alert">{moreError}</p>}
                  <button className="load-more" type="button" onClick={() => void loadNextPage()} disabled={loadMore}>
                    {loadMore ? 'Loading…' : moreError ? 'Retry loading more' : 'Load more'}
                  </button>
                </div>
              )}
              {!loading && !error && items.length > 0 && !nextCursor && <p className="end-of-feed" role="status">You’re all caught up.</p>}
            </section>
          </section>
          <div id="send-kudos" className="composer-column">
            <KudosComposer senderId={senderId} recipients={recipients} supportedValues={filterValues} onSent={() => setRefreshVersion((version) => version + 1)} />
            {filterValues.length === 0 && <p className="options-note">Supported company values appear here when available from kudos data.</p>}
          </div>
        </div>
      </main>
      <style jsx>{`
        .home-main { width:min(1160px,calc(100% - 64px)); margin:0 auto; padding:40px 0 64px; }
        .page-heading { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-bottom:26px; }
        .eyebrow { margin:0 0 4px; color:var(--color-quiet-ink); font-size:13px; font-weight:550; }
        h1 { margin:0; font-size:30px; line-height:38px; font-weight:680; letter-spacing:-.5px; }
        .heading-helper { margin:5px 0 0; color:var(--color-quiet-ink); font-size:14px; }
        .primary-button { min-height:44px; display:inline-flex; align-items:center; gap:8px; padding:0 16px; border:1px solid var(--color-brand); border-radius:9px; background:var(--color-brand); color:white; font-size:14px; font-weight:620; }
        .home-columns { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:24px; align-items:start; }
        .feed-section { width:min(100%,790px); margin:30px auto 0; }
        .feed-topline { display:flex; justify-content:space-between; align-items:center; margin-bottom:13px; }
        .feed-topline h2 { margin:0; font-size:18px; line-height:26px; }
        .feed-order { color:var(--color-quiet-ink); font-size:12px; }
        .feed-list { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
        .feed-list li { min-width:0; }
        .loading-message { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
        .feed-error,.empty-feed { padding:24px; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); text-align:center; }
        .feed-error { color:var(--color-danger); }
        .feed-error p,.empty-feed p { margin:0 0 10px; }
        .feed-error button,.empty-feed button { padding:7px 12px; border:1px solid var(--color-line); border-radius:8px; background:white; color:var(--color-brand); cursor:pointer; }
        .load-more-wrap { display:flex; flex-direction:column; align-items:center; gap:8px; padding-top:22px; }
        .load-more { min-height:40px; padding:0 16px; border:1px solid var(--color-line); border-radius:8px; background:white; cursor:pointer; }
        .load-more:disabled { cursor:wait; opacity:.7; }
        .more-error { margin:0; color:var(--color-danger); font-size:13px; }
        .end-of-feed,.options-note { color:var(--color-quiet-ink); font-size:13px; }
        .end-of-feed { text-align:center; padding:10px; }
        .composer-column { position:sticky; top:20px; }
        .options-note { margin:8px 2px; }
        @media(max-width:950px) { .home-columns { grid-template-columns:minmax(0,1fr); } .composer-column { position:static; grid-row:1; } .home-main { width:min(790px,calc(100% - 40px)); } }
        @media(max-width:767px) { .home-main { width:calc(100% - 36px); padding:28px 0 48px; } .page-heading { align-items:flex-start; gap:12px; } h1 { font-size:27px; line-height:34px; } .primary-button { min-height:40px; padding:0 11px; font-size:13px; } .feed-section { margin-top:24px; } }
      `}</style>
    </>
  );
}
