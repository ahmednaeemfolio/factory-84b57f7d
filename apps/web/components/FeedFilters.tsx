'use client';

import type { FormEvent } from 'react';

export type FeedFilterValues = {
  recipientTeamId: string;
  companyValue: string;
  recipientId: string;
};

export type FilterOption = { id: string; label: string };

export const emptyFeedFilters: FeedFilterValues = {
  recipientTeamId: '',
  companyValue: '',
  recipientId: '',
};

/** The query parameters intentionally match the API's composable feed contract. */
export function buildFeedQuery(filters: FeedFilterValues, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (filters.recipientTeamId) params.set('recipientTeamId', filters.recipientTeamId);
  if (filters.companyValue) params.set('companyValue', filters.companyValue);
  if (filters.recipientId) params.set('recipientId', filters.recipientId);
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

type Props = {
  filters: FeedFilterValues;
  teams: FilterOption[];
  values: string[];
  recipients: FilterOption[];
  onChange: (filters: FeedFilterValues) => void;
  onClear: () => void;
};

export default function FeedFilters({ filters, teams, values, recipients, onChange, onClear }: Props) {
  const update = (event: FormEvent<HTMLSelectElement>) => {
    const target = event.currentTarget;
    onChange({ ...filters, [target.name]: target.value });
  };
  const hasFilters = Boolean(filters.recipientTeamId || filters.companyValue || filters.recipientId);

  return (
    <form className="filter-panel" aria-label="Filter kudos" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-intro"><span aria-hidden="true">☷</span><span>Filter recognition</span></div>
      <div className="filter-field">
        <label htmlFor="team-filter">Recipient team</label>
        <select id="team-filter" name="recipientTeamId" value={filters.recipientTeamId} onChange={update}>
          <option value="">All teams</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="value-filter">Company value</label>
        <select id="value-filter" name="companyValue" value={filters.companyValue} onChange={update}>
          <option value="">All values</option>
          {values.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="recipient-filter">Recipient</label>
        <select id="recipient-filter" name="recipientId" value={filters.recipientId} onChange={update}>
          <option value="">All recipients</option>
          {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.label}</option>)}
        </select>
      </div>
      <button className="clear-button" type="button" onClick={onClear} disabled={!hasFilters}>Clear filters</button>
      <style jsx>{`
        .filter-panel { display:flex; align-items:end; gap:14px; padding:17px 18px; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        .filter-intro { align-self:center; min-width:126px; display:flex; gap:9px; align-items:center; font-size:14px; font-weight:600; }
        .filter-intro span:first-child { color:var(--color-brand); font-size:19px; }
        .filter-field { min-width:0; flex:1 1 0; }
        label { display:block; margin-bottom:5px; color:var(--color-quiet-ink); font-size:12px; font-weight:550; }
        select { width:100%; height:40px; padding:0 10px; border:1px solid var(--color-line); border-radius:7px; background:var(--color-surface); color:var(--color-ink); font:inherit; font-size:13px; }
        .clear-button { height:40px; padding:0 8px; border:0; border-radius:7px; background:transparent; color:var(--color-brand); cursor:pointer; font-size:13px; white-space:nowrap; }
        .clear-button:disabled { color:var(--color-quiet-ink); cursor:default; }
        @media(max-width:767px) { .filter-panel { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; } .filter-intro { grid-column:1/-1; } .filter-field:last-of-type { grid-column:1/-1; } .clear-button { justify-self:start; } }
      `}</style>
    </form>
  );
}
