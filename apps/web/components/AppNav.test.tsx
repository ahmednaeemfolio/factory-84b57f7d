import { apiGet, apiPost } from '@/lib/api';
import {
  NotificationsController,
  notificationButtonLabel,
  notificationStatusMessage,
} from './AppNav';

jest.mock('@/lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const mockedApiGet = jest.mocked(apiGet);
const mockedApiPost = jest.mocked(apiPost);

describe('AppNav notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedApiGet.mockReset();
    mockedApiPost.mockReset();
    mockedApiGet.mockResolvedValue({ count: 2 });
    mockedApiPost.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('[AC-22] polls unread count every 30 seconds, displays it, and marks notifications seen when opened', async () => {
    const notifications = new NotificationsController();
    try {
      await notifications.start();
      expect(mockedApiGet).toHaveBeenCalledWith('/notifications/unread-count');
      expect(notificationButtonLabel(notifications.snapshot().unreadCount)).toBe('Notifications, 2 unread');

      await jest.advanceTimersByTimeAsync(30_000);
      expect(mockedApiGet).toHaveBeenCalledTimes(2);

      await notifications.openPanel();
      expect(mockedApiPost).toHaveBeenCalledWith('/notifications/seen');
      expect(notificationStatusMessage(notifications.snapshot().panelState)).toBe('Notifications marked as seen.');
      expect(notificationButtonLabel(notifications.snapshot().unreadCount)).toBe('Notifications, 0 unread');
    } finally {
      notifications.stop();
    }
  });
});
