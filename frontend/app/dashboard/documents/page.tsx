"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type DocumentItem = {
  documentId: string;
  fileName: string;
  contentType?: string;
  size?: number;
  uploadedBy?: string;
  uploadedByEmail?: string;
  createdAt?: string;
  chunkCount?: number;
};

type UserInfo = {
  email: string;
  role: string;
};

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === "admin";
  const canUpload =
    user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const me = await apiFetch("/me");

      setUser({
        email: me.email,
        role: String(me.role).toLowerCase(),
      });

      const result = await apiFetch("/documents");

      setDocuments(result.documents || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load documents.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "Size unavailable";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(date?: string) {
    if (!date) return "Unknown date";

    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  }

  function getFileIcon(fileName: string) {
    const extension =
      fileName.split(".").pop()?.toLowerCase();

    if (extension === "pdf") return "PDF";
    if (extension === "docx") return "DOC";
    if (extension === "txt") return "TXT";

    return "FILE";
  }

  async function uploadFile(file: File) {
    const extension =
      file.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "docx", "txt"].includes(extension || "")) {
      setError("Only PDF, DOCX and TXT files are supported.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setUploading(true);
      setUploadProgress(5);
      setUploadMessage("Preparing secure upload...");

      const uploadInfo = await apiFetch(
        "/documents/upload-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            contentType:
              file.type || "application/octet-stream",
          }),
        }
      );

      setUploadProgress(20);
      setUploadMessage("Uploading document...");

      await uploadToS3(
        uploadInfo.uploadUrl,
        file,
        file.type || "application/octet-stream"
      );

      setUploadProgress(70);
      setUploadMessage("Processing document...");

      await apiFetch(
        `/documents/${uploadInfo.documentId}/complete`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      setUploadProgress(100);
      setUploadMessage("Document uploaded successfully.");

      setSuccess(`${file.name} uploaded successfully.`);

      await loadPage();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Document upload failed. Please try again.";

      setError(message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadMessage("");
      }, 700);
    }
  }

  function uploadToS3(
    url: string,
    file: File,
    contentType: string
  ) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", url);

      xhr.setRequestHeader(
        "Content-Type",
        contentType
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent =
            20 +
            Math.round(
              (event.loaded / event.total) * 50
            );

          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `S3 upload failed: ${xhr.status}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new Error("Unable to upload file to storage.")
        );
      };

      xhr.send(file);
    });
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      uploadFile(file);
    }

    event.target.value = "";
  }

  async function deleteDocument(documentId: string) {
    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      await apiFetch(
        `/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      setSuccess("Document deleted successfully.");

      setDeleteId(null);

      await loadPage();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete document.";

      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function askQuestion() {
    const trimmed = question.trim();

    if (!trimmed) {
      setError("Please enter a question.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setAsking(true);
      setAnswer("");
      setSources([]);

      const result = await apiFetch(
        "/qa",
        {
          method: "POST",
          body: JSON.stringify({
            question: trimmed,
          }),
        }
      );

      setAnswer(
        result.answer ||
          "No answer was returned."
      );

      setSources(result.sources || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to get an AI answer.";

      setError(message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-4 text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold tracking-tight">
              Documents
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Upload documents and ask TeamGate AI questions
              about your workspace files.
            </p>
          </div>

          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploading}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading
                  ? "Uploading..."
                  : "+ Upload Document"}
              </button>
            </>
          )}
        </div>

        {/* ROLE INFO */}
        <div className="mb-6 rounded-2xl border border-blue-900/40 bg-[#0a1428] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Signed in as
              </p>

              <p className="mt-1 text-sm text-slate-200">
                {user?.email || "Loading..."}
              </p>
            </div>

            <div className="rounded-full border border-blue-700/40 bg-blue-950/60 px-4 py-2 text-xs font-semibold uppercase text-blue-300">
              {user?.role || "Loading"}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {isAdmin
              ? "Admin: upload, delete and ask questions."
              : user?.role === "manager"
              ? "Manager: upload documents and ask questions."
              : "Employee: ask questions about workspace documents."}
          </p>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* UPLOAD PROGRESS */}
        {uploading && (
          <div className="mb-6 rounded-2xl border border-blue-900/50 bg-[#0a1428] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                {uploadMessage}
              </span>

              <span className="text-sm text-blue-400">
                {uploadProgress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* AI QUESTION BOX */}
        <section className="mb-8 rounded-2xl border border-blue-900/40 bg-gradient-to-br from-[#0b1830] to-[#070e1c] p-6 shadow-xl shadow-black/20">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              TeamGate AI
            </p>

            <h2 className="mt-2 text-xl font-bold">
              Ask about your documents
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Ask a question and TeamGate AI will search the
              uploaded document content.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              placeholder="Example: What are the project requirements?"
              className="flex-1 rounded-xl border border-slate-700 bg-[#050b18] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />

            <button
              onClick={askQuestion}
              disabled={asking}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {asking
                ? "Thinking..."
                : "Ask AI"}
            </button>
          </div>

          {(asking || answer) && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-[#050b18] p-5">
              {asking ? (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
                  Searching documents and generating answer...
                </div>
              ) : (
                <>
                  <h3 className="mb-3 text-sm font-semibold text-blue-400">
                    AI Answer
                  </h3>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {answer}
                  </p>

                  {sources.length > 0 && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Sources
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {sources.map(
                          (source, index) => (
                            <span
                              key={`${source}-${index}`}
                              className="rounded-lg border border-blue-900/50 bg-blue-950/30 px-3 py-2 text-xs text-blue-300"
                            >
                              {source}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* DOCUMENT LIST */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Workspace Documents
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {documents.length} document
                {documents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0a1428] p-10 text-center text-sm text-slate-500">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0a1428] p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950/50 text-sm font-bold text-blue-400">
                DOC
              </div>

              <h3 className="text-lg font-semibold">
                No documents yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {canUpload
                  ? "Upload a PDF, DOCX or TXT file to get started."
                  : "No documents have been uploaded to this workspace yet."}
              </p>

              {canUpload && (
                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-5 rounded-xl border border-blue-700/50 bg-blue-950/40 px-5 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-900/40"
                >
                  Upload First Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => (
                <div
                  key={document.documentId}
                  className="group rounded-2xl border border-slate-800 bg-[#0a1428] p-5 transition hover:border-blue-800/70 hover:bg-[#0c172d]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-900/50 bg-blue-950/40 text-[10px] font-bold text-blue-400">
                        {getFileIcon(
                          document.fileName
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white">
                          {document.fileName}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatSize(
                            document.size
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2.5 py-1 text-[10px] font-semibold uppercase text-emerald-400">
                      Ready
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between gap-3">
                      <span>Chunks</span>
                      <span className="text-slate-300">
                        {document.chunkCount || 0}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Uploaded by</span>
                      <span className="max-w-[180px] truncate text-slate-300">
                        {document.uploadedByEmail ||
                          "Unknown"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Uploaded</span>
                      <span className="text-right text-slate-300">
                        {formatDate(
                          document.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() =>
                        setDeleteId(
                          document.documentId
                        )
                      }
                      className="mt-5 w-full rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-950/40"
                    >
                      Delete Document
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0a1428] p-6 shadow-2xl">
            <h2 className="text-xl font-bold">
              Delete document?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              This will permanently remove the document,
              its stored file and its processed text.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  deleteDocument(deleteId)
                }
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}