import { type ReactNode, useEffect, useId, useRef } from "react";

interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    closeDisabled?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export default function Modal({ title, isOpen, onClose, children, size = "md", closeDisabled = false }: ModalProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLElement>(null);
    const onCloseRef = useRef(onClose);
    const closeDisabledRef = useRef(closeDisabled);

    useEffect(() => {
        onCloseRef.current = onClose;
        closeDisabledRef.current = closeDisabled;
    }, [closeDisabled, onClose]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const dialog = dialogRef.current;
        const focusableSelector =
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = dialog ? [...dialog.querySelectorAll<HTMLElement>(focusableSelector)] : [];
        (focusableElements[0] ?? dialog)?.focus();

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !closeDisabledRef.current) {
                onCloseRef.current();
            }

            if (event.key === "Tab" && dialog) {
                const availableElements = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
                    (element) => !element.hasAttribute("disabled")
                );
                const firstElement = availableElements[0];
                const lastElement = availableElements.at(-1);

                if (availableElements.length === 0) {
                    event.preventDefault();
                    dialog.focus();
                } else if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !closeDisabled) {
                    onClose();
                }
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${sizeClasses[size]}`}
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <h2 id={titleId} className="text-xl font-bold text-slate-900">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={closeDisabled}
                        aria-label="Close dialog"
                        className="rounded-lg p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ×
                    </button>
                </header>
                <div className="p-6">{children}</div>
            </section>
        </div>
    );
}
