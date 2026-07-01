import type { Metadata } from 'next';
import { Footer } from '@/components/landing/Footer';
import { FullBleedImage } from '@/components/landing/FullBleedImage';
import { Hero } from '@/components/landing/Hero';
import { SiteNav } from '@/components/nav/SiteNav';
import { DataTag } from '@/components/ui/DataTag';
import { GhostButton } from '@/components/ui/GhostButton';
import { LimeButton } from '@/components/ui/LimeButton';
import { Section } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'CC Verse — Verified carbon credits, end to end',
  description:
    'A marketplace where every carbon credit is signed at issuance, tracked on a public registry, and retired with cryptographic proof of ownership.',
  // TODO(brand-assets USER DEPENDENCY): drop a 1200×630 PNG into /public/og/home.png
  // and replace the relative path below once the asset is supplied.
  openGraph: {
    title: 'CC Verse — Verified carbon credits, end to end',
    description: 'Signed at issuance. Tracked on a registry. Retired with proof of ownership.',
    images: ['/og/home.png'],
  },
};

export default function HomePage() {
  return (
    <>
      <SiteNav transparent />
      <main id="main">
        <Hero
          eyebrow={<DataTag variant="outline">CC VERSE · MARKETPLACE</DataTag>}
          headline={
            <>
              Verified carbon credits,
              <br />
              end to end.
            </>
          }
          subhead="A marketplace where every credit is signed at issuance, tracked on a public registry, and retired with cryptographic proof of ownership."
          primary={<LimeButton href="#how-it-works">How it works</LimeButton>}
          secondary={<GhostButton href="/registry">View registry</GhostButton>}
        />

        <Section id="mission" ariaLabel="Mission">
          <div className="max-w-[68ch]">
            <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
              The mission
            </p>
            <h2
              className="mt-[var(--spacing-18)] text-bone-vellum"
              style={{
                fontSize: 'var(--text-heading)',
                lineHeight: 'var(--leading-heading)',
                letterSpacing: 'var(--tracking-heading)',
                fontWeight: 'var(--font-weight-regular)',
              }}
            >
              A registry, not a marketplace of claims.
            </h2>
            <p
              className="mt-[var(--spacing-29)] text-bone-vellum"
              style={{
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
              }}
            >
              Carbon markets are full of promises. CC Verse replaces them with a single source of
              truth: a registry entry per credit, signed at issuance, and a chain of state
              transitions that buyers, sellers, and auditors can verify without trusting each other.
            </p>
            <p
              className="mt-[var(--spacing-18)] text-bone-vellum"
              style={{
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
              }}
            >
              Every listing is bound to a project. Every order is bound to a buyer. Every retirement
              is bound to a date. Nothing is overwritten, nothing is silent, and nothing disappears.
            </p>
          </div>
        </Section>

        <FullBleedImage aria-hidden="true" />

        <Section id="how-it-works" ariaLabel="How it works">
          <div className="grid grid-cols-1 gap-[var(--spacing-59)] md:grid-cols-3">
            {[
              {
                tag: '01 · REGISTER',
                heading: 'Projects are signed at issuance.',
                body: 'Methodology is recognised. Acreage is verified. Each credit is minted as a registry entry with a unique serial — no double-counting, no over-issue.',
              },
              {
                tag: '02 · TRADE',
                heading: 'Listings move credits atomically.',
                body: 'A held-to-sold transition locks in the buyer, the price, and the serial range. Payments and payouts settle in the same transaction. Disputes are auditable from the first byte.',
              },
              {
                tag: '03 · RETIRE',
                heading: 'Retirements are permanent and public.',
                body: 'A retired credit cannot be re-listed. The certificate of retirement is signed, downloadable, and includes the proof a regulator or counterparty needs to accept it.',
              },
            ].map((block) => (
              <article key={block.tag}>
                <DataTag variant="solid">{block.tag}</DataTag>
                <h3
                  className="mt-[var(--spacing-18)] text-bone-vellum"
                  style={{
                    fontSize: 'var(--text-subheading)',
                    lineHeight: 'var(--leading-subheading)',
                    fontWeight: 'var(--font-weight-regular)',
                  }}
                >
                  {block.heading}
                </h3>
                <p
                  className="mt-[var(--spacing-14)] text-bone-vellum"
                  style={{
                    fontSize: 'var(--text-body)',
                    lineHeight: 'var(--leading-body)',
                  }}
                >
                  {block.body}
                </p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="registry" ariaLabel="Registry">
          <div className="max-w-[68ch]">
            <DataTag variant="solid">LIVE</DataTag>
            <h2
              className="mt-[var(--spacing-18)] text-bone-vellum"
              style={{
                fontSize: 'var(--text-heading)',
                lineHeight: 'var(--leading-heading)',
                letterSpacing: 'var(--tracking-heading)',
                fontWeight: 'var(--font-weight-regular)',
              }}
            >
              The public registry is live.
            </h2>
            <p
              className="mt-[var(--spacing-29)] text-bone-vellum"
              style={{
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
              }}
            >
              Every carbon credit serial is tracked on the CC Verse registry. Browse active listings
              on the marketplace, purchase credits, and verify retirements in real time.
            </p>
            <div className="mt-[var(--spacing-29)] flex flex-wrap gap-4">
              <LimeButton href="/marketplace">Browse marketplace</LimeButton>
              <GhostButton href="/registry">View registry</GhostButton>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
