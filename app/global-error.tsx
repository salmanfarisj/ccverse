'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-obsidian-loam text-bone-vellum">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="font-nb-international-pro text-[length:var(--text-subheading)] text-bone-vellum">
            Something went wrong
          </h1>
          <p className="mt-4 font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/80">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 rounded-md bg-lime-surveyor px-[18px] py-[14px] font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] text-obsidian-loam"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
