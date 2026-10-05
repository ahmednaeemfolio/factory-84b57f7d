'use client';

import { useState } from 'react';

export type StatusBannerVariant = 'success' | 'warning' | 'error' | 'info';

export type StatusBannerProps = {
  variant: StatusBannerVariant;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

const variantDetails: Record<StatusBannerVariant, { label: string; icon: string }> = {
  success: { label: 'Success', icon: '✓' },
  warning: { label: 'Warning', icon: '!' },
  error: { label: 'Error', icon: '×' },
  info: { label: 'Information', icon: 'i' },
};

export default function StatusBanner({
  variant,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}: StatusBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const detail = variantDetails[variant];
  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={`status-banner ${variant} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="status-icon" aria-hidden="true">{detail.icon}</span>
      <span className="variant-label">{detail.label}</span>
      <div className="status-message">{children}</div>
      {dismissible && (
        <button className="dismiss" type="button" aria-label="Dismiss message" onClick={dismiss}>
          <span aria-hidden="true">×</span>
        </button>
      )}
      <style jsx>{`
        .status-banner { display: flex; align-items: flex-start; gap: 10px; padding: 13px 15px; border: 1px solid; border-radius: var(--radius-control); font-size: 14px; line-height: 1.5; }
        .success { border-color: #b7d7c5; background: #eff7f2; color: #174e35; }
        .warning { border-color: #e3d1aa; background: #fbf6e9; color: #62410d; }
        .error { border-color: #e6baba; background: #fbefef; color: #852626; }
        .info { border-color: #bfd0de; background: #f0f5f8; color: #294f70; }
        .status-icon { width: 20px; height: 20px; flex: 0 0 20px; display: grid; place-items: center; border: 1px solid currentColor; border-radius: 50%; font-size: 13px; font-weight: 700; line-height: 1; }
        .variant-label { flex: none; font-weight: 650; }
        .status-message { min-width: 0; flex: 1; }
        .dismiss { flex: none; width: 24px; height: 24px; margin: -2px -4px -2px 0; border: 0; border-radius: 5px; background: transparent; color: inherit; font-size: 21px; line-height: 1; cursor: pointer; }
        .dismiss:hover { background: rgba(32,40,39,.08); }
      `}</style>
    </div>
  );
}
