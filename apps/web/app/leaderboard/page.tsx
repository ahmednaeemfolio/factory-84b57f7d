'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import { apiGet } from '@/lib/api';

type LeaderboardRecipient = {
  recipientId: string;
  displayName: string;
  totalKudos: number;
  countsByValue: Record<string, number>;
};

type LeaderboardResponse = {
  month: string;
  leaderboard: LeaderboardRecipient[];
};

export function currentUtcMonth(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function leaderboardMonthUrl(month: string): string {
  return `/leaderboard?month=${encodeURIComponent(month)}`;
}

export function loadLeaderboard(month: string): Promise<LeaderboardResponse> {
  return apiGet<LeaderboardResponse>(leaderboardMonthUrl(month));
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return currentUtcMonth(date);
}

export default function LeaderboardPage() {
  const [month, setMonth] = useState(() => currentUtcMonth());
  const [result, setResult] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    loadLeaderboard(month)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, retry]);

  const recipients = result?.leaderboard.slice(0, 10) ?? [];
  const values = Array.from(new Set(recipients.flatMap((person) => Object.keys(person.countsByValue))));

  return (
    <>
      <AppNav />
      <main className="leaderboard-page">
        <header className="page-heading">
          <div>
            <h1>Leaderboard</h1>
            <p>See who’s been recognized across your workspace.</p>
          </div>
          <div className="month-controls" aria-label="Leaderboard month controls">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((selected) => shiftMonth(selected, -1))}>‹</button>
            <label htmlFor="leaderboard-month">Month
              <input
                id="leaderboard-month"
                aria-label="Select leaderboard month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.currentTarget.value)}
              />
            </label>
            <button type="button" aria-label="Next month" onClick={() => setMonth((selected) => shiftMonth(selected, 1))}>›</button>
          </div>
        </header>

        <section className="results-card" aria-labelledby="recipients-heading" aria-busy={loading}>
          <div className="results-heading">
            <div>
              <h2 id="recipients-heading">Top recipients</h2>
              <p>Ranked by kudos received this month</p>
            </div>
            <span className="utc-label">{month} · UTC</span>
          </div>

          {loading ? (
            <p className="state-message" role="status">Loading leaderboard…</p>
          ) : error ? (
            <div className="state-message error-message" role="alert">
              <p>The leaderboard couldn’t be loaded. Try again.</p>
              <button type="button" onClick={() => setRetry((count) => count + 1)}>Try again</button>
            </div>
          ) : recipients.length === 0 ? (
            <p className="state-message">No kudos have been received this month yet.</p>
          ) : (
            <div className="table-wrap">
              <table aria-label={`Top 10 recipients and company-value counts for ${month}`}>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Recipient</th>
                    <th scope="col">Kudos</th>
                    {values.map((value) => <th scope="col" key={value}>{value}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((person, index) => (
                    <tr key={person.recipientId}>
                      <td data-label="Rank">{String(index + 1).padStart(2, '0')}</td>
                      <td data-label="Recipient"><Link href={`/users/${encodeURIComponent(person.recipientId)}`}>{person.displayName}</Link></td>
                      <td data-label="Kudos">{person.totalKudos} kudos</td>
                      {values.map((value) => {
                        const count = person.countsByValue[value] ?? 0;
                        return <td data-label={value} key={value}>{count} for {value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="helper-notes">
            <span>Counts show non-hidden kudos received in the selected UTC month.</span>
            <span>Each recipient is counted once per kudos.</span>
          </div>
        </section>

        <style jsx>{`
          .leaderboard-page { width: min(1040px, calc(100% - 64px)); margin: 0 auto; padding: 40px 0 64px; }
          .page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
          .page-heading p, .results-heading p { margin: 6px 0 0; color: var(--color-quiet-ink); font-size: 14px; }
          .month-controls { display: flex; align-items: center; gap: 8px; padding: 5px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 10px; }
          .month-controls button { width: 36px; height: 36px; border: 0; border-radius: 7px; background: transparent; color: var(--color-quiet-ink); font-size: 24px; cursor: pointer; }
          .month-controls button:hover { background: var(--color-muted); }
          .month-controls label { display: grid; gap: 1px; color: var(--color-quiet-ink); font-size: 11px; }
          .month-controls input { border: 0; background: transparent; color: var(--color-ink); font: inherit; font-size: 14px; }
          .results-card { overflow: hidden; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-card); box-shadow: 0 1px 2px rgba(32,40,39,.06); }
          .results-heading { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--color-line); }
          .results-heading h2 { margin: 0; font-size: 20px; }
          .utc-label { align-self: flex-start; padding: 5px 9px; border-radius: 999px; background: var(--color-muted); color: var(--color-quiet-ink); font-size: 12px; }
          .state-message { padding: 24px; margin: 0; color: var(--color-quiet-ink); }
          .error-message { color: var(--color-danger); }
          .error-message button { margin-top: 8px; padding: 8px 12px; border: 1px solid var(--color-line); border-radius: var(--radius-control); background: var(--color-surface); color: var(--color-brand); cursor: pointer; }
          .table-wrap { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; }
          th { padding: 12px 14px; background: #FBFCFB; color: var(--color-quiet-ink); font-size: 12px; text-align: left; }
          td { padding: 16px 14px; border-top: 1px solid var(--color-line); font-size: 14px; }
          td a { color: var(--color-ink); font-weight: 600; }
          td a:hover { color: var(--color-brand); text-decoration: underline; }
          .helper-notes { display: flex; flex-wrap: wrap; gap: 8px 24px; padding: 16px 24px; border-top: 1px solid var(--color-line); background: #FBFCFB; color: var(--color-quiet-ink); font-size: 12px; }
          @media (max-width: 767px) {
            .leaderboard-page { width: calc(100% - 36px); padding: 28px 0 48px; }
            .page-heading { display: grid; gap: 18px; margin-bottom: 21px; }
            .month-controls { width: 100%; justify-content: space-between; }
            .month-controls label { flex: 1; text-align: center; }
            .results-heading { padding: 17px 16px; }
            table, tbody { display: block; }
            thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
            tbody tr { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px 16px; border-top: 1px solid var(--color-line); }
            td { padding: 0; border: 0; }
            td:nth-child(1) { display: none; }
            td:nth-child(2) { grid-column: 1; }
            td:nth-child(n+3) { text-align: right; color: var(--color-quiet-ink); }
            .helper-notes { display: grid; padding: 14px 16px; }
          }
          @media (max-width: 420px) { .leaderboard-page { width: calc(100% - 28px); } }
        `}</style>
      </main>
    </>
  );
}
