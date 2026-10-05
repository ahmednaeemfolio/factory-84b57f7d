import { renderToStaticMarkup } from 'react-dom/server';
import ReactionControl from '@/components/ReactionControl';
import CommentList, { createKudosComment } from '@/components/CommentList';
import ReportDialog, { submitKudosReport } from '@/components/ReportDialog';
import { apiGet, apiPost, apiRequest } from '@/lib/api';
import { supportedReactionTypes, toggleKudosReaction } from './kudos/[id]/page';

jest.mock('@/lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiRequest: jest.fn(),
}));

const mockedApiGet = jest.mocked(apiGet);
const mockedApiPost = jest.mocked(apiPost);
const mockedApiRequest = jest.mocked(apiRequest);

beforeEach(() => {
  jest.clearAllMocks();
  mockedApiGet.mockResolvedValue({ count: 0 } as never);
  mockedApiPost.mockResolvedValue({ id: 'created', body: 'A useful comment', createdAt: '2025-03-06T16:00:00.000Z' } as never);
  mockedApiRequest.mockResolvedValue({ reactionType: 'clap', myReaction: 'clap', active: true, reactions: [] } as never);
});

it('[AC-15] displays detail, flat comments and supported reactions and submits a comment and reaction', async () => {
  const kudos = {
    id: 'kudos-42',
    message: 'Thank you for helping the team.',
    companyValue: 'Value returned by the API',
    sender: { id: 'sender-1', displayName: 'Alex Rivera' },
    recipients: [{ recipient: { id: 'member-2', displayName: 'Maya Chen' } }],
    supportedReactions: [{ type: 'clap', label: 'Clap' }],
    reactions: [{ id: 'reaction-1', userId: 'member-3', reactionType: 'clap' }],
    comments: [{ id: 'comment-1', body: 'Wonderful work!', createdAt: '2025-03-06T15:00:00.000Z', author: { displayName: 'Jordan Taylor' } }],
  };
  expect(supportedReactionTypes(kudos)).toEqual([{ type: 'clap', label: 'Clap' }]);

  const commentsMarkup = renderToStaticMarkup(<CommentList kudosId="kudos-42" comments={kudos.comments} />);
  const reactionsMarkup = renderToStaticMarkup(<ReactionControl reactions={[{ type: 'clap', label: 'Clap', count: 1 }]} />);
  expect(commentsMarkup).toContain('Comments in chronological order');
  expect(commentsMarkup).toContain('Wonderful work!');
  expect(commentsMarkup).toContain('maxLength="300"');
  expect(reactionsMarkup).toContain('aria-label="Clap, 1 reaction"');
  expect(reactionsMarkup).toContain('aria-pressed="false"');

  await createKudosComment('kudos-42', 'A useful comment');
  expect(mockedApiPost).toHaveBeenCalledWith('/kudos/kudos-42/comments', { body: 'A useful comment' });
  await toggleKudosReaction('kudos-42', 'clap');
  expect(mockedApiRequest).toHaveBeenCalledWith('/kudos/kudos-42/reaction', {
    method: 'PUT',
    body: JSON.stringify({ reactionType: 'clap' }),
  });
});

it('[AC-24] exposes an accessible reason dialog and submits the report reason once', async () => {
  const markup = renderToStaticMarkup(<ReportDialog kudosId="kudos-42" open onClose={() => undefined} />);
  expect(markup).toContain('role="dialog"');
  expect(markup).toContain('aria-labelledby="report-title"');
  expect(markup).toContain('for="report-reason"');
  expect(markup).toContain('Reason for report');
  expect(markup).toContain('maxLength="200"');
  expect(markup).toContain('Duplicate reports aren’t accepted.');

  await submitKudosReport('kudos-42', 'This needs a moderator review.');
  expect(mockedApiPost).toHaveBeenCalledWith('/kudos/kudos-42/reports', { reason: 'This needs a moderator review.' });
});
