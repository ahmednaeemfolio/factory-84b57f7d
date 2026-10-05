import type { ReactNode } from 'react';
import AppNav from '@/components/AppNav';

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
