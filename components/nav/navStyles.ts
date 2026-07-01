/** Shared nav item styles — keeps links and buttons aligned in the header. */
export const navItemClass =
  'inline-flex h-[21px] min-h-0 items-center bg-transparent p-0 m-0 border-0 font-jetbrains-mono text-[13px] uppercase leading-none tracking-[0.06em] text-drift-ash !no-underline transition-colors hover:!text-bone-vellum';

export const navButtonClass = `${navItemClass} cursor-pointer appearance-none disabled:cursor-not-allowed disabled:opacity-50`;

export const navSignOutClass = `${navButtonClass} hover:!text-lime-surveyor`;
