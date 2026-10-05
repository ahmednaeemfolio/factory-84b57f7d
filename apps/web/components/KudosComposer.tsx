'use client';

import { useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';

export type KudosDraft = { recipientIds: string[]; message: string; companyValue: string };
export type KudosFieldErrors = Partial<Record<'recipientIds' | 'message' | 'companyValue', string>>;
export type ComposerRecipient = { id: string; displayName: string };

export function validateKudosDraft(draft: KudosDraft, senderId: string, supportedValues: string[]): KudosFieldErrors {
  const errors: KudosFieldErrors = {};
  const ids = draft.recipientIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5) {
    errors.recipientIds = 'Choose between 1 and 5 recipients.';
  } else if (new Set(ids).size !== ids.length) {
    errors.recipientIds = 'Choose each recipient only once.';
  } else if (ids.includes(senderId)) {
    errors.recipientIds = 'You cannot send kudos to yourself.';
  } else if (ids.some((id) => !id)) {
    errors.recipientIds = 'Choose valid recipients.';
  }
  if (typeof draft.message !== 'string' || draft.message.length < 1 || draft.message.length > 500) {
    errors.message = 'Message must be between 1 and 500 characters.';
  }
  if (!draft.companyValue || !supportedValues.includes(draft.companyValue)) {
    errors.companyValue = 'Choose one supported company value.';
  }
  return errors;
}

/** Exported so the submission boundary can be tested without a browser environment. */
export async function submitKudosDraft(
  draft: KudosDraft,
  senderId: string,
  supportedValues: string[],
): Promise<{ errors: KudosFieldErrors; submitted: boolean; errorMessage?: string; dailyLimit?: boolean }> {
  const errors = validateKudosDraft(draft, senderId, supportedValues);
  if (Object.keys(errors).length) return { errors, submitted: false };
  try {
    await apiPost('/kudos', draft);
    return { errors: {}, submitted: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Kudos could not be sent. Try again.';
    return { errors: {}, submitted: false, errorMessage, dailyLimit: /daily|limit|429/i.test(errorMessage) };
  }
}

type Props = {
  senderId: string;
  recipients: ComposerRecipient[];
  supportedValues: string[];
  onSent: () => void;
};

export default function KudosComposer({ senderId, recipients, supportedValues, onSent }: Props) {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [companyValue, setCompanyValue] = useState('');
  const [errors, setErrors] = useState<KudosFieldErrors>({});
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    const draft = { recipientIds, message, companyValue };
    const validationErrors = validateKudosDraft(draft, senderId, supportedValues);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    const result = await submitKudosDraft(draft, senderId, supportedValues);
    setSubmitting(false);
    if (result.submitted) {
      setStatus('Kudos sent successfully.');
      setRecipientIds([]);
      setMessage('');
      setCompanyValue('');
      onSent();
    } else if (result.errorMessage) {
      setStatus(result.dailyLimit ? `Daily sending limit reached. ${result.errorMessage}` : `Kudos could not be sent. ${result.errorMessage}`);
    }
  };

  const toggleRecipient = (id: string) => {
    setRecipientIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setErrors((current) => ({ ...current, recipientIds: undefined }));
  };

  return (
    <section className="composer" aria-labelledby="composer-title">
      <h2 id="composer-title">Send kudos</h2>
      <form onSubmit={submit} noValidate>
        <fieldset aria-describedby={errors.recipientIds ? 'recipient-error' : undefined}>
          <legend>Recipients (choose 1–5)</legend>
          <div className="recipient-list">
            {recipients.filter((recipient) => recipient.id !== senderId).map((recipient) => (
              <label key={recipient.id} className="recipient-option">
                <input type="checkbox" name="recipientIds" value={recipient.id} checked={recipientIds.includes(recipient.id)} disabled={!recipientIds.includes(recipient.id) && recipientIds.length >= 5} onChange={() => toggleRecipient(recipient.id)} />
                <span>{recipient.displayName}</span>
              </label>
            ))}
          </div>
          {errors.recipientIds && <p className="field-error" id="recipient-error" role="alert">{errors.recipientIds}</p>}
        </fieldset>
        <label htmlFor="kudos-message">Message</label>
        <textarea id="kudos-message" value={message} maxLength={500} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error message-count' : 'message-count'} onChange={(event) => { setMessage(event.target.value); setErrors((current) => ({ ...current, message: undefined })); }} />
        <div className="message-meta"><span id="message-count">{message.length}/500 characters</span>{errors.message && <span className="field-error" id="message-error" role="alert">{errors.message}</span>}</div>
        <label htmlFor="kudos-value">Company value</label>
        <select id="kudos-value" value={companyValue} aria-invalid={Boolean(errors.companyValue)} aria-describedby={errors.companyValue ? 'value-error' : undefined} onChange={(event) => { setCompanyValue(event.target.value); setErrors((current) => ({ ...current, companyValue: undefined })); }}>
          <option value="">Choose a supported value</option>
          {supportedValues.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        {errors.companyValue && <p className="field-error" id="value-error" role="alert">{errors.companyValue}</p>}
        {status && <p className={status.startsWith('Kudos sent') ? 'success' : 'form-error'} role={status.startsWith('Kudos sent') ? 'status' : 'alert'}>{status}</p>}
        <button type="submit" className="send-button" disabled={submitting}>{submitting ? 'Sending…' : 'Send kudos'}</button>
      </form>
      <style jsx>{`
        .composer { padding:22px; border:1px solid var(--color-line); border-radius:var(--radius-card); background:var(--color-surface); box-shadow:0 1px 2px rgba(32,40,39,.06); }
        h2 { margin:0 0 16px; font-size:20px; line-height:28px; }
        form { display:grid; gap:9px; }
        fieldset { min-width:0; margin:0 0 5px; padding:0; border:0; }
        legend, form > label { display:block; margin-bottom:5px; font-size:14px; font-weight:550; }
        .recipient-list { display:flex; flex-wrap:wrap; gap:8px; }
        .recipient-option { display:flex; align-items:center; gap:7px; padding:7px 10px; border:1px solid var(--color-line); border-radius:8px; font-size:14px; }
        input[type=checkbox] { accent-color:var(--color-brand); }
        textarea, select { width:100%; padding:10px 11px; border:1px solid var(--color-line); border-radius:var(--radius-control); background:white; color:var(--color-ink); font:inherit; }
        textarea { min-height:108px; resize:vertical; }
        textarea:focus, select:focus { outline:3px solid rgba(23,107,99,.22); outline-offset:1px; }
        .message-meta { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px; color:var(--color-quiet-ink); font-size:12px; }
        .field-error, .form-error { color:var(--color-danger); font-size:13px; }
        .field-error { margin:4px 0 0; }
        .success { margin:4px 0; color:#236747; font-size:14px; }
        .form-error { margin:4px 0; }
        .send-button { justify-self:start; min-height:42px; padding:0 16px; border:1px solid var(--color-brand); border-radius:8px; background:var(--color-brand); color:white; font-weight:600; cursor:pointer; }
        .send-button:disabled { opacity:.7; cursor:wait; }
      `}</style>
    </section>
  );
}
