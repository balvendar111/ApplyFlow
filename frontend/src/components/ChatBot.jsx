import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, ExternalLink, Building2, MapPin } from "lucide-react";
import { API_BASE, fetchWithAuth, safeJson } from "../lib/api";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const r = await fetchWithAuth(`${API_BASE}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await safeJson(r);

      const reply = data.reply || "I'm having trouble right now.";
      const assistantMsg = {
        role: "assistant",
        content: reply,
        jobs: data.jobs || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          jobs: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <div
            className="w-full sm:max-w-lg h-full bg-[var(--surface)] border-l border-stone-200 dark:border-stone-700 shadow-2xl flex flex-col animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 shrink-0">
              <h3 className="font-heading text-lg font-semibold text-[var(--primary)]">
                ApplyFlow Assistant
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[var(--secondary)] hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages - scrollable, takes remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
              {messages.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--secondary)] mb-4">
                    Ask about jobs, resume tips, applications, or match scores.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Data Scientist jobs in Bangalore",
                      "Find me AI Engineer roles",
                      "Jobs for freshers",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setInputValue(s); inputRef.current?.focus(); }}
                        className="px-3 py-1.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-[var(--primary)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
                      m.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-[var(--primary)] border border-stone-200/50 dark:border-stone-700/50"
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {m.role === "user" ? (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      ) : (
                        <span className="[&_a]:text-[var(--accent)] [&_a]:underline hover:[&_a]:opacity-90 [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </span>
                      )}
                    </div>
                    {m.jobs && m.jobs.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-600">
                        <p className="text-xs font-medium text-[var(--secondary)] mb-3 uppercase tracking-wide">
                          {m.jobs.length} job{m.jobs.length !== 1 ? "s" : ""} found
                        </p>
                        <div className="space-y-3">
                          {m.jobs.map((job) => (
                            <div
                              key={job.external_id}
                              className="rounded-xl border border-stone-200 dark:border-stone-600 bg-[var(--surface)] p-3.5 hover:border-[var(--accent)]/50 transition-colors"
                            >
                              <div className="font-semibold text-[var(--primary)] text-sm">
                                {job.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--secondary)]">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 shrink-0" />
                                  {job.company}
                                </span>
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {job.location}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2.5 flex gap-3">
                                <Link
                                  to={`/app/job/${encodeURIComponent(job.external_id)}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                                  onClick={() => setOpen(false)}
                                >
                                  View details
                                </Link>
                                {job.apply_url && !job.apply_url.includes("example.com") && (
                                  <a
                                    href={job.apply_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                                  >
                                    Apply <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-stone-100 dark:bg-stone-800 text-[var(--secondary)] text-sm border border-stone-200/50 dark:border-stone-700/50">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - fixed at bottom, clear separation */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask a question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] text-[var(--primary)] placeholder:text-stone-500 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm outline-none disabled:opacity-60"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !inputValue.trim()}
                  className="px-4 py-3 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
