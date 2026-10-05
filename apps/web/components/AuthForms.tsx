'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import { apiGet, apiPost } from '@/lib/api';
import { storeSession, type SessionUser, type UserRole } from '@/lib/session';

type Team = { id: string; name: string };
type Account = { id: string; email: string; displayName: string; role: UserRole; teamId: string };
type FieldErrors = Partial<Record<'email' | 'password' | 'displayName' | 'teamId', string>>;

/** Authenticate and hydrate identity from the canonical users/me contract. */
export async function signIn(email: string, password: string): Promise<SessionUser> {
  try {
    const { token } = await apiPost<{ token: string }>('/auth/login', { email, password });
    if (!token) throw new Error('Missing login token');
    window.localStorage.setItem('kudos.jwt', token);
    const account = await apiGet<Account>('/users/me');
    const user: SessionUser = { id: account.id, displayName: account.displayName, role: account.role };
    storeSession(token, user);
    return user;
  } catch (error) {
    window.localStorage.removeItem('kudos.jwt');
    throw error;
  }
}

/** Keep the public registration payload limited to account details and the selected team. */
export function registerAccount(details: { email: string; password: string; displayName: string; teamId: string }): Promise<unknown> {
  return apiPost('/auth/register', details);
}

function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : 'Enter a valid email address.';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="field-error" id={id}>{message}</span> : null;
}

function Brand() {
  return <Link className="auth-brand" href="/" aria-label="Kudos Board home"><span className="auth-brand-mark" aria-hidden="true">✦</span><span>Kudos Board</span></Link>;
}

function Styles() {
  return <style jsx global>{`
    .auth-page,.signed-in-state{min-height:100vh}.auth-page{display:grid;grid-template-rows:1fr auto;place-items:center;padding:32px 20px 20px;background:radial-gradient(ellipse at 50% 42%,rgba(231,243,240,.6),transparent 39rem),var(--color-page)}
    .auth-panel{width:min(100%,448px);padding:32px;border:1px solid rgba(216,222,218,.9);border-radius:16px;background:var(--color-surface);box-shadow:0 8px 24px rgba(32,40,39,.1)}.register-panel{width:min(100%,480px)}
    .auth-header{display:flex;align-items:center;justify-content:space-between}.auth-brand{display:inline-flex;align-items:center;gap:11px;width:fit-content;color:var(--color-ink);font-weight:650;text-decoration:none}.auth-brand-mark{display:grid;width:36px;height:36px;place-items:center;border-radius:10px;color:#fff;background:var(--color-brand)}
    .auth-brand:focus-visible,.auth-page a:focus-visible,.auth-page button:focus-visible{outline:3px solid rgba(23,107,99,.38);outline-offset:3px}.auth-eyebrow{margin:14px 0 0;color:var(--color-quiet-ink);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
    .auth-content{padding-top:30px}.auth-content h1,.auth-success h1{margin:0;color:var(--color-ink);font-size:26px;font-weight:650;line-height:34px;letter-spacing:-.025em}.auth-intro{margin:8px 0 0;color:var(--color-quiet-ink);font-size:15px;line-height:23px}
    .auth-form{display:grid;gap:16px;margin-top:24px}.form-field{display:grid;gap:6px}.form-field label{color:var(--color-ink);font-size:14px;font-weight:550;line-height:20px}.form-field input,.form-field select{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--color-line);border-radius:var(--radius-control);background:#fff;color:var(--color-ink);font:inherit}.form-field input:focus,.form-field select:focus{border-color:var(--color-focus);outline:3px solid rgba(23,107,99,.2);outline-offset:1px}.form-field [aria-invalid=true]{border-color:var(--color-danger)}
    .field-error{color:var(--color-danger);font-size:13px}.field-help,.auth-helper{color:var(--color-quiet-ink);font-size:12px;line-height:18px}.form-message{margin:0;padding:12px;border-radius:var(--radius-control);font-size:14px;line-height:21px}.form-message p{margin:0}.error-message{border:1px solid #e8caca;background:#fff7f7;color:var(--color-danger)}.info-message{border:1px solid var(--color-line);background:var(--color-muted);color:var(--color-ink)}
    .retry-link{margin-top:7px;padding:0;border:0;background:transparent;color:var(--color-brand);text-decoration:underline;cursor:pointer}.auth-primary{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;padding:11px 18px;border:1px solid var(--color-brand);border-radius:var(--radius-control);background:var(--color-brand);color:#fff;font:inherit;font-weight:600;text-align:center;text-decoration:none;cursor:pointer;transition:background-color 120ms ease}.auth-primary:hover:not(:disabled){background:#125b54}.auth-primary:disabled{opacity:.62;cursor:not-allowed}
    .auth-switch{margin:20px 0 0;color:var(--color-quiet-ink);font-size:14px;text-align:center}.auth-switch a{color:var(--color-brand);font-weight:600;text-decoration:underline;text-underline-offset:2px}.auth-footer{padding:22px 0 0;color:#747e7a;font-size:12px;text-align:center}.success-message{margin:24px 0;padding:14px;border:1px solid #d9e9de;border-radius:var(--radius-control);background:#f5faf6;color:#244a34}.member-note{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0 18px;border-bottom:1px solid var(--color-line);color:var(--color-quiet-ink);font-size:13px}.member-note strong{padding:4px 10px;border-radius:999px;background:var(--color-brand-soft);color:#173b37;font-size:12px}.auth-helper{margin:16px 0 0;text-align:center}.auth-success{display:grid;min-height:calc(100vh - 72px);place-items:center;padding:32px 20px}.auth-success .auth-panel{text-align:center}.signed-in-state .app-header{width:100%}
    @media(max-width:520px){.auth-page{padding:18px 16px}.auth-panel{padding:26px 22px 24px;border-radius:14px}.auth-content{padding-top:26px}}@media(prefers-reduced-motion:reduce){.auth-page *, .auth-page *:before,.auth-page *:after{transition-duration:.01ms!important}}
  `}</style>;
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {};
    const invalidEmail = emailError(email);
    if (invalidEmail) errors.email = invalidEmail;
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;
    setPending(true);
    try {
      await signIn(email, password);
      setSignedIn(true);
    } catch {
      setFormError("We couldn't sign you in with those details. Check your email and password, then try again.");
    } finally {
      setPending(false);
    }
  }

  if (signedIn) return <div className="signed-in-state"><AppNav /><main className="auth-success" aria-labelledby="signed-in-title"><section className="auth-panel"><p className="auth-eyebrow">Sign-in complete</p><h1 id="signed-in-title">You’re signed in.</h1><p className="auth-intro">Your Kudos Board workspace is ready.</p><p className="success-message" role="status" aria-live="polite">You’re signed in to your work account.</p><Link className="auth-primary" href="/">Continue to Kudos Board</Link><p className="auth-helper">A place to notice the good work.</p></section></main><Styles /></div>;

  return <main className="auth-page"><section className="auth-panel" aria-labelledby="login-title"><header className="auth-header"><Brand /><p className="auth-eyebrow">Work account</p></header><div className="auth-content"><h1 id="login-title">Welcome back</h1><p className="auth-intro">Enter your work account details.</p>
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="form-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" value={email} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined} onChange={(event) => { setEmail(event.target.value); setFieldErrors((old) => ({ ...old, email: undefined })); }} /><FieldError id="login-email-error" message={fieldErrors.email} /></div>
      <div className="form-field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" value={password} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined} onChange={(event) => { setPassword(event.target.value); setFieldErrors((old) => ({ ...old, password: undefined })); }} /><FieldError id="login-password-error" message={fieldErrors.password} /></div>
      {formError && <p className="form-message error-message" role="alert" aria-live="assertive">{formError}</p>}<button className="auth-primary" type="submit" disabled={pending}>{pending ? 'Signing you in…' : 'Sign in'}</button>
    </form><p className="auth-switch">New here? <Link href="/register">Create an account</Link></p></div></section><footer className="auth-footer">Kudos Board · Work recognition</footer><Styles /></main>;
}

export function RegisterForm() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  async function loadTeams() {
    setTeamsLoading(true); setTeamsError('');
    try { const result = await apiGet<Team[]>('/teams'); setTeams(Array.isArray(result) ? result : []); }
    catch { setTeamsError("We couldn't load teams. Try again."); setTeams([]); }
    finally { setTeamsLoading(false); }
  }
  useEffect(() => { void loadTeams(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {};
    const invalidEmail = emailError(email);
    if (invalidEmail) errors.email = invalidEmail;
    if (!password) errors.password = 'Enter a password.';
    if (!displayName.trim()) errors.displayName = 'Enter your display name.';
    if (!teamId) errors.teamId = 'Choose a team.';
    setFieldErrors(errors); setFormError('');
    if (teamsLoading || teamsError || teams.length === 0 || Object.keys(errors).length) return;
    setPending(true);
    try { await registerAccount({ email, password, displayName, teamId }); setCreated(true); }
    catch (error) {
      const message = error instanceof Error ? error.message : '';
      const lower = message.toLowerCase();
      setFieldErrors((old) => ({ ...old, ...(lower.includes('email') ? { email: message } : {}), ...(lower.includes('password') ? { password: message } : {}), ...(lower.includes('displayname') || lower.includes('display name') ? { displayName: message } : {}), ...(lower.includes('team') ? { teamId: message } : {}) }));
      setFormError("We couldn't create your account. Check your details and try again.");
    } finally { setPending(false); }
  }

  if (created) return <main className="auth-page"><section className="auth-panel" aria-labelledby="register-success-title"><Brand /><div className="auth-content"><h1 id="register-success-title">Account created</h1><p className="auth-intro">You’re all set. Sign in to start recognizing your team.</p><p className="success-message" role="status" aria-live="polite">Account created. Sign in to continue.</p><div className="member-note"><span>Your account type</span><strong>MEMBER</strong></div><Link className="auth-primary" href="/login">Sign in to continue</Link><p className="auth-helper">New accounts are members.</p></div></section><footer className="auth-footer">A little recognition goes a long way.</footer><Styles /></main>;

  return <main className="auth-page"><section className="auth-panel register-panel" aria-labelledby="register-title"><header className="auth-header"><Brand /></header><div className="auth-content"><h1 id="register-title">Create your account</h1><p className="auth-intro">Choose your team from the list.</p>
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="form-field"><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" value={email} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'register-email-error' : undefined} onChange={(event) => { setEmail(event.target.value); setFieldErrors((old) => ({ ...old, email: undefined })); }} /><FieldError id="register-email-error" message={fieldErrors.email} /></div>
      <div className="form-field"><label htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" autoComplete="new-password" value={password} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'register-password-error' : undefined} onChange={(event) => { setPassword(event.target.value); setFieldErrors((old) => ({ ...old, password: undefined })); }} /><FieldError id="register-password-error" message={fieldErrors.password} /></div>
      <div className="form-field"><label htmlFor="register-display-name">Display name</label><input id="register-display-name" name="displayName" type="text" autoComplete="name" value={displayName} aria-invalid={Boolean(fieldErrors.displayName)} aria-describedby={fieldErrors.displayName ? 'register-display-name-error' : undefined} onChange={(event) => { setDisplayName(event.target.value); setFieldErrors((old) => ({ ...old, displayName: undefined })); }} /><FieldError id="register-display-name-error" message={fieldErrors.displayName} /></div>
      <div className="form-field"><label htmlFor="register-team">Team</label><select id="register-team" name="teamId" value={teamId} disabled={teamsLoading || teams.length === 0} aria-invalid={Boolean(fieldErrors.teamId)} aria-describedby={fieldErrors.teamId ? 'register-team-error' : 'register-team-help'} onChange={(event) => { setTeamId(event.target.value); setFieldErrors((old) => ({ ...old, teamId: undefined })); }}><option value="">Choose an existing team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><span className="field-help" id="register-team-help">Choose your team from the list. New accounts are members.</span><FieldError id="register-team-error" message={fieldErrors.teamId} /></div>
      {teamsLoading && <p className="form-message info-message" role="status" aria-live="polite">Loading teams…</p>}{teamsError && <div className="form-message error-message" role="alert" aria-live="assertive"><p>{teamsError}</p><button type="button" className="retry-link" onClick={() => void loadTeams()}>Try again</button></div>}{!teamsLoading && !teamsError && teams.length === 0 && <p className="form-message info-message" role="status" aria-live="polite">No teams are available yet. Registration needs an existing team. Please contact your administrator.</p>}{formError && <p className="form-message error-message" role="alert" aria-live="assertive">{formError}</p>}
      <button className="auth-primary" type="submit" disabled={pending || teamsLoading || teamsError !== '' || teams.length === 0}>{pending ? 'Creating account…' : 'Create account'}</button>
    </form><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div></section><footer className="auth-footer">A little recognition goes a long way.</footer><Styles /></main>;
}
