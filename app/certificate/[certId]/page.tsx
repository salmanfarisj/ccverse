import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import {
  CertificateField,
  CertificateHeader,
  CertificateReveal,
  CertificateSerial,
} from '@/components/certificate/CertificateReveal';
import { DataTag } from '@/components/ui/DataTag';
import {
  CertificateBackLink,
  getCertificateBackLink,
} from '@/components/certificate/CertificateBackLink';
import { PrintButton } from './PrintButton';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

type PageProps = { params: { certId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const convex = getConvexClient();
  const result = await convex.query(api.orders.queries.getCertificate, {
    certId: params.certId as Id<'certificates'>,
  });
  if (!result.found) {
    return { title: 'Certificate not found' };
  }
  return {
    title: `Certificate ${result.certificate.certNo}`,
    description: `Ownership certificate for ${result.certificate.quantity} retired carbon credits.`,
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const convex = getConvexClient();
  const [result, backLink] = await Promise.all([
    convex.query(api.orders.queries.getCertificate, {
      certId: params.certId as Id<'certificates'>,
    }),
    getCertificateBackLink(),
  ]);

  if (!result.found) {
    notFound();
  }

  const cert = result.certificate;
  const issuedDate = formatDate(cert.issuedAt);

  return (
    <>
      <SiteNav />
      <main
        id="main"
        className="min-h-screen bg-obsidian-loam main-offset print:bg-white print:pt-0"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-3xl px-6 py-12 print:py-8">
          <div className="print:hidden mb-6 flex flex-wrap items-center gap-4">
            <CertificateBackLink href={backLink.href} label={backLink.label} />
            <PrintButton />
          </div>

          <CertificateReveal>
            <CertificateHeader>
              <DataTag variant="solid">CC VERSE</DataTag>
              <h1 className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] text-bone-vellum print:text-black">
                Certificate of Ownership
              </h1>
              <p className="font-jetbrains-mono text-[13px] text-bone-vellum/70 print:text-gray-600">
                Carbon Credit Retirement Certificate
              </p>
            </CertificateHeader>

            <div className="my-8 border-t border-iron-filings print:border-gray-300" />

            <dl className="space-y-4 font-jetbrains-mono text-[14px]">
              {[
                { label: 'Certificate No.', value: cert.certNo, valueClass: 'text-lime-surveyor font-bold print:text-black' },
                { label: 'Issued to', value: cert.buyerEmail, valueClass: 'font-nb-international-pro text-bone-vellum print:text-black' },
                { label: 'Project', value: cert.projectName, valueClass: 'font-nb-international-pro text-bone-vellum print:text-black' },
                { label: 'Quantity retired', value: `${formatNumber(cert.quantity)} tCO₂e`, valueClass: 'text-bone-vellum print:text-black' },
                { label: 'Total paid', value: formatCurrency(cert.totalAmount, cert.currency), valueClass: 'text-bone-vellum print:text-black' },
                { label: 'Issue date', value: issuedDate, valueClass: 'text-bone-vellum print:text-black' },
              ].map((field, index) => (
                <CertificateField key={field.label} index={index}>
                  <div className="flex justify-between gap-4">
                    <dt className="text-drift-ash print:text-gray-600">{field.label}</dt>
                    <dd className={field.valueClass}>{field.value}</dd>
                  </div>
                </CertificateField>
              ))}
            </dl>

            <div className="mt-8">
              <p className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash print:text-gray-600">
                Registry serials (retired)
              </p>
              <ul className="mt-2 space-y-1">
                {cert.serials.map((serial, index) => (
                  <CertificateSerial key={serial} index={index}>
                    {serial}
                  </CertificateSerial>
                ))}
              </ul>
            </div>

            <div className="mt-10 border-t border-iron-filings pt-6 print:border-gray-300">
              <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center print:text-gray-500">
                This certificate confirms permanent retirement of the listed carbon credits on the
                CC Verse public registry. Demo certificate — not cryptographically signed.
              </p>
            </div>
          </CertificateReveal>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
