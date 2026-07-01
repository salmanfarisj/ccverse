'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthNav } from '@/components/nav/AuthNav';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

interface KycDocument {
  id: string;
  documentType: string;
  s3Key: string | null;
  sha256: string | null;
  uploadedAt: string;
  reviewStatus: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  uploadedByUser: { email: string } | null;
}

interface BankAccount {
  accountHolder: string;
  bankName: string;
  accountNoLast4: string;
  routingOrIfsc: string;
  verified: boolean;
}

interface SellerProfile {
  userId: string;
  legalName: string | null;
  registrationNo: string | null;
  country: string | null;
  authorizedSignatoryName: string | null;
  authorizedSignatoryEmail: string | null;
  kycStatus: string;
  kycReviewNotes: string | null;
  kycReviewedAt: string | null;
  kycReviewedBy: string | null;
  bankAccount: BankAccount | null;
  kycDocuments: KycDocument[];
  user: {
    id: string;
    email: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
}

export default function KycReviewPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [fetchingUrls, setFetchingUrls] = useState<Record<string, boolean>>({});

  // Reject form
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/kyc/${params.userId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setProfile(data.profile);
      } catch {
        router.push('/admin/kyc');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.userId, router]);

  async function fetchDocUrl(docId: string) {
    if (docUrls[docId]) return;
    setFetchingUrls((prev) => ({ ...prev, [docId]: true }));
    try {
      const res = await fetch(`/api/admin/kyc/${params.userId}/documents/${docId}/url`);
      if (!res.ok) throw new Error('Failed to get URL');
      const data = await res.json();
      setDocUrls((prev) => ({ ...prev, [docId]: data.url }));
    } catch {
      // silently fail
    } finally {
      setFetchingUrls((prev) => ({ ...prev, [docId]: false }));
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this KYC application?')) return;
    setActionSuccess('');
    try {
      const res = await fetch(`/api/admin/kyc/${params.userId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionSuccess('KYC approved. The seller has been notified.');
      setProfile((p) => (p ? { ...p, kycStatus: 'APPROVED' } : p));
    } catch (err) {
      setRejectError((err as Error).message);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    if (rejectReason.length < 10) {
      setRejectError('Rejection reason must be at least 10 characters');
      return;
    }
    setRejecting(true);
    setRejectError('');
    setActionSuccess('');
    try {
      const res = await fetch(`/api/admin/kyc/${params.userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionSuccess('KYC rejected. The seller has been notified.');
      setProfile((p) => (p ? { ...p, kycStatus: 'REJECTED' } : p));
      setRejectReason('');
    } catch (err) {
      setRejectError((err as Error).message);
    } finally {
      setRejecting(false);
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

  if (!profile) return null;

  const kycStatusColor: Record<string, string> = {
    PENDING: 'text-lime-surveyor',
    APPROVED: 'text-marsh-olive',
    REJECTED: 'text-drift-ash',
    NOT_STARTED: 'text-drift-ash',
    EXPIRED: 'text-drift-ash',
  };

  const docTypeLabels: Record<string, string> = {
    PAN: 'PAN Card',
    GSTIN: 'GSTIN Certificate',
    PASSPORT: 'Passport',
    UTILITY_BILL: 'Utility Bill',
    BANK_STATEMENT: 'Bank Statement',
    INCORPORATION_CERT: 'Incorporation Certificate',
    OTHER: 'Other',
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
            <Link
              href="/admin/kyc"
              className="!text-lime-surveyor !no-underline hover:text-lime/80"
            >
              KYC Queue
            </Link>
            <span>/</span>
            <span className="text-bone-vellum">{profile.legalName ?? profile.user.email}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
                {profile.legalName ?? profile.user.email}
              </h1>
              <p
                className={`mt-1 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] ${kycStatusColor[profile.kycStatus]}`}
              >
                KYC Status: {profile.kycStatus.replace('_', ' ')}
              </p>
            </div>
            <GhostButton href="/admin/kyc">← Back</GhostButton>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Entity info + bank account */}
            <div className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8">
              <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                Entity details
              </h2>
              <DetailRow label="Legal name" value={profile.legalName ?? '—'} />
              <DetailRow label="Registration no." value={profile.registrationNo ?? '—'} />
              <DetailRow label="Country" value={profile.country ?? '—'} />
              <DetailRow
                label="Signatory"
                value={
                  profile.authorizedSignatoryName
                    ? `${profile.authorizedSignatoryName} (${profile.authorizedSignatoryEmail})`
                    : '—'
                }
              />
              <DetailRow label="Email" value={profile.user.email} />
              <DetailRow
                label="Member since"
                value={new Date(profile.user.createdAt).toLocaleString()}
              />

              {profile.bankAccount && (
                <>
                  <hr className="border-iron-filings" />
                  <h3 className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-lime-surveyor">
                    Bank account
                  </h3>
                  <DetailRow label="Holder" value={profile.bankAccount.accountHolder} />
                  <DetailRow label="Bank" value={profile.bankAccount.bankName} />
                  <DetailRow label="A/C last 4" value={profile.bankAccount.accountNoLast4} />
                  <DetailRow label="Routing/IFSC" value={profile.bankAccount.routingOrIfsc} />
                  <DetailRow label="Verified" value={profile.bankAccount.verified ? 'Yes' : 'No'} />
                </>
              )}
            </div>

            {/* Middle: Documents */}
            <div className="lg:col-span-1 space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8">
              <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                Documents ({profile.kycDocuments.length})
              </h2>

              {profile.kycDocuments.length === 0 ? (
                <p className="text-drift-ash text-[14px]">No documents uploaded</p>
              ) : (
                <div className="space-y-4">
                  {profile.kycDocuments.map((doc) => (
                    <div key={doc.id} className="rounded border border-iron-filings p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum">
                          {docTypeLabels[doc.documentType] ?? doc.documentType}
                        </span>
                        <span className="font-jetbrains-mono text-[11px] uppercase tracking-[0.06em] text-drift-ash">
                          {doc.reviewStatus}
                        </span>
                      </div>
                      {doc.sha256 && (
                        <p className="mt-1 font-mono text-[11px] text-drift-ash break-all">
                          SHA256: {doc.sha256}
                        </p>
                      )}
                      <p className="mt-1 font-jetbrains-mono text-[11px] text-drift-ash">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>

                      {/* View document button */}
                      {!docUrls[doc.id] ? (
                        <button
                          onClick={() => fetchDocUrl(doc.id)}
                          disabled={fetchingUrls[doc.id]}
                          className="mt-2 font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-lime-surveyor hover:text-lime/80 disabled:opacity-50"
                        >
                          {fetchingUrls[doc.id] ? 'Loading…' : 'View document'}
                        </button>
                      ) : (
                        <a
                          href={docUrls[doc.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-lime-surveyor hover:text-lime/80 !no-underline"
                        >
                          Open document ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Decision panel */}
            <div className="space-y-6 rounded-md border border-iron-filings bg-[#141414] p-8">
              <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-lime-surveyor">
                Decision
              </h2>

              {actionSuccess && (
                <p className="rounded-md border border-marsh-olive bg-[#141414] p-4 font-jetbrains-mono text-[13px] text-marsh-olive">
                  {actionSuccess}
                </p>
              )}

              {profile.kycStatus === 'PENDING' ? (
                <div className="space-y-6">
                  <LimeButton onClick={handleApprove} className="w-full">
                    Approve KYC
                  </LimeButton>

                  <form onSubmit={handleReject} className="space-y-4">
                    <div className="flex flex-col gap-[var(--spacing-7)]">
                      <label
                        htmlFor="reject-reason"
                        className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
                      >
                        Rejection reason
                      </label>
                      <textarea
                        id="reject-reason"
                        name="reason"
                        rows={3}
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why the application was rejected…"
                        className="w-full bg-transparent text-[14px] font-nb-international-pro text-bone-vellum placeholder:text-drift-ash border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor resize-none"
                      />
                    </div>
                    {rejectError && (
                      <p
                        className="font-jetbrains-mono text-[13px] text-lime-surveyor"
                        role="alert"
                      >
                        {rejectError}
                      </p>
                    )}
                    <GhostButton type="submit" disabled={rejecting} className="w-full">
                      {rejecting ? 'Rejecting…' : 'Reject application'}
                    </GhostButton>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-jetbrains-mono text-[13px] text-drift-ash">
                    This application has been{' '}
                    <span className={kycStatusColor[profile.kycStatus]}>
                      {profile.kycStatus.toLowerCase()}
                    </span>
                    .
                  </p>
                  {profile.kycReviewNotes && (
                    <div>
                      <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
                        Notes
                      </p>
                      <p className="mt-1 text-[14px] text-bone-vellum">{profile.kycReviewNotes}</p>
                    </div>
                  )}
                  {profile.kycReviewedAt && (
                    <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                      Reviewed: {new Date(profile.kycReviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
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
