/*
 * Phase 0 placeholder. The full landing page (Hero, Section, Footer) is
 * built in T0-2-7 against `DESIGN.md`. For T0-1 we render a minimal stub so
 * `npm run dev` shows something at `/` and the e2e smoke test has a target.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ fontSize: '0.875rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          CC Verse — Phase 0
        </p>
        <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0 0' }}>Foundation in place.</h1>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
          The design system and full landing page land in T0-2.
        </p>
      </div>
    </main>
  );
}
