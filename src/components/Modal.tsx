"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2
            id="modal-title"
            className="text-2xl font-bold text-[var(--foreground)]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--foreground)] text-2xl"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
