'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { AuthNav } from '@/components/nav/AuthNav';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  sellerProfile?: {
    legalName: string | null;
    kycStatus: string;
    country: string | null;
    authorizedSignatoryName: string | null;
    authorizedSignatoryEmail: string | null;
    registrationNo: string | null;
  } | null;
  buyerProfile?: {
    legalName: string | null;
    country: string | null;
    defaultCurrency: string;
  } | null;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState('');
  const [editingStatus, setEditingStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        // The API returns { user } — extract it
        const data = await res.json();
        setUser(data.user);
        setEditingRole(data.user.role);
        setEditingStatus(data.user.status);
      } catch {
        router.push('/admin/users');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editingRole !== user.role ? editingRole : undefined,
          status: editingStatus !== user.status ? editingStatus : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((u) => u ? { ...u, role: editingRole, status: editingStatus } : u);
      setMessage('Changes saved');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <AuthNav />
        <main className="min-h-screen bg-obsidian-loam pt-[80px]">
          <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)] text-drift-ash">
            Loading…
          </div>
        </main>
      </>
    );
  }

  if (!user) return null;

  const statusColor: Record<string, string> = {
    ACTIVE: 'text-marsh-olive',
    SUSPENDED: 'text-lime-surveyor',
    BANNED: 'text-drift-ash',
    PENDING_VERIFICATION: 'text-drift-ash',
  };

  return (
    <>
      <AuthNav />
      <main className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 font-jetbrains-mono text-[13px] text-drift-ash">
            <Link href="/admin" className="!text-lime-surveyor !no-underline hover:text-lime/80">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/users" className="!text-lime-surveyor !no-underline hover:text-lime/80">
              Users
            </Link>
            <span>/</span>
            <span className="text-bone-vellum">{user.email}</span>
          </div>

          <h1 className="font-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
            {user.email}
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Role & Status edit */}
            <form onSubmit={handleSave} className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8">
              <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                Account status
              </h2>

              <div className="flex flex-col gap-[var(--spacing-7)]">
                <label className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                  Role
                </label>
                <div className="flex gap-4">
                  {(['BUYER', 'SELLER', 'AUDITOR', 'ADMIN'] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={editingRole === r}
                        onChange={() => setEditingRole(r)}
                        className="accent-lime-surveyor"
                      />
                      <span className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                        {r}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-[var(--spacing-7)]">
                <label className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                  Status
                </label>
                <div className="flex gap-4">
                  {(['ACTIVE', 'SUSPENDED', 'BANNED'] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={editingStatus === s}
                        onChange={() => setEditingStatus(s)}
                        className="accent-lime-surveyor"
                      />
                      <span className={`font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] ${statusColor[s]}`}>
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {message && (
                <p className="font-jetbrains-mono text-[13px] text-lime-surveyor">{message}</p>
              )}

              <LimeButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </LimeButton>
            </form>

            {/* User details */}
            <div className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8">
              <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                Details
              </h2>
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="Status" value={user.status} valueClass={statusColor[user.status]} />
              <DetailRow label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
              {user.emailVerifiedAt && (
                <DetailRow label="Verified at" value={new Date(user.emailVerifiedAt).toLocaleString()} />
              )}
              <DetailRow label="Created" value={new Date(user.createdAt).toLocaleString()} />
              {user.lastLoginAt && (
                <DetailRow label="Last login" value={new Date(user.lastLoginAt).toLocaleString()} />
              )}

              {user.sellerProfile && (
                <>
                  <hr className="border-iron-filings" />
                  <DetailRow label="Legal name" value={user.sellerProfile.legalName ?? '—'} />
                  <DetailRow label="Country" value={user.sellerProfile.country ?? '—'} />
                  <DetailRow label="KYC status" value={user.sellerProfile.kycStatus} />
                  <DetailRow label="Registration no." value={user.sellerProfile.registrationNo ?? '—'} />
                  <DetailRow
                    label="Signatory"
                    value={
                      user.sellerProfile.authorizedSignatoryName
                        ? `${user.sellerProfile.authorizedSignatoryName} (${user.sellerProfile.authorizedSignatoryEmail})`
                        : '—'
                    }
                  />
                </>
              )}

              {user.buyerProfile && (
                <>
                  <hr className="border-iron-filings" />
                  <DetailRow label="Legal name" value={user.buyerProfile.legalName ?? '—'} />
                  <DetailRow label="Country" value={user.buyerProfile.country ?? '—'} />
                  <DetailRow label="Currency" value={user.buyerProfile.defaultCurrency} />
                </>
              )}
            </div>
          </div>

          <div className="mt-8">
            <GhostButton href="/admin/users">← Back to users</GhostButton>
          </div>
        </div>
      </main>
    </>
  );
}

function DetailRow({
  label,
  value,
  valueClass = 'text-bone-vellum',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
        {label}
      </span>
      <span className={`font-nb-international-pro text-[14px] ${valueClass}`}>{value}</span>
    </div>
  );
}