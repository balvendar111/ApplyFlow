import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Trash2 } from "lucide-react";
import { API_BASE, safeJson, fetchWithAuth } from "../lib/api";
import ConfirmModal from "./ConfirmModal";

export default function ResumeUpload({ onUpload, currentResume, onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleDeleteConfirm = async () => {
    if (!currentResume) return;
    setError("");
    setDeleting(true);
    setShowDeleteModal(false);
    try {
      const r = await fetchWithAuth(`${API_BASE}/resume`, { method: "DELETE" });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(data.detail || "Delete failed");
      onUpload?.(null);
      onSuccess?.("Resume removed");
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (![".pdf", ".docx"].some((e) => file.name.toLowerCase().endsWith(e))) {
      setError("Only PDF and DOCX allowed");
      return;
    }
    setError("");
    setUploading(true);
    let r, data;
    try {
      const form = new FormData();
      form.append("file", file);
      r = await fetchWithAuth(`${API_BASE}/resume/upload`, {
        method: "POST",
        body: form,
      });
      data = await safeJson(r);
      if (!r.ok) {
        const msg = Array.isArray(data?.detail) ? data.detail[0]?.msg : data?.detail;
        throw new Error(typeof msg === "string" ? msg : `Upload failed (${r.status})`);
      }
      if (data?.resume) {
        onUpload?.(data.resume);
        onSuccess?.();
      }
    } catch (e) {
      let msg = e.message || "Upload failed";
      if (r?.status === 401) msg = "Please log in again";
      else if (r?.status === 500 && typeof data?.detail === "string") msg = data.detail;
      else if (e.name === "TypeError" && (e.message?.includes("fetch") || e.message?.includes("network"))) msg = "Backend not reachable. Is it running on port 8000?";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--secondary)] mb-1.5">
        Resume
      </label>
      {currentResume && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
            {currentResume.filename}
          </p>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            title="Delete resume"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      )}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          mt-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all
          ${dragging ? "border-[var(--accent)] bg-orange-50/50 dark:bg-orange-950/20" : "border-stone-300 dark:border-stone-600"}
          hover:border-[var(--accent)] hover:bg-stone-50 dark:hover:bg-stone-800/50
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="w-10 h-10 mx-auto text-[var(--accent)] animate-spin" />
        ) : (
          <Upload className="w-10 h-10 mx-auto text-[var(--secondary)]" />
        )}
        <p className="mt-2 text-sm text-[var(--secondary)]">
          {uploading ? "Processing..." : currentResume ? "Drop new file to replace" : "Drop PDF/DOCX or click to upload"}
        </p>
        <p className="text-xs text-stone-500 mt-1">Claude will parse your resume</p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete resume?"
          message="Match scores and cover letters will no longer use it. You can upload a new resume anytime."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
