import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AppNav from '@/components/AppNav';
import { registerAccount, signIn } from '@/components/AuthForms';
import { apiGet, apiPost } from '@/lib/api';

jest.mock('@/lib/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));

const mockedApiGet = jest.mocked(apiGet);
const mockedApiPost = jest.mocked(apiPost);

it('[AC-3] successful login stores its token and shows signed-in navigation, and registration submits supplied account details and team', async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    } },
  });
  const account = { id: 'member-1', email: 'lee@example.com', displayName: 'Lee Park', role: 'MEMBER' as const, teamId: 'team-1' };
  mockedApiGet.mockImplementation((path) => Promise.resolve((path === '/users/me' ? account : { count: 0 }) as never));
  mockedApiPost.mockImplementation((path) => Promise.resolve((path === '/auth/login' ? { token: 'jwt-test-token' } : {}) as never));

  const user = await signIn('lee@example.com', 'correct-horse');
  expect(user).toEqual({ id: 'member-1', displayName: 'Lee Park', role: 'MEMBER' });
  expect(storage.get('kudos.jwt')).toBe('jwt-test-token');
  expect(mockedApiPost).toHaveBeenCalledWith('/auth/login', { email: 'lee@example.com', password: 'correct-horse' });
  expect(mockedApiGet).toHaveBeenCalledWith('/users/me');

  const navigation = renderToStaticMarkup(createElement(AppNav));
  expect(navigation).toContain('aria-label="Primary navigation"');
  expect(navigation).toContain('Kudos');
  expect(navigation).toContain('Leaderboard');

  mockedApiPost.mockClear();
  await registerAccount({ email: 'new.member@example.com', password: 'new-password', displayName: 'New Member', teamId: 'team-1' });
  expect(mockedApiPost).toHaveBeenCalledWith('/auth/register', {
    email: 'new.member@example.com',
    password: 'new-password',
    displayName: 'New Member',
    teamId: 'team-1',
  });
});
