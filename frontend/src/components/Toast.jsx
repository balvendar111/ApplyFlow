import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-stone-700";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${bg}`}
      role="alert"
    >
      {message}
    </div>
  );
}
