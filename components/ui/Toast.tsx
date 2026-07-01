'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[var(--spacing-29)] right-[var(--spacing-29)] z-50 flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const variantClass =
    item.variant === 'error'
      ? 'border-error text-error'
      : item.variant === 'success'
        ? 'border-lime-surveyor text-bone-vellum'
        : 'border-iron-filings text-bone-vellum';

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto rounded-md border bg-surface-raised px-[var(--spacing-18)] py-[var(--spacing-14)] font-jetbrains-mono text-[13px] motion-safe:animate-[toast-in_200ms_ease-out] ${variantClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{item.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 bg-transparent font-jetbrains-mono text-[11px] uppercase tracking-[0.06em] text-drift-ash hover:text-bone-vellum"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
