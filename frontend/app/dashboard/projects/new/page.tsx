"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ProjectStatus = "Active" | "Planning" | "Completed";

export default function NewProjectPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Planning");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }

    if (projectName.trim().length < 3) {
      setError("Project name must contain at least 3 characters.");
      return;
    }

    if (description.length > 500) {
      setError("Description must be 500 characters or less.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          description: description.trim(),
          status,
        }),
      });

      router.push("/dashboard/projects");
    } catch (error: unknown) {
      console.error("Create project failed:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to create project. Please try again.");
      }

      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;

    router.push("/dashboard/projects");
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="border-b border-white/10 bg-[#071025]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-blue-400">
              Project Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Create New Project
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Add a new project to your TeamGate workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to Projects
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Form */}
          <section className="rounded-2xl border border-white/10 bg-[#0a1020] p-6 shadow-2xl shadow-black/20">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Project Details
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Enter the basic information for your new project.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <label
                  htmlFor="projectName"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Project Name
                  <span className="ml-1 text-red-400">*</span>
                </label>

                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  maxLength={100}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex justify-between">
                  <p className="text-xs text-slate-500">
                    Choose a clear and meaningful name.
                  </p>

                  <span className="text-xs text-slate-600">
                    {projectName.length}/100
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this project is about..."
                  rows={6}
                  maxLength={500}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#050816] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex justify-between">
                  <p className="text-xs text-slate-500">
                    Keep the description short and useful.
                  </p>

                  <span className="text-xs text-slate-600">
                    {description.length}/500
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Project Status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ProjectStatus)
                  }
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating...
                    </span>
                  ) : (
                    "Create Project"
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Side information */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 to-[#0a1020] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v18M3 12h18"
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-white">
                Create a project
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Projects help your team organize work and keep track of
                important activities in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-6">
              <h3 className="font-semibold text-white">Access & Permissions</h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400" />

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Employee
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Can view projects.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400" />

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Manager
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Can create and edit projects.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400" />

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Admin
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Has full project management access.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-6">
              <h3 className="font-semibold text-white">Quick Tips</h3>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  Use a descriptive project name.
                </li>

                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  Add a short description so your team understands the goal.
                </li>

                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  Choose the correct initial status.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>

                <div>
                  <p className="text-sm font-medium text-emerald-300">
                    Backend Connected
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Project data will be securely stored in TeamGate.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}