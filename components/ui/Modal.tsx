'use client';

import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { GhostButton } from '@/components/ui/GhostButton';
import { backdropVariants, panelVariants } from '@/lib/motion/variants';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-loam/80 p-4"
          role="presentation"
          variants={backdropVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-md rounded-md border border-iron-filings bg-surface-raised p-[var(--spacing-29)] outline-none"
            variants={panelVariants(reduced)}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id={titleId}
                className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] text-bone-vellum"
              >
                {title}
              </h2>
              <GhostButton type="button" onClick={onClose} aria-label="Close dialog">
                ✕
              </GhostButton>
            </div>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
