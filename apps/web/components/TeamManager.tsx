'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost, apiRequest } from '@/lib/api';

type Team = { id: string; name: string; [key: string]: unknown };
type TeamOperation = 'create' | 'rename';

export function validateTeamName(value: string, teams: Team[], excludeId?: string): string | null {
  const name = value.trim();
  if (name.length < 2 || name.length > 40) return 'Team names must be 2–40 characters.';
  if (teams.some((team) => team.id !== excludeId && team.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return 'A team with this name already exists.';
  }
  return null;
}

export function createTeam(name: string): Promise<Team> {
  return apiPost<Team>('/teams', { name });
}

export function renameTeam(id: string, name: string): Promise<Team> {
  return apiRequest<Team>(`/teams/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function loadTeams(): Promise<Team[]> {
  return apiGet<Team[]>('/teams');
}

function errorMessage(error: unknown): { message: string; duplicate: boolean } {
  const message = error instanceof Error ? error.message : 'Unable to save team changes.';
  const duplicate = /already exists|duplicate|unique/i.test(message);
  return { message: duplicate ? 'A team with this name already exists.' : message, duplicate };
}

export default function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [createName, setCreateName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState<TeamOperation | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [duplicate, setDuplicate] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      setTeams(await loadTeams());
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Unable to load teams.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function startRename(team: Team) {
    setEditingId(team.id);
    setEditingName(team.name);
    setFieldError('');
    setSaveError('');
    setStatus('');
  }

  async function save(event: FormEvent<HTMLFormElement>, operation: TeamOperation, teamId?: string) {
    event.preventDefault();
    const name = operation === 'create' ? createName.trim() : editingName.trim();
    const validation = validateTeamName(name, teams, teamId);
    setFieldError(validation ?? '');
    setSaveError('');
    setDuplicate(false);
    setStatus('');
    if (validation) return;

    setSaving(operation);
    try {
      if (operation === 'create') await createTeam(name);
      else if (teamId) await renameTeam(teamId, name);
      await refresh();
      setCreateName('');
      setEditingId(null);
      setStatus(operation === 'create' ? 'Team created successfully.' : 'Team renamed successfully.');
    } catch (caught) {
      const detail = errorMessage(caught);
      setDuplicate(detail.duplicate);
      setSaveError(detail.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="teams-title">
      <header className="panel-heading"><div><h2 id="teams-title">Team management</h2><p>Create and rename workspace teams.</p></div></header>
      <form className="team-form" onSubmit={(event) => void save(event, 'create')} noValidate>
        <label htmlFor="new-team-name">Create a team</label>
        <div className="create-row">
          <input id="new-team-name" name="team-name" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="e.g. Customer success" aria-describedby="team-help team-error" aria-invalid={Boolean(fieldError)} disabled={saving !== null} />
          <button className="primary" type="submit" disabled={saving !== null}>{saving === 'create' ? 'Saving…' : 'Create team'}</button>
        </div>
        <p id="team-help" className="helper">Team names must be unique and 2–40 characters.</p>
        {fieldError && editingId === null && <p id="team-error" className="error" role="alert">{fieldError}</p>}
      </form>
      {status && <p className="status success" role="status" aria-live="polite">{status}</p>}
      {saveError && <p className={`status ${duplicate ? 'duplicate' : 'error'}`} role={duplicate ? 'status' : 'alert'}>{saveError}</p>}
      {loading ? <p className="state" role="status">Loading teams…</p> : loadError ? <div className="state"><p className="error" role="alert">{loadError}</p><button type="button" className="secondary" onClick={() => void refresh()}>Retry</button></div> : teams.length === 0 ? <p className="state">No teams yet.</p> : (
        <ul className="team-list" aria-label="Teams">
          {teams.map((team) => <li className="team-row" key={team.id}>
            {editingId === team.id ? (
              <form className="rename-form" onSubmit={(event) => void save(event, 'rename', team.id)} noValidate>
                <label htmlFor={`rename-${team.id}`}>Rename {team.name}</label>
                <input id={`rename-${team.id}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-describedby={`rename-error-${team.id}`} aria-invalid={Boolean(fieldError)} disabled={saving !== null} />
                {fieldError && <span id={`rename-error-${team.id}`} className="error" role="alert">{fieldError}</span>}
                <button className="primary" type="submit" disabled={saving !== null}>{saving === 'rename' ? 'Saving…' : 'Save name'}</button>
                <button className="secondary" type="button" disabled={saving !== null} onClick={() => { setEditingId(null); setFieldError(''); }}>Cancel</button>
              </form>
            ) : <>
              <span className="team-mark" aria-hidden="true">♧</span><span className="team-name">{team.name}</span>
              <button type="button" className="rename" aria-label={`Rename ${team.name}`} onClick={() => startRename(team)}>Rename</button>
            </>}
          </li>)}
        </ul>
      )}
      <p className="team-footer">{teams.length} {teams.length === 1 ? 'team' : 'teams'} in this workspace</p>
      <style jsx>{`
        .panel { overflow:hidden; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        .panel-heading { min-height:76px; padding:18px 20px; display:flex; align-items:center; border-bottom:1px solid var(--color-line); }
        h2 { margin:0; font-size:18px; line-height:25px; font-weight:620; }
        .panel-heading p { margin:3px 0 0; color:var(--color-quiet-ink); font-size:13px; }
        .team-form { padding:19px 20px 20px; border-bottom:1px solid var(--color-line); }
        label { display:block; margin-bottom:7px; color:#39443f; font-size:13px; font-weight:600; }
        .create-row { display:flex; gap:8px; }
        input { width:100%; min-width:0; height:40px; padding:0 11px; border:1px solid #c9d1cc; border-radius:var(--radius-control); background:white; color:var(--color-ink); font:inherit; font-size:13px; }
        input:focus-visible { outline:3px solid rgba(23,107,99,.25); border-color:var(--color-brand); }
        .helper { margin:8px 0 0; color:var(--color-quiet-ink); font-size:12px; }
        button { min-height:38px; padding:7px 11px; border:1px solid; border-radius:var(--radius-control); font-size:12px; font-weight:600; cursor:pointer; }
        button:disabled { opacity:.6; cursor:wait; }
        .primary { flex:none; border-color:var(--color-brand); background:var(--color-brand); color:white; }
        .secondary { border-color:var(--color-line); background:white; color:#37423e; }
        .team-list { margin:0; padding:2px 20px 8px; list-style:none; }
        .team-row { min-height:57px; display:flex; align-items:center; gap:11px; border-bottom:1px solid #e9edea; }
        .team-row:last-child { border-bottom:0; }
        .team-mark { width:32px; height:32px; display:grid; place-items:center; border:1px solid #e0e7e2; border-radius:9px; background:#f6f8f6; color:#5e7468; }
        .team-name { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:550; }
        .rename { border-color:transparent; background:transparent; color:var(--color-quiet-ink); }
        .rename-form { width:100%; padding:12px 0; display:grid; grid-template-columns:1fr auto auto; gap:8px; }
        .rename-form label { grid-column:1/-1; margin:0; }
        .rename-form input { grid-column:1/-1; }
        .rename-form .error { grid-column:1/-1; }
        .state { padding:16px 20px; margin:0; color:var(--color-quiet-ink); font-size:13px; }
        .error { color:var(--color-danger); font-size:12px; }
        .status { margin:12px 20px 0; padding:9px 11px; border-radius:var(--radius-control); font-size:13px; }
        .success { border:1px solid #c9ddd3; background:#f1f7f3; color:#285c43; }
        .duplicate { border:1px solid #e8ddcf; background:#f6f0e8; color:#5f4934; }
        .status.error { border:1px solid #e6baba; background:#fbefef; color:#852626; }
        .team-footer { margin:0 20px 18px; padding-top:11px; border-top:1px solid #e9edea; color:var(--color-quiet-ink); font-size:12px; }
        @media(max-width:430px) { .panel-heading { padding:16px; } .team-form { padding:17px 16px; } .team-list { padding-left:16px; padding-right:16px; } .team-footer { margin-left:16px; margin-right:16px; } }
      `}</style>
    </section>
  );
}
