'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { AuthNav } from '@/components/nav/AuthNav';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sellerProfile?: { legalName: string | null; kycStatus: string } | null;
  buyerProfile?: { legalName: string | null } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function fetchUsers(q = '') {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    fetchUsers(search);
  }

  async function handleBan(userId: string, email: string) {
    if (!confirm(`Ban ${email}? They will not be able to log in.`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to ban user');
      setMessage(`User ${email} banned`);
      fetchUsers(search);
    } catch {
      setMessage('Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspend(userId: string, email: string) {
    if (!confirm(`Suspend ${email}? They will not be able to log in until unsuspended.`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to suspend user');
      setMessage(`User ${email} suspended`);
      fetchUsers(search);
    } catch {
      setMessage('Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  }

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
            <span className="text-bone-vellum">Users</span>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="font-mono text-3xl font-bold tracking-tight !text-lime-surveyor">Users</h1>
            <LimeButton href="/admin/users/new-staff">+ New staff</LimeButton>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-6 flex gap-4 max-w-md">
            <Input
              label="Search by email"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buyer@ccverse.local"
            />
            <div className="flex items-end">
              <GhostButton type="submit">Search</GhostButton>
            </div>
          </form>

          {message && (
            <p className="mt-4 font-jetbrains-mono text-[13px] text-lime-surveyor">{message}</p>
          )}

          {/* Table */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-iron-filings">
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Email
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Role
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Status
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Verified
                  </th>
                  <th className="py-3 pr-4 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    KYC
                  </th>
                  <th className="py-3 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-drift-ash">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-drift-ash">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-iron-filings">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-nb-international-pro text-[14px] text-bone-vellum hover:text-lime-surveyor !no-underline"
                        >
                          {user.email}
                        </Link>
                        {user.sellerProfile?.legalName && (
                          <div className="text-[12px] text-drift-ash">{user.sellerProfile.legalName}</div>
                        )}
                        {user.buyerProfile?.legalName && (
                          <div className="text-[12px] text-drift-ash">{user.buyerProfile.legalName}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {user.role}
                      </td>
                      <td className={`py-3 pr-4 font-jetbrains-mono text-[13px] ${statusColor[user.status] ?? 'text-bone-vellum'}`}>
                        {user.status.replace('_', ' ')}
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {user.emailVerified ? 'Yes' : 'No'}
                      </td>
                      <td className="py-3 pr-4 font-jetbrains-mono text-[13px] text-bone-vellum">
                        {user.sellerProfile?.kycStatus ?? '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-lime-surveyor hover:text-lime/80 !no-underline"
                          >
                            View
                          </Link>
                          {user.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => handleSuspend(user.id, user.email)}
                                disabled={actionLoading === user.id}
                                className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash hover:text-lime-surveyor disabled:opacity-50"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleBan(user.id, user.email)}
                                disabled={actionLoading === user.id}
                                className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash hover:text-lime-surveyor disabled:opacity-50"
                              >
                                Ban
                              </button>
                            </>
                          )}
                          {user.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleSuspend(user.id, user.email)}
                              disabled={actionLoading === user.id}
                              className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash hover:text-lime-surveyor disabled:opacity-50"
                            >
                              Unsuspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}