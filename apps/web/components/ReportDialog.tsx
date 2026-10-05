'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';

type ReportDialogProps = {
  kudosId: string;
  open: boolean;
  onClose: () => void;
};

type ReportState = 'idle' | 'submitting' | 'submitted' | 'duplicate' | 'error';

export function submitKudosReport(kudosId: string, reason: string): Promise<unknown> {
  return apiPost(`/kudos/${encodeURIComponent(kudosId)}/reports`, { reason });
}

export default function ReportDialog({ kudosId, open, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [state, setState] = useState<ReportState>('idle');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      reasonRef.current?.focus();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && state !== 'submitting') onClose();
        if (event.key === 'Tab' && dialogRef.current) {
          const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)'));
          if (!controls.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        returnFocus.current?.focus();
      };
    }
  }, [open, onClose, state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      setError('Enter a reason between 1 and 200 characters.');
      return;
    }
    if (state === 'submitted' || state === 'duplicate' || state === 'submitting') return;
    setError('');
    setState('submitting');
    try {
      await submitKudosReport(kudosId, trimmed);
      setState('submitted');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to submit this report.';
      if (/already reported|duplicate/i.test(message)) {
        setState('duplicate');
      } else {
        setState('error');
        setError(message);
      }
    }
  }

  return (
    <div className="dialog-layer" hidden={!open}>
      <div className="dialog-backdrop" aria-hidden="true" />
      <div ref={dialogRef} className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" aria-describedby="report-help">
        <div className="dialog-heading">
          <h2 id="report-title">Report kudos</h2>
          <button className="close-button" type="button" aria-label="Close report dialog" onClick={onClose}>×</button>
        </div>
        {state === 'submitted' ? (
          <div className="status-block success" role="status">
            <strong>Report submitted.</strong>
            <p>Thank you. This kudos has been sent for review. You can report this kudos once; duplicate reports are not accepted.</p>
          </div>
        ) : state === 'duplicate' ? (
          <div className="status-block info" role="status">
            <strong>This kudos was already reported.</strong>
            <p>The API rejects duplicate reports from the same member. A report has already been recorded, so another submission isn’t available.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p id="report-help" className="dialog-help">You can report this kudos once. Duplicate reports aren’t accepted.</p>
            <label htmlFor="report-reason">Reason for report</label>
            <textarea ref={reasonRef} id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} aria-describedby="report-help report-limit report-error" aria-invalid={Boolean(error)} disabled={state === 'submitting'} placeholder="Explain why this kudos should be reviewed…" />
            <div className="form-footer">
              <span id="report-limit" className="character-count">{reason.length}/200 characters</span>
              <button className="submit-button" type="submit" disabled={state === 'submitting' || reason.trim().length === 0}>
                {state === 'submitting' ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
            <p id="report-error" className="error-text" role={error ? 'alert' : undefined}>{error}</p>
          </form>
        )}
      </div>
      <style jsx>{`
        .dialog-layer[hidden] { display:none; }
        .dialog-layer { position:fixed; inset:0; z-index:30; display:grid; place-items:center; padding:20px; }
        .dialog-backdrop { position:absolute; inset:0; background:rgba(32,40,39,.42); }
        .report-dialog { position:relative; width:min(100%, 480px); max-height:calc(100vh - 40px); overflow:auto; padding:24px; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); box-shadow:0 8px 24px rgba(32,40,39,.18); }
        .dialog-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
        h2 { margin:0; font-size:20px; line-height:28px; font-weight:620; }
        .close-button { width:36px; height:36px; border:0; border-radius:8px; background:transparent; color:var(--color-quiet-ink); font-size:25px; cursor:pointer; }
        .dialog-help { margin:0 0 18px; color:var(--color-quiet-ink); font-size:14px; }
        label { display:block; margin-bottom:7px; font-size:14px; font-weight:600; }
        textarea { display:block; width:100%; min-height:120px; padding:11px 12px; resize:vertical; border:1px solid var(--color-line); border-radius:var(--radius-control); color:var(--color-ink); font:inherit; font-size:14px; }
        button:focus-visible,textarea:focus-visible { outline:3px solid rgba(23,107,99,.32); outline-offset:2px; }
        .form-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; }
        .character-count { color:var(--color-quiet-ink); font-size:12px; }
        .submit-button { min-height:40px; padding:0 15px; border:1px solid var(--color-brand); border-radius:var(--radius-control); background:var(--color-brand); color:white; font-size:14px; font-weight:600; cursor:pointer; }
        .submit-button:disabled { opacity:.58; cursor:not-allowed; }
        .error-text { margin:8px 0 0; color:var(--color-danger); font-size:13px; }
        .status-block { padding:14px; border-radius:var(--radius-control); font-size:14px; }
        .status-block p { margin:6px 0 0; }
        .success { border:1px solid #b8d5c3; background:#f0f7f2; color:#236747; }
        .info { border:1px solid #c6d7e6; background:#f1f6fa; color:#315D83; }
        @media(max-width:480px) { .report-dialog { padding:19px; } }
      `}</style>
    </div>
  );
}
