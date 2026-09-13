"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type UserRole = "employee" | "manager" | "admin";

type ProjectStatus = "active" | "planning" | "completed";

type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  members: number;
  createdAt: string;
  updatedAt: string;
};

type ApiProject = {
  projectId: string;
  name: string;
  description?: string;
  status?: string;
  createdBy?: string;
  members?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ApiProjectsResponse = {
  projects?: ApiProject[];
  items?: ApiProject[];
};

type MeResponse = {
  userId?: string;
  email?: string;
  role?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const possibleError = error as { message?: unknown };

    if (typeof possibleError.message === "string") {
      return possibleError.message;
    }
  }

  return "Unable to load project.";
}

function normalizeRole(role?: string): UserRole {
  const value = role?.toLowerCase();

  if (value === "admin") {
    return "admin";
  }

  if (value === "manager") {
    return "manager";
  }

  return "employee";
}

function normalizeStatus(status?: string): ProjectStatus {
  const value = status?.toLowerCase();

  if (value === "completed") {
    return "completed";
  }

  if (value === "planning") {
    return "planning";
  }

  return "active";
}

function formatDate(date?: string): string {
  if (!date) {
    return "Recently";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toLocaleDateString();
}

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("employee");

  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const [pageError, setPageError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rawProjectId = params?.projectsId;

  const projectId =
    typeof rawProjectId === "string"
      ? rawProjectId
      : Array.isArray(rawProjectId)
        ? rawProjectId[0]
        : "";

  useEffect(() => {
    async function loadPage() {
      if (!projectId) {
        setPageError("Project ID is missing.");
        setLoading(false);
        setRoleLoading(false);
        return;
      }

      try {
        setLoading(true);
        setRoleLoading(true);
        setPageError("");

        const [meData, projectsData] = await Promise.all([
          apiFetch("/me") as Promise<MeResponse>,
          apiFetch("/projects") as Promise<
            ApiProject[] | ApiProjectsResponse
          >,
        ]);

        // Get the real logged-in user's role
        setUserRole(normalizeRole(meData?.role));

        // Get project list
        const projectList = Array.isArray(projectsData)
          ? projectsData
          : projectsData.projects ?? projectsData.items ?? [];

        const foundProject = projectList.find(
          (item) => item.projectId === projectId
        );

        if (!foundProject) {
          setProject(null);
          setPageError("Project not found.");
          return;
        }

        const formattedProject: Project = {
          id: foundProject.projectId,
          name: foundProject.name || "Untitled project",
          description: foundProject.description || "",
          status: normalizeStatus(foundProject.status),
          owner: foundProject.createdBy || "Unknown",
          members: foundProject.members || 0,
          createdAt: formatDate(foundProject.createdAt),
          updatedAt: formatDate(foundProject.updatedAt),
        };

        setProject(formattedProject);
      } catch (error: unknown) {
        console.error("Failed to load project:", error);
        setPageError(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRoleLoading(false);
      }
    }

    loadPage();
  }, [projectId]);

  const handleDelete = async () => {
    if (!project || userRole !== "admin") {
      return;
    }

    try {
      setDeleting(true);
      setPageError("");

      await apiFetch(`/projects/${project.id}`, {
        method: "DELETE",
      });

      setShowDeleteModal(false);

      router.push("/dashboard/projects");
      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to delete project:", error);
      setPageError(getErrorMessage(error));
      setDeleting(false);
    }
  };

  const statusConfig = {
    active: {
      label: "Active",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    planning: {
      label: "Planning",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-400",
    },
    completed: {
      label: "Completed",
      className:
        "border-blue-500/20 bg-blue-500/10 text-blue-400",
    },
  };

  if (loading || roleLoading) {
    return (
      <main className="min-h-screen bg-[#050914] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading project...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#050914] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-xl font-bold text-red-400">
              !
            </div>

            <h1 className="text-xl font-bold">
              Project not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {pageError ||
                "The project you are looking for does not exist or may have been removed."}
            </p>

            <button
              onClick={() => router.push("/dashboard/projects")}
              className="mt-6 h-11 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </main>
    );
  }

  const status = statusConfig[project.status];

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-[250px] shrink-0 border-r border-white/10 bg-[#070c16] lg:flex lg:flex-col">

          <div className="flex h-20 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20">
                T
              </div>

              <div>
                <h1 className="text-base font-bold tracking-wide">
                  TeamGate
                </h1>

                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Project Tracker
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Workspace
            </p>

            <div className="space-y-1">

              {/* DASHBOARD */}
              <button
                onClick={() => router.push("/dashboard")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
              >
                <span className="w-5 text-center">⌂</span>
                Dashboard
              </button>

              {/* PROJECTS */}
              <button
                onClick={() => router.push("/dashboard/projects")}
                className="flex w-full items-center gap-3 rounded-xl bg-blue-600/10 px-3 py-3 text-sm font-semibold text-blue-400"
              >
                <span className="w-5 text-center">▦</span>
                Projects
              </button>

              {/* TEAM */}
              <button
                onClick={() => router.push("/dashboard/team")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
              >
                <span className="w-5 text-center">♙</span>
                Team
              </button>

              {/* SETTINGS */}
              <button
                onClick={() => router.push("/dashboard/settings")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
              >
                <span className="w-5 text-center">⚙</span>
                Settings
              </button>
            </div>
          </nav>

          {/* ROLE */}
          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.05] p-4">

              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Current role
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-slate-200">
                  {userRole}
                </span>

                <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-blue-400">
                  Access
                </span>
              </div>

            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="min-w-0 flex-1">

          {/* TOP BAR */}
          <header className="flex h-20 items-center justify-between border-b border-white/10 bg-[#070c16]/80 px-5 backdrop-blur-xl sm:px-8">

            <div>
              <p className="text-xs text-slate-600">
                Projects / Details
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-100">
                Project Details
              </h2>
            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-200">
                  TeamGate User
                </p>

                <p className="text-xs capitalize text-slate-600">
                  {userRole}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-blue-400">
                T
              </div>

            </div>
          </header>

          {/* PAGE */}
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

            {/* BACK */}
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-200"
            >
              <span className="text-lg">←</span>
              Back to Projects
            </button>

            {/* ERROR */}
            {pageError && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {pageError}
              </div>
            )}

            {/* PROJECT HEADER */}
            <section className="rounded-2xl border border-white/10 bg-[#0a111e] shadow-2xl shadow-black/20">

              <div className="border-b border-white/10 p-6 sm:p-8">

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                  <div className="min-w-0">

                    <div className="mb-4 flex flex-wrap items-center gap-3">

                      <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold tracking-wide text-blue-400">
                        TG-{project.id.slice(0, 8).toUpperCase()}
                      </span>

                      <span
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>

                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {project.name}
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                      {project.description ||
                        "No project description available."}
                    </p>

                  </div>

                  {/* ACTIONS */}
                  <div className="flex shrink-0 gap-3">

                    {(userRole === "manager" ||
                      userRole === "admin") && (
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${project.id}/edit`
                          )
                        }
                        className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <span>✎</span>
                        Edit
                      </button>
                    )}

                    {userRole === "admin" && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 text-sm font-semibold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10"
                      >
                        <span>×</span>
                        Delete
                      </button>
                    )}

                  </div>

                </div>
              </div>

              {/* PROJECT INFORMATION */}
              <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">

                <div className="bg-[#0a111e] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Owner
                  </p>

                  <p className="mt-2 break-all text-sm font-semibold text-slate-200">
                    {project.owner}
                  </p>
                </div>

                <div className="bg-[#0a111e] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Team members
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {project.members} members
                  </p>
                </div>

                <div className="bg-[#0a111e] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Created
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {project.createdAt}
                  </p>
                </div>

                <div className="bg-[#0a111e] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Last updated
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {project.updatedAt}
                  </p>
                </div>

              </div>
            </section>

            {/* ACCESS CONTROL */}
            <section className="mt-6 grid gap-6 lg:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-[#0a111e] p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                    ✓
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Your access
                    </h3>

                    <p className="text-xs capitalize text-slate-600">
                      {userRole} permissions
                    </p>
                  </div>

                </div>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <span className="text-sm text-slate-400">
                      View projects
                    </span>

                    <span className="text-xs font-semibold text-emerald-400">
                      Allowed
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">

                    <span className="text-sm text-slate-400">
                      Create / Edit
                    </span>

                    <span
                      className={`text-xs font-semibold ${
                        userRole === "employee"
                          ? "text-slate-600"
                          : "text-emerald-400"
                      }`}
                    >
                      {userRole === "employee"
                        ? "Restricted"
                        : "Allowed"}
                    </span>

                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">

                    <span className="text-sm text-slate-400">
                      Delete project
                    </span>

                    <span
                      className={`text-xs font-semibold ${
                        userRole === "admin"
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    >
                      {userRole === "admin"
                        ? "Allowed"
                        : "Restricted"}
                    </span>

                  </div>

                </div>
              </div>

              {/* STATUS */}
              <div className="rounded-2xl border border-white/10 bg-[#0a111e] p-6">

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Project status
                </p>

                <div className="mt-5">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-semibold text-slate-300">
                      Current status
                    </span>

                    <span
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>

                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">

                    <div
                      className={`h-full rounded-full bg-blue-500 ${
                        project.status === "completed"
                          ? "w-full"
                          : project.status === "active"
                            ? "w-2/3"
                            : "w-1/3"
                      }`}
                    />

                  </div>

                  <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                    <span>Planning</span>
                    <span>Active</span>
                    <span>Completed</span>
                  </div>

                </div>
              </div>

            </section>

            {/* NOTE */}
            <div className="mt-6 rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-5">

              <div className="flex gap-3">

                <div className="mt-0.5 text-blue-400">
                  i
                </div>

                <div>

                  <p className="text-sm font-semibold text-slate-300">
                    Role-based access is enabled
                  </p>

                  <p className="mt-1 text-xs leading-6 text-slate-600">
                    TeamGate controls project actions based on the
                    user&apos;s role. Employees have view-only access,
                    managers can create and edit projects, and
                    administrators have full project control.
                  </p>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && userRole === "admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl shadow-black/50">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-lg font-bold text-red-400">
                !
              </div>

              <div>

                <h2 className="text-lg font-bold text-white">
                  Delete project?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-300">
                    {project.name}
                  </span>
                  ? This action cannot be undone.
                </p>

              </div>

            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete project"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}