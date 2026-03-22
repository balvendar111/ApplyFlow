import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      type="button"
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? (
        <Sun className="w-5 h-5 transition-transform duration-300" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300" />
      )}
    </button>
  );
}
