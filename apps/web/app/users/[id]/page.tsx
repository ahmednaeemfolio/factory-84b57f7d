'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { apiGet } from '@/lib/api';

type Person = { id: string; displayName: string };
type Team = { id?: string; name: string } | null;
type ProfileKudos = {
  id: string;
  message: string;
  companyValue: string;
  createdAt: string;
  isHidden?: boolean;
  sender: Person;
  recipients?: Array<{ recipient: Person } | Person>;
};

export type UserProfile = {
  id: string;
  displayName: string;
  team: Team;
  receivedTotal: number;
  sentTotal: number;
  receivedByValue: Array<{ companyValue: string; count: number }>;
  recentKudos: ProfileKudos[];
};

type LoadState = 'loading' | 'ready' | 'error';

export function loadUserProfile(id: string): Promise<UserProfile> {
  return apiGet<UserProfile>(`/users/${encodeURIComponent(id)}`);
}

/** Trust API totals and value labels, while defensively excluding hidden recent items. */
export function visibleRecentKudos(profile: UserProfile): ProfileKudos[] {
  return (profile.recentKudos ?? []).filter((kudos) => kudos.isHidden !== true).slice(0, 10);
}

export function UserProfileScreen({ id }: { id: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await loadUserProfile(id);
      setProfile(result);
      setState('ready');
    } catch {
      setProfile(null);
      setState('error');
    }
  }, [id, attempt]);

  useEffect(() => { void load(); }, [load]);
  const recent = profile ? visibleRecentKudos(profile) : [];

  return (
    <>
      <AppNav />
      <main className="profile-main">
        {state === 'loading' && (
          <section className="loading-card" aria-busy="true" aria-label="Loading profile">
            <p role="status">Loading profile…</p>
            <div className="skeleton summary-skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton short" />
          </section>
        )}
        {state === 'error' && (
          <section className="state-card error-state" role="alert">
            <h1>Colleague profile</h1>
            <p>This profile couldn’t be loaded. Try again.</p>
            <button type="button" onClick={() => setAttempt((current) => current + 1)}>Retry</button>
            <Link href="/">Return to feed</Link>
          </section>
        )}
        {state === 'ready' && profile && (
          <>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/leaderboard">People</Link><span aria-hidden="true">›</span><span aria-current="page">Colleague profile</span>
            </nav>
            <section className="profile-card" aria-labelledby="profile-name">
              <div className="person">
                <span className="avatar" aria-hidden="true">{initials(profile.displayName)}</span>
                <div>
                  <p className="eyebrow">Colleague profile</p>
                  <h1 id="profile-name">{profile.displayName}</h1>
                  <p className="team-label">Team: {profile.team?.name ?? '—'}</p>
                </div>
              </div>
              <div className="metrics" aria-label="All-time recognition totals">
                <div className="metric"><span>Received</span><strong>{profile.receivedTotal}</strong><small>kudos all time</small></div>
                <div className="metric"><span>Sent</span><strong>{profile.sentTotal}</strong><small>kudos all time</small></div>
              </div>
            </section>
            <div className="content-grid">
              <aside className="value-panel" aria-labelledby="values-title">
                <h2 id="values-title">Received by value</h2>
                <p className="panel-description">Received kudos by company value.</p>
                {profile.receivedByValue.length ? (
                  <ul className="value-list">
                    {profile.receivedByValue.map(({ companyValue, count }) => (
                      <li className="value-row" key={companyValue}>
                        <span>{companyValue}</span><strong aria-label={`${companyValue}: ${count} kudos`}>{count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted">No value counts yet.</p>}
                <p className="value-total">Total received <strong>{profile.receivedTotal} kudos</strong></p>
              </aside>
              <section className="recent-panel" aria-labelledby="recent-title">
                <header className="recent-header">
                  <div><h2 id="recent-title">Recent recognition</h2><p>Up to 10 most recent kudos received.</p></div>
                </header>
                {recent.length === 0 ? <p className="empty-state">No kudos received yet.</p> : (
                  <ul className="recent-list">
                    {recent.map((kudos) => (
                      <li key={kudos.id}>
                        <Link className="kudos-item" href={`/kudos/${encodeURIComponent(kudos.id)}`} aria-label={`Kudos from ${kudos.sender.displayName}: ${kudos.companyValue}`}>
                          <span className="context"><strong>{kudos.sender.displayName}</strong><span aria-hidden="true"> → </span><strong>{profile.displayName}</strong>
                            <time dateTime={kudos.createdAt}>{formatDate(kudos.createdAt)}</time>
                          </span>
                          <span className="value-label">{kudos.companyValue}</span>
                          <span className="message">{kudos.message}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <p className="page-note">Recent recognition shows up to 10 received kudos.</p>
          </>
        )}
      </main>
      <style jsx>{`
        .profile-main { width:min(1120px,calc(100% - 64px)); margin:0 auto; padding:34px 0 64px; }
        .breadcrumbs { display:flex; align-items:center; gap:9px; margin-bottom:20px; color:var(--color-quiet-ink); font-size:13px; }
        .breadcrumbs a:hover { color:var(--color-brand); }
        .breadcrumbs [aria-current] { color:var(--color-ink); font-weight:550; }
        .profile-card,.value-panel,.recent-panel,.loading-card,.state-card { background:var(--color-surface); border:1px solid var(--color-line); border-radius:var(--radius-card); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        .profile-card { min-height:205px; display:flex; align-items:center; justify-content:space-between; gap:30px; padding:30px 34px; }
        .person { display:flex; align-items:center; gap:20px; min-width:0; }
        .avatar { width:78px; height:78px; display:grid; flex:none; place-items:center; border:3px solid #f5f8f6; border-radius:50%; background:var(--color-brand-soft); color:#355b52; font-size:23px; font-weight:650; }
        .eyebrow { margin:0 0 4px; color:var(--color-quiet-ink); font-size:13px; font-weight:550; }
        h1 { margin:0; font-size:26px; font-weight:650; line-height:34px; }
        .team-label { margin:8px 0 0; color:var(--color-quiet-ink); font-size:14px; }
        .metrics { width:min(410px,48%); display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .metric { min-height:105px; display:flex; flex-direction:column; padding:15px 18px; border:1px solid #e6ebe8; border-radius:var(--radius-control); background:#f8faf9; color:var(--color-quiet-ink); font-size:13px; }
        .metric strong { margin-top:3px; color:var(--color-ink); font-size:30px; line-height:36px; }
        .metric small { font-size:12px; }
        .content-grid { display:grid; grid-template-columns:300px minmax(0,1fr); align-items:start; gap:24px; margin-top:26px; }
        .value-panel { padding:22px; }
        h2 { margin:0; font-size:19px; font-weight:620; line-height:27px; }
        .panel-description,.recent-header p { margin:5px 0 17px; color:var(--color-quiet-ink); font-size:13px; }
        .value-list { margin:0; padding:0; list-style:none; }
        .value-row { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:13px 0; border-top:1px solid #edf0ee; font-size:13px; }
        .value-row strong { min-width:30px; padding:2px 8px; border-radius:999px; background:var(--color-brand-soft); color:#173b37; text-align:center; font-size:12px; }
        .value-total { display:flex; justify-content:space-between; gap:8px; margin:10px 0 0; padding-top:14px; border-top:1px solid var(--color-line); color:var(--color-quiet-ink); font-size:12px; }
        .value-total strong { color:var(--color-ink); font-size:13px; }
        .muted,.empty-state { color:var(--color-quiet-ink); font-size:14px; }
        .recent-panel { overflow:hidden; }
        .recent-header { padding:20px 23px 4px; border-bottom:1px solid #e9edea; }
        .recent-header p { margin:3px 0 13px; }
        .recent-list { margin:0; padding:0 23px; list-style:none; }
        .recent-list li + li { border-top:1px solid #e9edea; }
        .kudos-item { display:flex; flex-direction:column; padding:19px 0; }
        .kudos-item:hover .message { color:var(--color-brand); }
        .context { display:flex; align-items:center; gap:4px; color:var(--color-quiet-ink); font-size:13px; }
        .context strong { color:var(--color-ink); font-weight:600; }
        time { margin-left:auto; color:var(--color-quiet-ink); font-size:12px; }
        .value-label { align-self:flex-start; margin:11px 0 0; padding:3px 9px; border:1px solid #e2ece7; border-radius:999px; background:var(--color-brand-soft); color:#37554e; font-size:12px; }
        .message { margin-top:9px; color:#303a37; font-size:14px; line-height:22px; white-space:pre-wrap; }
        .empty-state { margin:0; padding:22px 23px; }
        .page-note { margin:14px 2px 0; color:var(--color-quiet-ink); font-size:12px; }
        .loading-card,.state-card { padding:24px; }
        .loading-card p { margin:0 0 20px; color:var(--color-quiet-ink); }
        .skeleton { height:18px; width:100%; margin:14px 0; border-radius:6px; background:var(--color-muted); }
        .summary-skeleton { height:90px; }
        .skeleton.short { width:56%; }
        @media(prefers-reduced-motion:no-preference) { .skeleton { animation:pulse 1.4s ease-in-out infinite alternate; } @keyframes pulse { to { opacity:.55; } } }
        .error-state { color:var(--color-danger); }
        .error-state p { margin:8px 0 17px; }
        .error-state button,.error-state a { display:inline-block; margin-right:12px; padding:8px 12px; border:1px solid var(--color-line); border-radius:var(--radius-control); background:var(--color-surface); color:var(--color-brand); font-size:14px; font-weight:600; cursor:pointer; }
        button:focus-visible,.error-state a:focus-visible { outline:3px solid rgba(23,107,99,.32); outline-offset:3px; }
        @media(max-width:900px) { .profile-card { gap:20px; padding:25px; } .metrics { width:42%; } .content-grid { grid-template-columns:260px minmax(0,1fr); gap:16px; } }
        @media(max-width:650px) { .profile-main { width:calc(100% - 32px); padding:22px 0 40px; } .breadcrumbs { margin-bottom:14px; } .profile-card { display:block; min-height:0; padding:20px 18px 18px; } .person { align-items:flex-start; gap:14px; } .avatar { width:64px; height:64px; font-size:20px; } h1 { font-size:23px; line-height:30px; } .metrics { width:100%; margin-top:21px; gap:9px; } .metric { min-height:94px; padding:12px; } .metric strong { font-size:26px; line-height:32px; } .content-grid { grid-template-columns:1fr; gap:15px; margin-top:16px; } .value-panel { padding:19px 18px; } .recent-header { padding:17px 16px 4px; } .recent-list { padding:0 16px; } .context { flex-wrap:wrap; } .page-note { margin-top:11px; } }
      `}</style>
    </>
  );
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  return <UserProfileScreen id={params.id} />;
}
