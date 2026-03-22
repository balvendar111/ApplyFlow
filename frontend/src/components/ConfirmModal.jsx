import { useEffect } from "react";

export default function ConfirmModal({ title, message, confirmLabel = "Delete", cancelLabel = "Cancel", variant = "danger", onConfirm, onCancel }) {
  const dangerStyles = "bg-red-600 hover:bg-red-700 text-white border-transparent";
  const primaryStyles = "bg-[var(--accent)] hover:bg-orange-600 text-white border-transparent";

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <div className="p-5 sm:p-6">
          <h3 id="confirm-title" className="font-heading text-lg font-medium text-[var(--primary)]">
            {title}
          </h3>
          <p id="confirm-desc" className="mt-2 text-sm text-[var(--secondary)]">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-[var(--primary)] text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              variant === "danger" ? dangerStyles : primaryStyles
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
