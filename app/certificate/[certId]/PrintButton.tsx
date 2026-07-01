'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-jetbrains-mono text-[13px] text-lime-surveyor bg-transparent border-0 cursor-pointer hover:underline"
    >
      Print certificate
    </button>
  );
}
