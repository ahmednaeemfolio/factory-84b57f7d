'use client';

import { useEffect, useState } from 'react';
import AdminReports from '@/components/AdminReports';
import AppNav from '@/components/AppNav';
import TeamManager from '@/components/TeamManager';
import { getSessionUser, type UserRole } from '@/lib/session';

export function AdminWorkspace({ role }: { role: UserRole }) {
  if (role !== 'ADMIN') {
    return <main className="admin-denied">Not authorized.</main>;
  }

  return (
    <main className="admin-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1>Admin</h1>
          <p className="intro">Review reported kudos and keep your teams up to date.</p>
        </div>
        <p className="access-status" role="status">Admin access confirmed · protected tools available</p>
      </header>
      <div className="admin-grid">
        <AdminReports />
        <TeamManager />
      </div>
      <style jsx>{`
        .admin-page { width:min(1248px,calc(100% - 64px)); padding:36px 0 64px; margin:0 auto; }
        .page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:24px; }
        .eyebrow { margin:0 0 5px; color:var(--color-quiet-ink); font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
        h1 { margin:0 0 5px; font-size:26px; line-height:34px; font-weight:650; }
        .intro { margin:0; color:var(--color-quiet-ink); font-size:14px; }
        .access-status { margin:0; padding:10px 13px; border:1px solid #c9ddd3; border-radius:var(--radius-control); background:#f1f7f3; color:#285c43; font-size:13px; }
        .admin-grid { display:grid; grid-template-columns:minmax(0,1.85fr) minmax(300px,.95fr); align-items:start; gap:24px; }
        .admin-denied { width: min(1040px, calc(100% - 64px)); margin:0 auto; padding:40px 0; }
        @media(max-width:900px) { .admin-grid { grid-template-columns:minmax(0,1.5fr) minmax(270px,.9fr); gap:16px; } }
        @media(max-width:700px) { .admin-page { width:calc(100% - 36px); padding:28px 0 48px; } .admin-grid { grid-template-columns:1fr; } .page-heading { align-items:flex-start; flex-direction:column; gap:14px; } }
        @media(max-width:430px) { .admin-page { width:calc(100% - 28px); padding-top:23px; } }
      `}</style>
    </main>
  );
}

export default function AdminPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setRole(getSessionUser()?.role ?? null);
    setChecked(true);
  }, []);

  if (!checked) return <main className="admin-loading" role="status">Checking authorization…</main>;
  if (role !== 'ADMIN') return <main className="admin-denied">Not authorized.</main>;
  return <><AppNav /><AdminWorkspace role={role} /></>;
}
