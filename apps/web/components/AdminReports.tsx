'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiRequest } from '@/lib/api';

export type AdminReport = {
  id: string;
  reason: string;
  createdAt?: string;
  reporter?: { id?: string; displayName?: string };
  kudos?: {
    id?: string;
    message?: string;
    companyValue?: string;
    sender?: { displayName?: string };
    recipients?: Array<{ recipient?: { displayName?: string } }>;
  };
};

type Resolution = 'hide' | 'dismiss';

export const adminReportActions = ['Hide kudos', 'Dismiss report'] as const;

export function resolveAdminReport(reportId: string, action: Resolution): Promise<AdminReport> {
  return apiRequest<AdminReport>(`/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export function loadAdminReports(): Promise<AdminReport[]> {
  return apiGet<AdminReport[]>('/admin/reports');
}

function reportError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unable to update this report.';
  return /already exists|duplicate|unique/i.test(message) ? 'This report has already been resolved.' : message;
}

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminReport | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      setReports(await loadAdminReports());
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Unable to load open reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function resolve(report: AdminReport, action: Resolution) {
    setResolvingId(report.id);
    setError('');
    setMessage('');
    try {
      await resolveAdminReport(report.id, action);
      await refresh();
      setMessage(action === 'hide' ? 'Kudos hidden and report resolved. The open report queue has been refreshed.' : 'Report dismissed. The open report queue has been refreshed.');
      setConfirming(null);
    } catch (caught) {
      setError(reportError(caught));
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="reports-title">
      <header className="panel-heading">
        <div><h2 id="reports-title">Open reports</h2><p>Review each report and choose how to resolve it.</p></div>
        {!loading && !loadError && <span className="count" aria-label={`${reports.length} open reports`}>{reports.length}</span>}
      </header>
      {message && <p className="status success" role="status" aria-live="polite">{message}</p>}
      {error && <p className="status error" role="alert">{error}</p>}
      {loading ? <p className="state">Loading reports…</p> : loadError ? (
        <div className="state error-state"><p role="alert">{loadError}</p><button type="button" onClick={() => void refresh()}>Retry</button></div>
      ) : reports.length === 0 ? <p className="state">No open reports.</p> : reports.map((report) => {
        const recipients = report.kudos?.recipients?.map((entry) => entry.recipient?.displayName).filter(Boolean).join(', ');
        return (
          <article className="report" key={report.id}>
            <div className="report-meta">
              <span className="reason">{report.reason}</span>
              {report.reporter?.displayName && <span>Reported by {report.reporter.displayName}</span>}
              {report.createdAt && <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>}
            </div>
            <div className="preview">
              <div className="context">
                <strong>{report.kudos?.sender?.displayName ?? 'Kudos sender'}</strong><span aria-hidden="true">→</span>
                <strong>{recipients || 'Reported recipient'}</strong>
                {report.kudos?.companyValue && <span className="value">{report.kudos.companyValue}</span>}
              </div>
              <p>{report.kudos?.message ?? 'Reported kudos preview is unavailable.'}</p>
            </div>
            <div className="actions">
              <button type="button" className="primary" disabled={resolvingId === report.id} onClick={() => setConfirming(report)}>Hide kudos</button>
              <button type="button" className="secondary" disabled={resolvingId === report.id} onClick={() => void resolve(report, 'dismiss')}>Dismiss report</button>
            </div>
          </article>
        );
      })}
      {confirming && <div className="dialog-layer" role="presentation">
        <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="hide-title" aria-describedby="hide-description">
          <h2 id="hide-title">Hide reported kudos?</h2>
          <p id="hide-description">Hiding removes this kudos from feeds, profiles, leaderboard counts, and unread notification counts. This also resolves the report.</p>
          <div className="actions">
            <button type="button" className="primary" disabled={resolvingId === confirming.id} onClick={() => void resolve(confirming, 'hide')}>{resolvingId === confirming.id ? 'Hiding…' : 'Confirm hide'}</button>
            <button type="button" className="secondary" disabled={resolvingId === confirming.id} onClick={() => setConfirming(null)}>Cancel</button>
          </div>
        </section>
      </div>}
      <style jsx>{`
        .panel { overflow:hidden; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        .panel-heading { min-height:76px; padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid var(--color-line); }
        h2 { margin:0; font-size:18px; line-height:25px; font-weight:620; }
        .panel-heading p { margin:3px 0 0; color:var(--color-quiet-ink); font-size:13px; }
        .count { min-width:30px; padding:3px 9px; border:1px solid var(--color-line); border-radius:999px; background:#f6f7f5; text-align:center; font-size:12px; }
        .report { padding:19px 20px 20px; border-bottom:1px solid #e7ebe8; }
        .report:last-of-type { border-bottom:0; }
        .report-meta { display:flex; align-items:center; flex-wrap:wrap; gap:7px 12px; margin-bottom:12px; color:var(--color-quiet-ink); font-size:12px; }
        .reason { padding:2px 9px; border:1px solid #e8ddcf; border-radius:999px; background:#f6f0e8; color:#5f4934; font-weight:550; }
        .preview { margin-bottom:14px; padding:12px 14px; border-left:2px solid #c9ddd3; border-radius:0 var(--radius-control) var(--radius-control) 0; background:#f8faf8; }
        .context { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-bottom:6px; font-size:13px; }
        .value { padding:1px 8px; border-radius:999px; background:#edf4f0; color:#446352; font-size:11px; }
        .preview p { margin:0; color:#3f4a46; font-size:13px; line-height:20px; }
        .actions { display:flex; flex-wrap:wrap; gap:9px; }
        button { min-height:38px; padding:8px 12px; border-radius:var(--radius-control); border:1px solid; font-size:13px; font-weight:600; cursor:pointer; }
        button:disabled { opacity:.6; cursor:wait; }
        .primary { border-color:var(--color-brand); background:var(--color-brand); color:white; }
        .primary:hover:not(:disabled) { background:#125b54; }
        .secondary { border-color:var(--color-line); background:white; color:#37423e; }
        .secondary:hover:not(:disabled) { background:#f7f9f7; }
        .state { margin:0; padding:20px; color:var(--color-quiet-ink); }
        .error-state p { color:var(--color-danger); }
        .error-state button { margin:0 20px 20px; border-color:var(--color-line); background:white; color:var(--color-brand); }
        .status { margin:14px 20px 0; padding:10px 12px; border-radius:var(--radius-control); font-size:13px; }
        .success { border:1px solid #c9ddd3; background:#f1f7f3; color:#285c43; }
        .error { border:1px solid #e6baba; background:#fbefef; color:#852626; }
        .dialog-layer { position:fixed; inset:0; z-index:30; display:grid; place-items:center; padding:20px; background:rgba(32,40,39,.42); }
        .confirm-dialog { width:min(100%,480px); padding:24px; border:1px solid var(--color-line); border-radius:var(--radius-card); background:white; box-shadow:0 8px 24px rgba(32,40,39,.18); }
        .confirm-dialog h2 { font-size:20px; }
        .confirm-dialog p { margin:12px 0 20px; color:var(--color-quiet-ink); font-size:14px; }
        @media(max-width:430px) { .panel-heading,.report { padding:16px; } .actions button { flex:1; min-height:42px; } }
      `}</style>
    </section>
  );
}
