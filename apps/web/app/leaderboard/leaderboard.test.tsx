import { renderToStaticMarkup } from 'react-dom/server';
import { apiGet } from '@/lib/api';
import LeaderboardPage, { currentUtcMonth, loadLeaderboard } from './page';

jest.mock('@/lib/api', () => ({ apiGet: jest.fn() }));

const mockedApiGet = jest.mocked(apiGet);

it('[AC-18] defaults to the current UTC month and loads API-ranked recipients for a selected month', async () => {
  const utcDate = new Date('2025-01-01T00:30:00+02:00');
  expect(currentUtcMonth(utcDate)).toBe('2024-12');

  const initialMarkup = renderToStaticMarkup(<LeaderboardPage />);
  expect(initialMarkup).toContain('aria-label="Select leaderboard month"');
  expect(initialMarkup).toContain('type="month"');
  expect(initialMarkup).toContain('Loading leaderboard');

  const apiResult = {
    month: '2024-08',
    leaderboard: [{
      recipientId: 'person-7',
      displayName: 'Maya Chen',
      totalKudos: 3,
      countsByValue: { 'API value label': 3 },
    }],
  };
  mockedApiGet.mockResolvedValue(apiResult);
  const result = await loadLeaderboard('2024-08');

  expect(mockedApiGet).toHaveBeenCalledWith('/leaderboard?month=2024-08');
  expect(result.leaderboard[0]).toEqual(expect.objectContaining({
    recipientId: 'person-7',
    displayName: 'Maya Chen',
    totalKudos: 3,
    countsByValue: { 'API value label': 3 },
  }));
});
