import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminPage, { AdminWorkspace } from './page';
import { adminReportActions, loadAdminReports, resolveAdminReport } from '@/components/AdminReports';
import TeamManager, { createTeam, loadTeams, renameTeam, validateTeamName } from '@/components/TeamManager';
import { apiGet, apiPost, apiRequest } from '@/lib/api';

jest.mock('@/lib/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiRequest: jest.fn() }));

const mockedApiGet = jest.mocked(apiGet);
const mockedApiPost = jest.mocked(apiPost);
const mockedApiRequest = jest.mocked(apiRequest);

it('[AC-27] gates member access and provides distinct report hide and dismiss resolution controls', async () => {
  const deniedMarkup = renderToStaticMarkup(createElement(AdminWorkspace, { role: 'MEMBER' }));
  expect(deniedMarkup).toContain('Not authorized.');
  expect(deniedMarkup).not.toContain('Open reports');
  expect(deniedMarkup).not.toContain('Create team');

  const adminMarkup = renderToStaticMarkup(createElement(AdminWorkspace, { role: 'ADMIN' }));
  expect(adminMarkup).toContain('Open reports');
  expect(adminMarkup).toContain('Team management');
  expect(adminReportActions).toEqual(['Hide kudos', 'Dismiss report']);

  mockedApiGet.mockResolvedValueOnce([{ id: 'report-1', reason: 'Review requested' }] as never);
  expect(await loadAdminReports()).toEqual([{ id: 'report-1', reason: 'Review requested' }]);
  expect(mockedApiGet).toHaveBeenCalledWith('/admin/reports');

  mockedApiRequest.mockResolvedValue({ id: 'report-1', reason: 'Review requested' } as never);
  await resolveAdminReport('report-1', 'hide');
  expect(mockedApiRequest).toHaveBeenLastCalledWith('/admin/reports/report-1/resolve', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'hide' }),
  });
  await resolveAdminReport('report-1', 'dismiss');
  expect(mockedApiRequest).toHaveBeenLastCalledWith('/admin/reports/report-1/resolve', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'dismiss' }),
  });
});

it('[AC-29] presents create and rename team controls and validates unique 2–40 character names', async () => {
  const markup = renderToStaticMarkup(createElement(TeamManager));
  expect(markup).toContain('Create a team');
  expect(markup).toContain('Create team');
  expect(markup).toContain('Team names must be unique and 2–40 characters.');

  const teams = [{ id: 'team-1', name: 'Engineering' }];
  expect(validateTeamName('X', teams)).toBe('Team names must be 2–40 characters.');
  expect(validateTeamName(' engineering ', teams)).toBe('A team with this name already exists.');
  expect(validateTeamName('Engineering', teams, 'team-1')).toBeNull();
  expect(validateTeamName('Product', teams)).toBeNull();

  mockedApiGet.mockResolvedValueOnce(teams as never);
  expect(await loadTeams()).toEqual(teams);
  expect(mockedApiGet).toHaveBeenCalledWith('/teams');
  mockedApiPost.mockResolvedValue({ id: 'team-2', name: 'Product' } as never);
  await createTeam('Product');
  expect(mockedApiPost).toHaveBeenCalledWith('/teams', { name: 'Product' });
  mockedApiRequest.mockResolvedValue({ id: 'team-1', name: 'Product & Design' } as never);
  await renameTeam('team-1', 'Product & Design');
  expect(mockedApiRequest).toHaveBeenLastCalledWith('/teams/team-1', {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Product & Design' }),
  });
});
