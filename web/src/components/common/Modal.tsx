import { useEffect, useRef, useState, type ReactNode } from 'react';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

export function Modal({ label, onClose, busy = false, maxWidth, children }: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  maxWidth?: string;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [previousFocus] = useState(() => document.activeElement);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = content.current;
    if (!element?.contains(document.activeElement)) {
      (element?.querySelector<HTMLElement>(FOCUSABLE) ?? element)?.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [previousFocus]);

  useEffect(() => {
    const element = content.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) onClose();
      } else if (event.key === 'Tab') {
        const controls = Array.from(element?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
          .filter((control) => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          element?.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onClose]);

  return <div className="modal-overlay" onClick={() => { if (!busy) onClose(); }}>
    <div ref={content} className="modal-content" role="dialog" aria-modal="true" aria-label={label}
      aria-busy={busy} tabIndex={-1} style={maxWidth ? { maxWidth } : undefined} onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  </div>;
}
