"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/** Keep focus inside the active workflow and restore it to the opener on close. */
export default function Modal({ open, label, onClose, children, returnFocusRef }: {
  open: boolean;
  label: string;
  onClose: () => void | Promise<void>;
  children: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) {
      element.close();
      if (returnFocusRef?.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    }
  }, [open, returnFocusRef]);

  return <dialog
    ref={dialog}
    className="seal-modal"
    aria-label={label}
    onCancel={(event) => { event.preventDefault(); void onClose(); }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) void onClose(); }}
  >{children}</dialog>;
}
