import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  dismissible = true,
  bodyRef,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
  dismissible?: boolean;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    if (dismissible) closeRef.current?.focus();
    else dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onCloseRef.current();
      if (event.key !== "Tab") return;
      const modal = dialogRef.current;
      const focusable = Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!modal?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [dismissible]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
      >
        <header>
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description">{description}</p> : null}
          </div>
          {dismissible ? (
            <button
              ref={closeRef}
              className="icon-button"
              type="button"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          ) : null}
        </header>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </section>
    </div>
  );
}
