import React, { useEffect, useId, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  /** Prevent closing via Esc/backdrop (e.g. while a request is running). */
  locked?: boolean;
}

/**
 * Accessible modal shell: role="dialog", aria-modal, Esc to close, focus moved in on open and
 * restored on close, Tab kept inside, and a scrollable body so it fits small screens / keyboards.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-lg',
  locked = false
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    // Focus the first form field (or the dialog itself)
    const focusTimer = window.setTimeout(() => {
      const target =
        dialog?.querySelector<HTMLElement>('[autofocus], input:not([type=hidden]), select, textarea') || dialog;
      target?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ).filter(el => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-surface-container-low border border-outline-variant/30 rounded-t-3xl sm:rounded-3xl w-full ${maxWidth} max-h-[92dvh] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.7)] outline-none`}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-bold text-on-surface tracking-tight truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain grow">{children}</div>

        {footer && <div className="px-5 sm:px-6 py-4 border-t border-outline-variant/20 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

/** Shared form styles so every modal looks like the rest of the app. */
export const fieldLabel = 'block text-xs font-semibold text-on-surface-variant mb-1.5';
export const fieldInput =
  'w-full bg-surface-container-lowest border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 outline-none transition-all';
export const segmented = 'grid gap-1 p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30';
export const segmentedBtn = (active: boolean, activeCls = 'bg-primary-container text-on-primary-container') =>
  `py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
    active ? `${activeCls} shadow` : 'text-on-surface-variant hover:text-on-surface'
  }`;
export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-b from-primary-container to-inverse-primary text-white text-sm font-bold shadow-[0_8px_24px_-6px_rgba(62,144,255,0.5)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface hover:bg-surface-container-high text-sm font-semibold transition-all cursor-pointer';
export const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-error hover:bg-error-container/20 border border-error/30 text-xs font-semibold transition-all cursor-pointer';
