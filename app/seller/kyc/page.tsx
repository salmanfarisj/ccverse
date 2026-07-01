'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

interface KycState {
  step: number;
  kycStatus: string;
  entity: {
    legalName: string | null;
    registrationNo: string | null;
    country: string | null;
    authorizedSignatoryName: string | null;
    authorizedSignatoryEmail: string | null;
  };
  documents: Array<{
    id: string;
    documentType: string;
    sha256: string | null;
    uploadedAt: string;
    reviewStatus: string;
  }>;
  bankAccount: {
    id: string;
    accountHolder: string;
    bankName: string;
    accountNoLast4: string;
    routingOrIfsc: string;
    verified: boolean;
  } | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PAN: 'PAN Card',
  GSTIN: 'GSTIN Certificate',
  PASSPORT: 'Passport',
  UTILITY_BILL: 'Utility Bill',
  BANK_STATEMENT: 'Bank Statement',
  INCORPORATION_CERT: 'Incorporation Certificate',
  OTHER: 'Other',
};

export default function SellerKycPage() {
  const router = useRouter();
  const [kyc, setKyc] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Entity form state
  const [entity, setEntity] = useState({
    legalName: '',
    registrationNo: '',
    country: '',
    authorizedSignatoryName: '',
    authorizedSignatoryEmail: '',
  });
  const [entitySaving, setEntitySaving] = useState(false);

  // Bank account form state
  const [bankAccount, setBankAccount] = useState({
    accountHolder: '',
    bankName: '',
    accountNoLast4: '',
    routingOrIfsc: '',
  });
  const [bankSaving, setBankSaving] = useState(false);

  // File upload state
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchKyc();
  }, []);

  async function fetchKyc() {
    try {
      const res = await fetch('/api/seller/kyc');
      if (res.ok) {
        const data = await res.json();
        setKyc(data);
        setEntity({
          legalName: data.entity.legalName ?? '',
          registrationNo: data.entity.registrationNo ?? '',
          country: data.entity.country ?? '',
          authorizedSignatoryName: data.entity.authorizedSignatoryName ?? '',
          authorizedSignatoryEmail: data.entity.authorizedSignatoryEmail ?? '',
        });
      }
    } catch {
      setError('Failed to load KYC data');
    } finally {
      setLoading(false);
    }
  }

  async function saveEntity(e: FormEvent) {
    e.preventDefault();
    setEntitySaving(true);
    setError('');
    try {
      const res = await fetch('/api/seller/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      });
      if (res.ok) {
        await fetchKyc();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
      }
    } finally {
      setEntitySaving(false);
    }
  }

  async function saveBankAccount(e: FormEvent) {
    e.preventDefault();
    setBankSaving(true);
    setError('');
    try {
      const res = await fetch('/api/seller/kyc/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankAccount),
      });
      if (res.ok) {
        await fetchKyc();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save bank account');
      }
    } finally {
      setBankSaving(false);
    }
  }

  async function uploadDocument(documentType: string, file: File) {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', file);

      const res = await fetch('/api/seller/kyc/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchKyc();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function submitKyc(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/seller/kyc/submit', { method: 'POST' });
      if (res.ok) {
        router.push('/seller');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam">
        <p className="font-jetbrains-mono text-[13px] text-drift-ash">Loading…</p>
      </main>
    );
  }

  const currentStep = kyc?.step ?? 1;
  const kycStatus = kyc?.kycStatus;

  const kycLocked = kycStatus === 'PENDING' || kycStatus === 'APPROVED';

  return (
    <main className="flex min-h-screen flex-col bg-obsidian-loam px-6 pt-[80px]">
      <div className="mx-auto w-full max-w-2xl space-y-8 py-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-jetbrains-mono text-2xl font-bold tracking-tight !text-lime-surveyor">
            Seller Verification
          </h1>
          <p className="mt-2 font-jetbrains-mono text-[13px] text-drift-ash">
            Complete all steps to submit your KYC application
          </p>
        </div>

        {/* KYC status banner */}
        {kycStatus && kycStatus !== 'NOT_STARTED' && (
          <div
            className={`rounded-md border p-4 text-center font-jetbrains-mono text-[13px] ${
              kycStatus === 'APPROVED'
                ? 'border-lime-surveyor bg-lime-surveyor/10 text-lime-surveyor'
                : kycStatus === 'REJECTED'
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
            }`}
          >
            KYC Status: {kycStatus}
            {kycStatus === 'PENDING' && ' — Your application is under review'}
            {kycStatus === 'APPROVED' && ' — You can now list credits'}
            {kycStatus === 'REJECTED' && ' — Please contact support'}
          </div>
        )}

        {/* Step indicator */}
        {!kycLocked && (
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-jetbrains-mono text-[11px] font-bold ${
                    currentStep >= step
                      ? '!bg-lime-surveyor !text-obsidian-loam'
                      : 'border border-iron-filings text-drift-ash'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                {step < 4 && (
                  <div
                    className={`h-px w-8 ${currentStep > step ? 'bg-lime-surveyor' : 'bg-iron-filings'}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-md border border-lime-surveyor bg-[#141414] p-4 font-jetbrains-mono text-[13px] text-lime-surveyor">
            {error}
          </p>
        )}

        {/* Step 1 — Entity details */}
        {(!kycLocked || (kyc?.entity.legalName ?? null) !== null) && (
          <div className="space-y-4 rounded-md border border-iron-filings bg-[#141414] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                Step 1 — Entity Details
              </h2>
              {currentStep > 1 && kyc?.entity.legalName && (
                <span className="font-jetbrains-mono text-[11px] text-lime/60">✓ Saved</span>
              )}
            </div>

            <form onSubmit={saveEntity} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Legal entity name"
                  name="legalName"
                  value={entity.legalName}
                  onChange={(e) => setEntity((p) => ({ ...p, legalName: e.target.value }))}
                  disabled={kycLocked}
                />
                <Input
                  label="Registration number"
                  name="registrationNo"
                  value={entity.registrationNo}
                  onChange={(e) => setEntity((p) => ({ ...p, registrationNo: e.target.value }))}
                  disabled={kycLocked}
                />
              </div>
              <Input
                label="Country"
                name="country"
                value={entity.country}
                onChange={(e) => setEntity((p) => ({ ...p, country: e.target.value }))}
                disabled={kycLocked}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Authorized signatory name"
                  name="authorizedSignatoryName"
                  value={entity.authorizedSignatoryName}
                  onChange={(e) =>
                    setEntity((p) => ({ ...p, authorizedSignatoryName: e.target.value }))
                  }
                  disabled={kycLocked}
                />
                <Input
                  label="Authorized signatory email"
                  name="authorizedSignatoryEmail"
                  type="email"
                  value={entity.authorizedSignatoryEmail}
                  onChange={(e) =>
                    setEntity((p) => ({ ...p, authorizedSignatoryEmail: e.target.value }))
                  }
                  disabled={kycLocked}
                />
              </div>
              {!kycLocked && (
                <LimeButton type="submit" disabled={entitySaving}>
                  {entitySaving ? 'Saving…' : 'Save entity details'}
                </LimeButton>
              )}
            </form>
          </div>
        )}

        {/* Step 2 — Document upload */}
        {(!kycLocked || (kyc?.documents.length ?? 0) > 0) && (
          <div className="space-y-4 rounded-md border border-iron-filings bg-[#141414] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                Step 2 — KYC Documents
              </h2>
              {currentStep > 2 && (kyc?.documents.length ?? 0) > 0 && (
                <span className="font-jetbrains-mono text-[11px] text-lime/60">
                  {kyc?.documents.length} uploaded
                </span>
              )}
            </div>

            {/* Uploaded documents list */}
            {kyc?.documents && kyc.documents.length > 0 && (
              <div className="space-y-2">
                {kyc.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded border border-iron-filings px-3 py-2"
                  >
                    <div>
                      <p className="font-jetbrains-mono text-[13px] text-lime-surveyor">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                      </p>
                      {doc.sha256 && (
                        <p className="font-jetbrains-mono text-[11px] text-drift-ash">
                          SHA256: {doc.sha256.slice(0, 16)}…
                        </p>
                      )}
                    </div>
                    <span
                      className={`font-jetbrains-mono text-[11px] ${
                        doc.reviewStatus === 'APPROVED'
                          ? 'text-lime-surveyor'
                          : doc.reviewStatus === 'REJECTED'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }`}
                    >
                      {doc.reviewStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload form */}
            {!kycLocked && (
              <div className="space-y-3">
                {[
                  'PAN',
                  'GSTIN',
                  'PASSPORT',
                  'UTILITY_BILL',
                  'BANK_STATEMENT',
                  'INCORPORATION_CERT',
                ].map((type) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-40 font-jetbrains-mono text-[12px] text-drift-ash">
                      {DOCUMENT_TYPE_LABELS[type]}
                    </span>
                    <input
                      type="file"
                      id={`file-${type}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(type, file);
                      }}
                      disabled={uploading}
                    />
                    <label
                      htmlFor={`file-${type}`}
                      className="cursor-pointer rounded border border-iron-filings px-3 py-1 font-jetbrains-mono text-[12px] text-drift-ash hover:border-lime-surveyor hover:text-lime-surveyor"
                    >
                      {uploading ? 'Uploading…' : 'Choose file'}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Bank account */}
        {(!kycLocked || kyc?.bankAccount !== null) && (
          <div className="space-y-4 rounded-md border border-iron-filings bg-[#141414] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                Step 3 — Bank Account
              </h2>
              {currentStep > 3 && kyc?.bankAccount && (
                <span className="font-jetbrains-mono text-[11px] text-lime/60">✓ Saved</span>
              )}
            </div>

            {kyc?.bankAccount ? (
              <div className="space-y-2">
                <div className="rounded border border-iron-filings px-3 py-2">
                  <p className="font-jetbrains-mono text-[13px] text-lime-surveyor">
                    {kyc.bankAccount.accountHolder} — {kyc.bankAccount.bankName}
                  </p>
                  <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                    Account ending in {kyc.bankAccount.accountNoLast4} ·{' '}
                    {kyc.bankAccount.routingOrIfsc}
                  </p>
                </div>
                {!kycLocked && (
                  <button
                    onClick={() => setKyc((p) => (p ? { ...p, bankAccount: null } : p))}
                    className="font-jetbrains-mono text-[12px] text-drift-ash underline hover:text-lime-surveyor"
                  >
                    Replace bank account
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={saveBankAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Account holder name"
                    name="accountHolder"
                    value={bankAccount.accountHolder}
                    onChange={(e) =>
                      setBankAccount((p) => ({ ...p, accountHolder: e.target.value }))
                    }
                    disabled={kycLocked}
                  />
                  <Input
                    label="Bank name"
                    name="bankName"
                    value={bankAccount.bankName}
                    onChange={(e) => setBankAccount((p) => ({ ...p, bankName: e.target.value }))}
                    disabled={kycLocked}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Last 4 digits of account number"
                    name="accountNoLast4"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={bankAccount.accountNoLast4}
                    onChange={(e) =>
                      setBankAccount((p) => ({ ...p, accountNoLast4: e.target.value }))
                    }
                    disabled={kycLocked}
                  />
                  <Input
                    label="Routing number / IFSC"
                    name="routingOrIfsc"
                    value={bankAccount.routingOrIfsc}
                    onChange={(e) =>
                      setBankAccount((p) => ({ ...p, routingOrIfsc: e.target.value }))
                    }
                    disabled={kycLocked}
                  />
                </div>
                {!kycLocked && (
                  <LimeButton type="submit" disabled={bankSaving}>
                    {bankSaving ? 'Saving…' : 'Save bank account'}
                  </LimeButton>
                )}
              </form>
            )}
          </div>
        )}

        {/* Step 4 — Review & submit */}
        {currentStep === 4 && !kycLocked && (
          <div className="space-y-4 rounded-md border border-lime-surveyor/50 bg-[#141414] p-6">
            <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
              Step 4 — Review & Submit
            </h2>

            <div className="space-y-3 text-sm text-drift-ash">
              <div className="flex justify-between border-b border-iron-filings pb-2">
                <span>Entity</span>
                <span className="text-lime-surveyor">{kyc?.entity.legalName}</span>
              </div>
              <div className="flex justify-between border-b border-iron-filings pb-2">
                <span>Documents</span>
                <span className="text-lime-surveyor">{kyc?.documents.length} uploaded</span>
              </div>
              <div className="flex justify-between border-b border-iron-filings pb-2">
                <span>Bank account</span>
                <span className="text-lime-surveyor">
                  {kyc?.bankAccount
                    ? `${kyc.bankAccount.bankName} ··${kyc.bankAccount.accountNoLast4}`
                    : 'Not provided'}
                </span>
              </div>
            </div>

            <p className="font-jetbrains-mono text-[12px] text-drift-ash">
              By submitting, you confirm that all information provided is accurate and complete.
            </p>

            <form onSubmit={submitKyc}>
              <LimeButton type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit KYC application'}
              </LimeButton>
            </form>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <GhostButton onClick={() => router.push('/seller')}>← Back to dashboard</GhostButton>
          {currentStep < 4 && !kycLocked && (
            <GhostButton
              onClick={() => {
                /* just view */
              }}
            >
              Step {currentStep} of 4
            </GhostButton>
          )}
        </div>
      </div>
    </main>
  );
}
