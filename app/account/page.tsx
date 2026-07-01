'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthNav } from '@/components/nav/AuthNav';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  buyerProfile?: {
    legalName: string | null;
    country: string | null;
    defaultCurrency: string;
    kycStatus: string;
  } | null;
  sellerProfile?: {
    legalName: string | null;
    country: string | null;
    kycStatus: string;
    bankAccount?: {
      bankName: string;
      accountNoLast4: string;
      verified: boolean;
    } | null;
  } | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) throw new Error('Not authorized');
        const data = await res.json();
        setProfile(data.user);
        setLegalName(data.user.buyerProfile?.legalName ?? data.user.sellerProfile?.legalName ?? '');
        setCountry(data.user.buyerProfile?.country ?? data.user.sellerProfile?.country ?? '');
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh profile to get updated kycStatus
      const refreshed = await fetch('/api/me');
      const refreshedData = await refreshed.json();
      setProfile(refreshedData.user);

      setMessage(
        'Profile updated' +
          (data.kycStatus === 'EXPIRED' ? ' — KYC status set to expired due to name change.' : ''),
      );
      setEditing(false);
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
        <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
          <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)] text-drift-ash">
            Loading…
          </div>
        </main>
      </>
    );
  }

  if (!profile) return null;

  const kycStatusColor: Record<string, string> = {
    APPROVED: 'text-marsh-olive',
    PENDING: 'text-lime-surveyor',
    REJECTED: 'text-drift-ash',
    NOT_STARTED: 'text-drift-ash',
    NOT_REQUIRED: 'text-marsh-olive',
    EXPIRED: 'text-lime-surveyor',
  };

  return (
    <>
      <AuthNav role={profile.role} />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          <h1 className="font-jetbrains-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
            Account
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Profile form */}
            <div className="lg:col-span-2 rounded-md border border-iron-filings bg-[#141414] p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                  Profile
                </h2>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-lime-surveyor hover:text-marsh-olive"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleSave} className="mt-6 space-y-6">
                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    disabled
                    hint="Email cannot be changed."
                  />
                  <Input
                    label="Legal name"
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Your organisation name"
                  />
                  <Input
                    label="Country (2-letter code)"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="IN"
                    maxLength={2}
                  />

                  {message && (
                    <p className="font-jetbrains-mono text-[13px] text-lime-surveyor">{message}</p>
                  )}

                  <div className="flex gap-4">
                    <LimeButton type="submit" disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </LimeButton>
                    <GhostButton
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setMessage('');
                      }}
                    >
                      Cancel
                    </GhostButton>
                  </div>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <ProfileRow label="Email" value={profile.email} />
                  <ProfileRow label="Role" value={profile.role} />
                  <ProfileRow
                    label="Status"
                    value={profile.status}
                    valueClass={kycStatusColor[profile.status] ?? 'text-bone-vellum'}
                  />
                  <ProfileRow
                    label="Legal name"
                    value={
                      profile.buyerProfile?.legalName ?? profile.sellerProfile?.legalName ?? '—'
                    }
                  />
                  <ProfileRow
                    label="Country"
                    value={profile.buyerProfile?.country ?? profile.sellerProfile?.country ?? '—'}
                  />
                  {profile.buyerProfile && (
                    <ProfileRow label="Currency" value={profile.buyerProfile.defaultCurrency} />
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* KYC status (sellers) */}
              {profile.role === 'SELLER' && profile.sellerProfile && (
                <div className="rounded-md border border-iron-filings bg-[#141414] p-8">
                  <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                    KYC Status
                  </h2>
                  <p
                    className={`mt-2 font-jetbrains-mono text-[13px] ${kycStatusColor[profile.sellerProfile.kycStatus]}`}
                  >
                    {profile.sellerProfile.kycStatus.replace('_', ' ')}
                  </p>
                  {profile.sellerProfile.kycStatus !== 'APPROVED' && (
                    <p className="mt-2 text-[13px] text-drift-ash">
                      Complete KYC verification to list credits.
                    </p>
                  )}
                  {profile.sellerProfile.bankAccount && (
                    <div className="mt-4">
                      <ProfileRow
                        label="Bank"
                        value={`${profile.sellerProfile.bankAccount.bankName} (••••${profile.sellerProfile.bankAccount.accountNoLast4})`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Quick links */}
              <div className="rounded-md border border-iron-filings bg-[#141414] p-8">
                <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                  Security
                </h2>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/account/security"
                    className="block font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum hover:text-lime-surveyor !no-underline"
                  >
                    Change password →
                  </Link>
                </div>
              </div>

              {/* Account info */}
              <div className="rounded-md border border-iron-filings bg-[#141414] p-8">
                <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                  Account info
                </h2>
                <div className="mt-4 space-y-3">
                  <ProfileRow
                    label="Member since"
                    value={new Date(profile.createdAt).toLocaleDateString()}
                  />
                  {profile.lastLoginAt && (
                    <ProfileRow
                      label="Last login"
                      value={new Date(profile.lastLoginAt).toLocaleString()}
                    />
                  )}
                  <ProfileRow label="Email verified" value={profile.emailVerified ? 'Yes' : 'No'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ProfileRow({
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
