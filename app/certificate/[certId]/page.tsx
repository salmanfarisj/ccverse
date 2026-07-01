import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/nav/SiteNav';
import { Footer } from '@/components/landing/Footer';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { DataTag } from '@/components/ui/DataTag';
import { CertificateBackLink, getCertificateBackLink } from '@/components/certificate/CertificateBackLink';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

type PageProps = { params: { certId: string } };

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
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <SiteNav />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px] print:bg-white print:pt-0">
        <div className="mx-auto max-w-3xl px-6 py-12 print:py-8">
          <div className="print:hidden mb-6 flex gap-4">
            <CertificateBackLink href={backLink.href} label={backLink.label} />
            <PrintButton />
          </div>

          <article className="rounded-md border-2 border-lime-surveyor bg-[#141414] p-10 print:border-black print:bg-white print:text-black">
            <div className="text-center space-y-4">
              <DataTag variant="solid">CC VERSE</DataTag>
              <h1 className="font-jetbrains-mono text-2xl font-bold tracking-tight text-bone-vellum print:text-black">
                Certificate of Ownership
              </h1>
              <p className="font-jetbrains-mono text-[13px] text-drift-ash print:text-gray-600">
                Carbon Credit Retirement Certificate
              </p>
            </div>

            <div className="my-8 border-t border-iron-filings print:border-gray-300" />

            <dl className="space-y-4 font-jetbrains-mono text-[14px]">
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Certificate No.</dt>
                <dd className="text-lime-surveyor font-bold print:text-black">{cert.certNo}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Issued to</dt>
                <dd className="text-bone-vellum print:text-black">{cert.buyerEmail}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Project</dt>
                <dd className="text-bone-vellum print:text-black">{cert.projectName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Quantity retired</dt>
                <dd className="text-bone-vellum print:text-black">
                  {cert.quantity} tCO₂e
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Total paid</dt>
                <dd className="text-bone-vellum print:text-black">
                  {cert.currency} {cert.totalAmount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drift-ash print:text-gray-600">Issue date</dt>
                <dd className="text-bone-vellum print:text-black">{issuedDate}</dd>
              </div>
            </dl>

            <div className="mt-8">
              <p className="font-jetbrains-mono text-[12px] uppercase tracking-[0.06em] text-drift-ash print:text-gray-600">
                Registry serials (retired)
              </p>
              <ul className="mt-2 space-y-1">
                {cert.serials.map((serial) => (
                  <li
                    key={serial}
                    className="font-jetbrains-mono text-[13px] text-lime-surveyor print:text-black"
                  >
                    {serial}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 border-t border-iron-filings pt-6 print:border-gray-300">
              <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center print:text-gray-500">
                This certificate confirms permanent retirement of the listed carbon credits on the CC
                Verse public registry. Demo certificate — not cryptographically signed.
              </p>
            </div>
          </article>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
