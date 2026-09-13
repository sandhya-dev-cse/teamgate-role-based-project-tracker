"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ProjectStatus = "planning" | "active" | "completed";

type ApiProject = {
  projectId: string;
  name: string;
  description?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiProjectsResponse = {
  projects?: ApiProject[];
  items?: ApiProject[];
};

function normalizeStatus(status?: string): ProjectStatus {
  const value = status?.toLowerCase();

  if (value === "completed") {
    return "completed";
  }

  if (value === "active") {
    return "active";
  }

  return "planning";
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();

  const [projectId, setProjectId] = useState("");

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");

  const [loadingProject, setLoadingProject] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Get project ID from the URL.
   *
   * Expected URL:
   * /dashboard/projects/6230c27d-15d7-4a95-9960-9a77c0edd038/edit
   */
  useEffect(() => {
    let id = "";

    if (typeof params?.projectId === "string") {
      id = params.projectId;
    } else if (Array.isArray(params?.projectId)) {
      id = params.projectId[0] || "";
    }

    /*
     * Extra fallback:
     * If Next.js params does not provide the value,
     * read it directly from the browser URL.
     */
    if (!id && typeof window !== "undefined") {
      const parts = window.location.pathname.split("/");

      const editIndex = parts.indexOf("edit");

      if (editIndex > 0) {
        id = parts[editIndex - 1] || "";
      }
    }

    console.log("EDIT PAGE PROJECT ID:", id);

    setProjectId(id);
  }, [params]);

  /*
   * Load the selected project
   */
  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        setError("Project ID is missing.");
        setLoadingProject(false);
        return;
      }

      try {
        setError("");

        console.log("Loading project:", projectId);

        const data = (await apiFetch("/projects")) as
          | ApiProject[]
          | ApiProjectsResponse;

        let projects: ApiProject[] = [];

        if (Array.isArray(data)) {
          projects = data;
        } else if (Array.isArray(data.projects)) {
          projects = data.projects;
        } else if (Array.isArray(data.items)) {
          projects = data.items;
        }

        console.log("Projects received:", projects);

        const project = projects.find(
          (item) => item.projectId === projectId
        );

        if (!project) {
          console.error("Project not found:", projectId);

          setError("Project not found.");
          setLoadingProject(false);
          return;
        }

        console.log("Project found:", project);

        setProjectName(project.name || "");
        setDescription(project.description || "");
        setStatus(normalizeStatus(project.status));
      } catch (error: unknown) {
        console.error("Failed to load project:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load the project."
        );
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [projectId]);

  /*
   * Save changes
   */
  const handleSubmit = async () => {
    console.log("========== SAVE STARTED ==========");
    console.log("Project ID:", projectId);
    console.log("Project Name:", projectName);
    console.log("Description:", description);
    console.log("Status:", status);

    setError("");
    setSuccess("");

    if (!projectId) {
      console.log("STOPPED: Project ID is missing");
      setError("Project ID is missing.");
      return;
    }

    if (!projectName.trim()) {
      console.log("STOPPED: Project name is empty");
      setError("Project name is required.");
      return;
    }

    if (projectName.trim().length < 3) {
      console.log("STOPPED: Project name is too short");
      setError("Project name must contain at least 3 characters.");
      return;
    }

    console.log("Validation passed.");
    console.log("Calling PUT API...");

    setLoading(true);

    try {
      const result = await apiFetch(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: projectName.trim(),
          description: description.trim(),
          status: status,
        }),
      });

      console.log("PUT API SUCCESS:", result);

      setSuccess("Project updated successfully.");

      setTimeout(() => {
        router.push("/dashboard/projects");
        router.refresh();
      }, 800);
    } catch (error: unknown) {
      console.error("PUT API ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update the project. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) {
      return;
    }

    router.push("/dashboard/projects");
  };

  /*
   * Loading screen
   */
  if (loadingProject) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

          <p className="text-sm text-slate-400">
            Loading project...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[250px] flex-col border-r border-white/10 bg-[#070b18] lg:flex">
          <div className="flex h-20 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-600/20">
                T
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Team<span className="text-blue-500">Gate</span>
                </h1>

                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Workspace
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Main menu
            </p>

            <div className="space-y-1">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">⌂</span>
                Dashboard
              </button>

              <button
                onClick={() => router.push("/dashboard/projects")}
                className="flex w-full items-center gap-3 rounded-xl bg-blue-600/15 px-3 py-3 text-sm font-semibold text-blue-400 ring-1 ring-blue-500/20"
              >
                <span className="text-lg">▣</span>
                Projects
              </button>

              <button
                onClick={() => router.push("/dashboard/team")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">♙</span>
                Team
              </button>

              <button
                onClick={() => router.push("/dashboard/settings")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">⚙</span>
                Settings
              </button>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400">
                S
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Sandhya
                </p>

                <p className="text-xs text-slate-500">
                  TeamGate User
                </p>
              </div>

              <button className="ml-auto text-slate-500 transition hover:text-white">
                ⋮
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* TOP BAR */}
          <header className="flex h-20 items-center justify-between border-b border-white/10 bg-[#060a16]/80 px-5 backdrop-blur-xl md:px-8">
            <div>
              <p className="text-xs text-slate-500">
                Projects
              </p>

              <h2 className="text-lg font-semibold text-white">
                Edit project
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 md:flex">
                <span className="text-slate-500">⌕</span>

                <input
                  type="text"
                  placeholder="Search..."
                  className="w-36 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />

                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-600">
                  /
                </span>
              </div>

              <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
                ♧
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
              </button>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400 ring-1 ring-blue-500/20">
                S
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
              {/* Breadcrumb */}
              <div className="mb-8 flex items-center gap-2 text-sm">
                <button
                  onClick={() => router.push("/dashboard/projects")}
                  className="text-slate-500 transition hover:text-white"
                >
                  Projects
                </button>

                <span className="text-slate-700">/</span>

                <span className="max-w-[220px] truncate text-slate-500">
                  {projectName || "Project"}
                </span>

                <span className="text-slate-700">/</span>

                <span className="text-slate-300">
                  Edit
                </span>
              </div>

              {/* Heading */}
              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-xl text-blue-400">
                  ✎
                </div>

                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Edit project
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Update the project information and keep your team up to
                  date.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* FORM */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  className="rounded-2xl border border-white/10 bg-[#090e1d] p-6 shadow-2xl shadow-black/20 md:p-8"
                >
                  <div className="mb-7">
                    <h2 className="text-lg font-semibold text-white">
                      Project information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Modify the details of this project.
                    </p>
                  </div>

                  {/* ERROR */}
                  {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400">
                        !
                      </div>

                      <p className="text-sm text-red-300">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* SUCCESS */}
                  {success && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                        ✓
                      </div>

                      <p className="text-sm text-emerald-300">
                        {success}
                      </p>
                    </div>
                  )}

                  {/* NAME */}
                  <div className="mb-6">
                    <label
                      htmlFor="projectName"
                      className="mb-2 block text-sm font-medium text-slate-200"
                    >
                      Project name
                      <span className="ml-1 text-blue-400">*</span>
                    </label>

                    <input
                      id="projectName"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-blue-500/[0.03] focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="mb-6">
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
                      maxLength={500}
                      rows={5}
                      disabled={loading}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-blue-500/[0.03] focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <div className="mt-2 flex justify-end">
                      <span className="text-xs text-slate-600">
                        {description.length}/500
                      </span>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div className="mb-8">
                    <label className="mb-3 block text-sm font-medium text-slate-200">
                      Project status
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* PLANNING */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStatus("planning")}
                        className={`rounded-xl border p-4 text-left transition ${
                          status === "planning"
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20"
                            : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />

                          {status === "planning" && (
                            <span className="text-xs text-blue-400">
                              ✓
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-white">
                          Planning
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Project is being planned
                        </p>
                      </button>

                      {/* ACTIVE */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStatus("active")}
                        className={`rounded-xl border p-4 text-left transition ${
                          status === "active"
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20"
                            : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                          {status === "active" && (
                            <span className="text-xs text-blue-400">
                              ✓
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-white">
                          Active
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Work has started
                        </p>
                      </button>

                      {/* COMPLETED */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStatus("completed")}
                        className={`rounded-xl border p-4 text-left transition ${
                          status === "completed"
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20"
                            : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />

                          {status === "completed" && (
                            <span className="text-xs text-blue-400">
                              ✓
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-white">
                          Completed
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Project is already finished
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="h-11 rounded-xl border border-white/10 bg-white/[0.02] px-5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:shadow-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving changes...
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          Save changes
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* RIGHT SIDE */}
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-[#090e1d] p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      ▣
                    </div>

                    <h3 className="font-semibold text-white">
                      Editing project
                    </h3>

                    <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                      {projectName || "Project"}
                    </p>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <p className="text-xs text-slate-500">
                        Project ID
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-slate-300">
                        {projectId || "Loading..."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      ✓
                    </div>

                    <h3 className="font-semibold text-white">
                      Access control
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Managers and Admins can edit projects. Employees have
                      view-only access.
                    </p>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <p className="text-xs text-slate-500">
                        API protection
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-400">
                        JWT + Role Based Access
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-sm text-amber-400">
                        !
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-amber-300">
                          Before saving
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Make sure the project information is accurate before
                          saving your changes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                  >
                    ← Back to projects
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-white/5 pt-6">
                <p className="text-center text-xs text-slate-600">
                  TeamGate • Role-based project management
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}