'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthNav } from '@/components/nav/AuthNav';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { KycSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiSend, apiSendForm } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [hideBankAccount, setHideBankAccount] = useState(false);

  const [entity, setEntity] = useState({
    legalName: '',
    registrationNo: '',
    country: '',
    authorizedSignatoryName: '',
    authorizedSignatoryEmail: '',
  });

  const [bankAccount, setBankAccount] = useState({
    accountHolder: '',
    bankName: '',
    accountNoLast4: '',
    routingOrIfsc: '',
  });

  const { data: kyc, isPending } = useQuery({
    queryKey: qk.sellerKyc,
    queryFn: () => apiGet<KycState>('/api/seller/kyc'),
  });

  useEffect(() => {
    if (kyc) {
      setEntity({
        legalName: kyc.entity.legalName ?? '',
        registrationNo: kyc.entity.registrationNo ?? '',
        country: kyc.entity.country ?? '',
        authorizedSignatoryName: kyc.entity.authorizedSignatoryName ?? '',
        authorizedSignatoryEmail: kyc.entity.authorizedSignatoryEmail ?? '',
      });
      setHideBankAccount(false);
    }
  }, [kyc]);

  async function invalidateKyc() {
    await queryClient.invalidateQueries({ queryKey: qk.sellerKyc });
    await queryClient.invalidateQueries({ queryKey: qk.sellerDashboard });
  }

  const saveEntityMutation = useMutation({
    mutationFn: () => apiSend('/api/seller/kyc', 'PATCH', entity),
    onSuccess: async () => {
      setError('');
      await invalidateKyc();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  const saveBankMutation = useMutation({
    mutationFn: () => apiSend('/api/seller/kyc/bank-account', 'POST', bankAccount),
    onSuccess: async () => {
      setError('');
      setHideBankAccount(false);
      await invalidateKyc();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save bank account');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) => {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', file);
      return apiSendForm('/api/seller/kyc/documents', formData);
    },
    onSuccess: async () => {
      setError('');
      await invalidateKyc();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => apiSend('/api/seller/kyc/submit', 'POST'),
    onSuccess: async () => {
      toast('KYC application submitted', 'success');
      await invalidateKyc();
      await router.push('/seller');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Submission failed');
    },
  });

  function saveEntity(e: FormEvent) {
    e.preventDefault();
    saveEntityMutation.mutate();
  }

  function saveBankAccount(e: FormEvent) {
    e.preventDefault();
    saveBankMutation.mutate();
  }

  function uploadDocument(documentType: string, file: File) {
    uploadMutation.mutate({ documentType, file });
  }

  function submitKyc(e: FormEvent) {
    e.preventDefault();
    submitMutation.mutate();
  }

  if (isPending) {
    return (
      <>
        <AuthNav role="SELLER" />
        <main
          id="main"
          className="flex min-h-screen flex-col bg-obsidian-loam px-6 main-offset"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-2xl py-12">
            <KycSkeleton />
          </div>
        </main>
      </>
    );
  }

  const currentStep = kyc?.step ?? 1;
  const kycStatus = kyc?.kycStatus;
  const kycLocked = kycStatus === 'PENDING' || kycStatus === 'APPROVED';
  const uploading = uploadMutation.isPending;

  return (
    <>
      <AuthNav role="SELLER" />
      <main id="main" className="flex min-h-screen flex-col bg-obsidian-loam px-6 main-offset">
        <div className="mx-auto w-full max-w-2xl space-y-8 py-12">
          <div className="text-center">
            <h1 className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-bone-vellum">
              Seller Verification
            </h1>
            <p className="mt-2 font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/80">
              Complete all steps to submit your KYC application
            </p>
          </div>

          {kycStatus === 'APPROVED' && (
            <div className="rounded-md border border-lime-surveyor bg-surface-raised p-8 text-center space-y-6">
              <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-lime-surveyor">
                Verification complete
              </p>
              <p className="font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/80">
                Your seller account is verified. You can list carbon credits on the marketplace.
              </p>
              {kyc?.entity.legalName && (
                <p className="font-jetbrains-mono text-[13px] text-bone-vellum/70">
                  {kyc.entity.legalName} · {kyc.entity.country}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <LimeButton href="/seller">Go to dashboard</LimeButton>
                <GhostButton href="/seller/listings/new">Create listing</GhostButton>
              </div>
            </div>
          )}

          {kycStatus !== 'APPROVED' && (
            <>
              {kycStatus && kycStatus !== 'NOT_STARTED' && (
                <div
                  className={`rounded-md border p-4 text-center font-jetbrains-mono text-[13px] ${
                    kycStatus === 'REJECTED'
                      ? 'border-iron-filings bg-surface-raised text-drift-ash'
                      : 'border-marsh-olive bg-marsh-olive/10 text-marsh-olive'
                  }`}
                >
                  KYC Status: {kycStatus}
                  {kycStatus === 'PENDING' && ' — Your application is under review'}
                  {kycStatus === 'REJECTED' && ' — Please contact support'}
                </div>
              )}

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
                <p className="rounded-md border border-lime-surveyor bg-surface-raised p-4 font-jetbrains-mono text-[13px] text-lime-surveyor">
                  {error}
                </p>
              )}

              {(!kycLocked || (kyc?.entity.legalName ?? null) !== null) && (
                <div className="space-y-4 rounded-md border border-iron-filings bg-surface-raised p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                      Step 1 — Entity Details
                    </h2>
                    {currentStep > 1 && kyc?.entity.legalName && (
                      <span className="font-jetbrains-mono text-[11px] text-drift-ash">
                        ✓ Saved
                      </span>
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
                        onChange={(e) =>
                          setEntity((p) => ({ ...p, registrationNo: e.target.value }))
                        }
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
                      <LimeButton type="submit" disabled={saveEntityMutation.isPending}>
                        {saveEntityMutation.isPending ? 'Saving…' : 'Save entity details'}
                      </LimeButton>
                    )}
                  </form>
                </div>
              )}

              {(!kycLocked || (kyc?.documents.length ?? 0) > 0) && (
                <div className="space-y-4 rounded-md border border-iron-filings bg-surface-raised p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                      Step 2 — KYC Documents
                    </h2>
                    {currentStep > 2 && (kyc?.documents.length ?? 0) > 0 && (
                      <span className="font-jetbrains-mono text-[11px] text-drift-ash">
                        {kyc?.documents.length} uploaded
                      </span>
                    )}
                  </div>

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

              {(!kycLocked || kyc?.bankAccount !== null) && (
                <div className="space-y-4 rounded-md border border-iron-filings bg-surface-raised p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-jetbrains-mono text-[14px] font-semibold uppercase tracking-[0.06em] text-lime-surveyor">
                      Step 3 — Bank Account
                    </h2>
                    {currentStep > 3 && kyc?.bankAccount && (
                      <span className="font-jetbrains-mono text-[11px] text-drift-ash">
                        ✓ Saved
                      </span>
                    )}
                  </div>

                  {kyc?.bankAccount && !hideBankAccount ? (
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
                          onClick={() => setHideBankAccount(true)}
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
                          onChange={(e) =>
                            setBankAccount((p) => ({ ...p, bankName: e.target.value }))
                          }
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
                        <LimeButton type="submit" disabled={saveBankMutation.isPending}>
                          {saveBankMutation.isPending ? 'Saving…' : 'Save bank account'}
                        </LimeButton>
                      )}
                    </form>
                  )}
                </div>
              )}

              {currentStep === 4 && !kycLocked && (
                <div className="space-y-4 rounded-md border border-lime-surveyor/50 bg-surface-raised p-6">
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
                    By submitting, you confirm that all information provided is accurate and
                    complete.
                  </p>

                  <form onSubmit={submitKyc}>
                    <LimeButton
                      type="submit"
                      className="w-full"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting…' : 'Submit KYC application'}
                    </LimeButton>
                  </form>
                </div>
              )}

              <div className="flex justify-between">
                <GhostButton onClick={() => void router.push('/seller')}>
                  ← Back to dashboard
                </GhostButton>
                {currentStep < 4 && !kycLocked && (
                  <GhostButton onClick={() => undefined}>Step {currentStep} of 4</GhostButton>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
