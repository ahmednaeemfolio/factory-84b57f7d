'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getSessionUser, type SessionUser } from '@/lib/session';

type PanelState = 'closed' | 'loading' | 'empty' | 'seen' | 'error';
type NotificationSnapshot = { unreadCount: number; panelState: PanelState };

/** The same accessible label is used by the control and the offline unit test. */
export function notificationButtonLabel(count: number): string {
  return `Notifications, ${count} unread`;
}

export function notificationStatusMessage(state: PanelState): string | null {
  if (state === 'loading') return 'Marking notifications as seen…';
  if (state === 'empty') return 'You’re all caught up. No unread notifications.';
  if (state === 'seen') return 'Notifications marked as seen.';
  if (state === 'error') return 'Notifications couldn’t be marked as seen. Try again.';
  return null;
}

/** Polling and opening behavior is kept independent of browser APIs for reliable offline tests. */
export class NotificationsController {
  private unreadCount = 0;
  private panelState: PanelState = 'closed';
  private interval: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<(snapshot: NotificationSnapshot) => void>();

  snapshot(): NotificationSnapshot {
    return { unreadCount: this.unreadCount, panelState: this.panelState };
  }

  subscribe(listener: (snapshot: NotificationSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private publish(): void {
    const next = this.snapshot();
    this.listeners.forEach((listener) => listener(next));
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const result = await apiGet<{ count: number }>('/notifications/unread-count');
      this.unreadCount = Number.isFinite(result.count) ? Math.max(0, result.count) : 0;
      this.publish();
    } catch {
      // Preserve the last known count; opening the panel offers a retryable error state.
    }
  }

  start(): Promise<void> {
    if (this.interval === undefined) {
      this.interval = setInterval(() => void this.refreshUnreadCount(), 30_000);
    }
    return this.refreshUnreadCount();
  }

  stop(): void {
    if (this.interval !== undefined) clearInterval(this.interval);
    this.interval = undefined;
  }

  closePanel(): void {
    this.panelState = 'closed';
    this.publish();
  }

  async openPanel(): Promise<void> {
    const unreadBeforeOpen = this.unreadCount;
    this.panelState = 'loading';
    this.publish();
    try {
      await apiPost('/notifications/seen');
      this.unreadCount = 0;
      this.panelState = unreadBeforeOpen > 0 ? 'seen' : 'empty';
    } catch {
      this.panelState = 'error';
    }
    this.publish();
  }

  retryMarkSeen(): Promise<void> {
    return this.openPanel();
  }
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

export default function AppNav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [pathname, setPathname] = useState('/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications] = useState(() => new NotificationsController());
  const [notificationState, setNotificationState] = useState(() => notifications.snapshot());

  useEffect(() => {
    setUser(getSessionUser());
    setPathname(window.location.pathname);
    const updatePath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  useEffect(() => {
    const unsubscribe = notifications.subscribe(setNotificationState);
    void notifications.start();
    return () => {
      unsubscribe();
      notifications.stop();
    };
  }, [notifications]);

  const isAdmin = user?.role === 'ADMIN';
  const profileHref = user?.id ? `/users/${encodeURIComponent(user.id)}` : '/login';
  const navItems = [
    { label: 'Kudos', href: '/' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'My profile', href: profileHref },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin' }] : []),
  ];
  const routeIsActive = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  const statusMessage = notificationStatusMessage(notificationState.panelState);

  const toggleNotifications = () => {
    if (notificationState.panelState !== 'closed') notifications.closePanel();
    else void notifications.openPanel();
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Kudos Board home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>Kudos Board</span>
        </Link>
        <button
          className="mobile-menu"
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <nav id="primary-navigation" className={`primary-nav${mobileOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${routeIsActive(item.href) ? ' active' : ''}`}
              href={item.href}
              aria-current={routeIsActive(item.href) ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className="notification-wrap">
            <button
              className="notification-button"
              type="button"
              aria-label={notificationButtonLabel(notificationState.unreadCount)}
              aria-expanded={notificationState.panelState !== 'closed'}
              aria-controls="notifications-panel"
              onClick={toggleNotifications}
            >
              <span aria-hidden="true">♧</span>
              {notificationState.unreadCount > 0 && <span className="unread-badge" aria-hidden="true">{notificationState.unreadCount > 99 ? '99+' : notificationState.unreadCount}</span>}
            </button>
            {notificationState.panelState !== 'closed' && (
              <section id="notifications-panel" className="notification-panel" aria-labelledby="notifications-title">
                <h2 id="notifications-title">Notifications</h2>
                {notificationState.panelState === 'error' ? (
                  <>
                    <p role="alert">{statusMessage}</p>
                    <button className="panel-retry" type="button" onClick={() => void notifications.retryMarkSeen()}>Try again</button>
                  </>
                ) : statusMessage && <p role="status">{statusMessage}</p>}
              </section>
            )}
          </div>
          <Link className="profile-button" href={profileHref} aria-label={user ? `Profile for ${user.displayName}` : 'Your profile'}>
            <span className="profile-avatar" aria-hidden="true">{user ? initials(user.displayName) : '?'}</span>
            <span className="profile-name">{user?.displayName ?? 'Profile'}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
