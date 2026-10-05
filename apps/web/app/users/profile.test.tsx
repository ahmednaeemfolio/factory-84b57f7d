import { apiGet } from '@/lib/api';
import { loadUserProfile, visibleRecentKudos, type UserProfile } from './[id]/page';

jest.mock('@/lib/api', () => ({ apiGet: jest.fn() }));

const mockedApiGet = jest.mocked(apiGet);

it('[AC-20] loads a colleague profile with API-provided values and excludes hidden kudos from recent content', async () => {
  const response: UserProfile = {
    id: 'colleague-12',
    displayName: 'Maya Chen',
    team: { id: 'team-3', name: 'Product & Design' },
    receivedTotal: 2,
    sentTotal: 5,
    receivedByValue: [{ companyValue: 'API supplied value label', count: 2 }],
    recentKudos: [
      {
        id: 'visible-2',
        message: 'Great work on the launch.',
        companyValue: 'API supplied value label',
        createdAt: '2025-04-02T12:00:00.000Z',
        sender: { id: 'sender-1', displayName: 'Alex Rivera' },
      },
      {
        id: 'hidden-1',
        message: 'This recognition is hidden.',
        companyValue: 'API supplied value label',
        createdAt: '2025-04-01T12:00:00.000Z',
        isHidden: true,
        sender: { id: 'sender-2', displayName: 'Jordan Lee' },
      },
    ],
  };
  mockedApiGet.mockResolvedValue(response);

  const profile = await loadUserProfile('colleague-12');
  expect(mockedApiGet).toHaveBeenCalledWith('/users/colleague-12');
  expect(profile.displayName).toBe('Maya Chen');
  expect(profile.team?.name).toBe('Product & Design');
  expect(profile.receivedTotal).toBe(2);
  expect(profile.sentTotal).toBe(5);
  expect(profile.receivedByValue).toEqual([{ companyValue: 'API supplied value label', count: 2 }]);
  expect(visibleRecentKudos(profile).map(({ id }) => id)).toEqual(['visible-2']);
});
