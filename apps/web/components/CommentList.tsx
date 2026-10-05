'use client';

import { useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';

export type KudosComment = {
  id: string;
  body: string;
  createdAt: string;
  author?: { id?: string; displayName?: string } | null;
  authorId?: string;
};

type CommentListProps = {
  kudosId: string;
  comments: KudosComment[];
  currentUserName?: string;
};

export function createKudosComment(kudosId: string, body: string): Promise<KudosComment> {
  return apiPost<KudosComment>(`/kudos/${encodeURIComponent(kudosId)}/comments`, { body });
}

export default function CommentList({ kudosId, comments: initialComments, currentUserName = 'You' }: CommentListProps) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (value.length < 1 || value.length > 300) {
      setError('Enter a comment between 1 and 300 characters.');
      setStatus('');
      return;
    }
    setError('');
    setStatus('');
    setSubmitting(true);
    try {
      const created = await createKudosComment(kudosId, value);
      const comment: KudosComment = {
        ...created,
        body: created?.body ?? value,
        createdAt: created?.createdAt ?? new Date().toISOString(),
        author: created?.author ?? { displayName: currentUserName },
      };
      setComments((current) => [...current, comment].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
      setBody('');
      setStatus('Comment added.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to add your comment. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <div className="section-heading">
        <h2 id="comments-title">Comments</h2>
        <span className="comment-count">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
      </div>
      {comments.length ? (
        <div className="comment-list" aria-label="Comments in chronological order">
          {comments.map((comment) => (
            <article className="comment" key={comment.id}>
              <span className="comment-avatar" aria-hidden="true">{(comment.author?.displayName ?? 'C').slice(0, 2).toUpperCase()}</span>
              <div className="comment-content">
                <p className="comment-meta">
                  <span className="comment-name">{comment.author?.displayName ?? 'Colleague'}</span>
                  <time className="comment-time" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                </p>
                <p className="comment-text">{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="empty-comments">No comments yet. Start the conversation.</p>}

      <form className="composer" aria-label="Add a comment" onSubmit={submitComment}>
        <label className="composer-label" htmlFor="kudos-comment">Add a comment</label>
        <textarea
          className="textarea"
          id="kudos-comment"
          name="comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={300}
          aria-describedby="comment-help comment-limit comment-error"
          aria-invalid={Boolean(error)}
          placeholder="Write a comment…"
        />
        <div className="composer-foot">
          <span className="helper" id="comment-help">Comments are visible with this kudos.</span>
          <span className="helper" id="comment-limit">{body.length}/300 characters</span>
          <button className="primary-button" type="submit" disabled={submitting || body.trim().length < 1 || body.trim().length > 300}>
            {submitting ? 'Adding…' : 'Add comment'}
          </button>
        </div>
        <p id="comment-error" className="form-error" role={error ? 'alert' : undefined}>{error}</p>
        <p className="form-success" role={status ? 'status' : undefined}>{status}</p>
      </form>
      <style jsx>{`
        .section-heading { display:flex; justify-content:space-between; align-items:baseline; margin: 0 0 12px; }
        h2 { margin:0; font-size:20px; line-height:28px; font-weight:620; }
        .comment-count,.comment-time,.helper { color:var(--color-quiet-ink); font-size:12px; }
        .comment-list,.empty-comments { background:var(--color-surface); border:1px solid var(--color-line); border-radius:var(--radius-card); }
        .empty-comments { margin:0; padding:18px; color:var(--color-quiet-ink); }
        .comment { display:flex; gap:12px; padding:16px 18px; }
        .comment + .comment { border-top:1px solid var(--color-line); }
        .comment-avatar { width:34px; height:34px; flex:none; display:grid; place-items:center; border-radius:50%; background:var(--color-brand-soft); color:var(--color-brand); font-size:11px; font-weight:650; }
        .comment-content { min-width:0; flex:1; }
        .comment-meta { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin:0 0 4px; }
        .comment-name { font-size:13px; font-weight:650; }
        .comment-text { margin:0; color:var(--color-ink); font-size:14px; white-space:pre-wrap; overflow-wrap:anywhere; }
        .composer { margin-top:16px; padding:18px; background:var(--color-surface); border:1px solid var(--color-line); border-radius:var(--radius-card); }
        .composer-label { display:block; margin-bottom:8px; font-size:14px; font-weight:600; }
        .textarea { display:block; width:100%; min-height:84px; padding:11px 12px; resize:vertical; color:var(--color-ink); background:#FCFDFC; border:1px solid var(--color-line); border-radius:var(--radius-control); font:inherit; font-size:14px; }
        .textarea:focus-visible,button:focus-visible { outline:3px solid rgba(23,107,99,.32); outline-offset:2px; }
        .composer-foot { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; }
        .primary-button { min-height:40px; padding:0 16px; color:white; background:var(--color-brand); border:1px solid var(--color-brand); border-radius:var(--radius-control); font-size:14px; font-weight:600; cursor:pointer; }
        .primary-button:disabled { opacity:.58; cursor:not-allowed; }
        .form-error,.form-success { margin:8px 0 0; font-size:13px; }
        .form-error { color:var(--color-danger); }
        .form-success { color:#236747; }
        @media(max-width:520px) { .composer { padding:14px; } .composer-foot { align-items:flex-start; flex-direction:column; } .primary-button { align-self:flex-end; } }
      `}</style>
    </section>
  );
}
