import { apiPost } from '@/lib/api';
import { buildFeedQuery, emptyFeedFilters } from '@/components/FeedFilters';
import { submitKudosDraft } from '@/components/KudosComposer';

jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));

const mockedApiPost = jest.mocked(apiPost);

beforeEach(() => mockedApiPost.mockReset());

it('[AC-5] rejects invalid recipients and message inputs before the submission request', async () => {
  const validValueOptions = ['Known value from API'];
  const invalidDrafts = [
    { recipientIds: [], message: 'Hello', companyValue: validValueOptions[0] },
    { recipientIds: ['member-2', 'member-2'], message: 'Hello', companyValue: validValueOptions[0] },
    { recipientIds: ['sender-1'], message: 'Hello', companyValue: validValueOptions[0] },
    { recipientIds: ['member-2'], message: '', companyValue: validValueOptions[0] },
    { recipientIds: ['member-2'], message: 'x'.repeat(501), companyValue: validValueOptions[0] },
  ];

  for (const draft of invalidDrafts) {
    const result = await submitKudosDraft(draft, 'sender-1', validValueOptions);
    expect(result.submitted).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  }
  expect(mockedApiPost).not.toHaveBeenCalled();
});

it('[AC-7] submits selected recipients, a message, and a supported company value', async () => {
  mockedApiPost.mockResolvedValue(undefined);
  const draft = {
    recipientIds: ['colleague-2', 'colleague-3'],
    message: 'Thank you for your thoughtful collaboration.',
    companyValue: 'Supported value returned by the feed',
  };
  const result = await submitKudosDraft(draft, 'sender-1', ['Supported value returned by the feed']);

  expect(result).toEqual({ errors: {}, submitted: true });
  expect(mockedApiPost).toHaveBeenCalledTimes(1);
  expect(mockedApiPost).toHaveBeenCalledWith('/kudos', draft);
});

it('[AC-11] includes recipient team, company value, and recipient together in the feed query', () => {
  const filters = {
    ...emptyFeedFilters,
    recipientTeamId: 'team-4',
    companyValue: 'API-supported-value',
    recipientId: 'person-9',
  };
  const query = new URLSearchParams(buildFeedQuery(filters).slice(1));

  expect(Object.fromEntries(query.entries())).toEqual({
    recipientTeamId: 'team-4',
    companyValue: 'API-supported-value',
    recipientId: 'person-9',
  });
});
