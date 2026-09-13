"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type UserRole = "employee" | "manager" | "admin";

type ProjectStatus = "Active" | "Planning" | "Completed";

type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  members: number;
  updated: string;
  owner: string;
};

type ApiProject = {
  projectId: string;
  name: string;
  description?: string;
  status?: string;
  createdBy?: string;
  updatedAt?: string;
};

type ApiResponse =
  | ApiProject[]
  | {
      projects?: ApiProject[];
      items?: ApiProject[];
    };

type MeResponse = {
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
};

export default function ProjectsPage() {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState("Projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");

  const [userRole, setUserRole] = useState<UserRole>("employee");
  const [roleLoading, setRoleLoading] = useState(true);

  const canCreateProject =
    userRole === "manager" || userRole === "admin";

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoadingProjects(true);
        setRoleLoading(true);
        setProjectError("");

        const [meData, projectsData] = await Promise.all([
          apiFetch("/me") as Promise<MeResponse>,
          apiFetch("/projects") as Promise<ApiResponse>,
        ]);

        console.log("Current user:", meData);
        console.log("Projects API response:", projectsData);

        const role: UserRole =
          meData?.role === "admin" ||
          meData?.role === "manager" ||
          meData?.role === "employee"
            ? meData.role
            : "employee";

        setUserRole(role);

        let apiProjects: ApiProject[] = [];

        if (Array.isArray(projectsData)) {
          apiProjects = projectsData;
        } else if (Array.isArray(projectsData.projects)) {
          apiProjects = projectsData.projects;
        } else if (Array.isArray(projectsData.items)) {
          apiProjects = projectsData.items;
        }

        console.log("Projects received:", apiProjects);

        const formattedProjects: Project[] = apiProjects
          .filter((project) => project.projectId)
          .map((project) => ({
            id: project.projectId,
            name: project.name || "Untitled project",
            description: project.description || "",
            status:
              project.status?.toLowerCase() === "completed"
                ? "Completed"
                : project.status?.toLowerCase() === "planning"
                ? "Planning"
                : "Active",
            members: 0,
            updated: project.updatedAt
              ? new Date(project.updatedAt).toLocaleDateString()
              : "Recently",
            owner: project.createdBy || "Unknown",
          }));

        setProjects(formattedProjects);
      } catch (error: unknown) {
        console.error("Failed to load projects:", error);

        setProjectError(
          error instanceof Error
            ? error.message
            : "Unable to load projects. Please try again."
        );
      } finally {
        setLoadingProjects(false);
        setRoleLoading(false);
      }
    };

    loadPage();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        project.name.toLowerCase().includes(searchText) ||
        project.description.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const menuItems = [
    {
      name: "Dashboard",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6"
          />
        </svg>
      ),
    },
    {
      name: "Projects",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7h6l2 2h8v10H4V7z"
          />
        </svg>
      ),
    },
    {
      name: "Team",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          />
        </svg>
      ),
    },
    {
      name: "Settings",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 00-1.03-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 008.46 15a1.7 1.7 0 00-1.56-1.03H6v-2.4h.9a1.7 1.7 0 001.56-1.03 1.7 1.7 0 00-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 001.88.34A1.7 1.7 0 0012.73 5.7V5h2.4v.7a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 00-.34 1.88A1.7 1.7 0 0019.4 15z"
          />
        </svg>
      ),
    },
  ];

  const handleMenuClick = (name: string) => {
    setActiveMenu(name);

    if (name === "Dashboard") {
      router.push("/dashboard");
    }

    if (name === "Team") {
      router.push("/dashboard/team");
    }

    if (name === "Settings") {
      router.push("/dashboard/settings");
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 z-30 flex h-screen w-[250px] flex-col border-r border-white/[0.07] bg-[#070b14]">

          <div className="flex h-[76px] items-center border-b border-white/[0.07] px-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 shadow-lg shadow-blue-950/20">
                <span className="text-lg font-bold text-blue-400">
                  T
                </span>
              </div>

              <div className="text-left">
                <h1 className="text-[18px] font-bold tracking-tight">
                  Team<span className="text-blue-500">Gate</span>
                </h1>

                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  Workspace
                </p>
              </div>
            </button>
          </div>

          <div className="flex-1 px-4 py-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Workspace
            </p>

            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                const active = activeMenu === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => handleMenuClick(item.name)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-blue-600/12 text-blue-400 shadow-inner shadow-blue-500/5"
                        : "text-gray-500 hover:bg-white/[0.035] hover:text-gray-200"
                    }`}
                  >
                    <span
                      className={
                        active
                          ? "text-blue-400"
                          : "text-gray-600 group-hover:text-gray-300"
                      }
                    >
                      {item.icon}
                    </span>

                    {item.name}

                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* ADMIN / MANAGER ONLY */}
            {!roleLoading && canCreateProject && (
              <div className="mt-10">
                <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  Quick action
                </p>

                <button
                  onClick={() =>
                    router.push("/dashboard/projects/new")
                  }
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm text-gray-400 transition-all hover:border-blue-500/20 hover:bg-blue-500/[0.06] hover:text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
                    +
                  </span>

                  New project
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.07] p-4">
            <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.035]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold">
                S
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-200">
                  Sandhya
                </p>

                <p className="text-xs capitalize text-gray-600">
                  {userRole}
                </p>
              </div>

              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 9l6 6 6-6"
                />
              </svg>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="ml-[250px] min-h-screen flex-1">

          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#030712]/90 px-8 backdrop-blur-xl">

            <div className="relative w-[330px]">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m2.1-5.15a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z"
                />
              </svg>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-blue-500/30 focus:bg-white/[0.04]"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-gray-200">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.5-1.5V11a6.5 6.5 0 00-5.5-6.4V4a1 1 0 10-2 0v.6A6.5 6.5 0 005.5 11v4.5L4 17h5m6 0a3 3 0 01-6 0"
                  />
                </svg>

                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
              </button>

              <div className="h-6 w-px bg-white/[0.07]" />

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-gray-200">
                    Sandhya
                  </p>

                  <p className="text-[11px] capitalize text-gray-600">
                    {userRole}
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                  S
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-9">

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="transition hover:text-gray-300"
                  >
                    Dashboard
                  </button>

                  <span>/</span>

                  <span className="text-gray-400">
                    Projects
                  </span>
                </div>

                <h2 className="text-3xl font-semibold tracking-tight">
                  Projects
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  View and manage projects in your workspace.
                </p>
              </div>

              {/* ADMIN / MANAGER ONLY */}
              {!roleLoading && canCreateProject && (
                <button
                  onClick={() =>
                    router.push("/dashboard/projects/new")
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 active:scale-[0.98]"
                >
                  <span className="text-lg leading-none">
                    +
                  </span>
                  New project
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#070b14] p-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex gap-1 overflow-x-auto">
                {["All", "Active", "Planning", "Completed"].map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition ${
                        statusFilter === filter
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                          : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
                      }`}
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>

              <div className="px-3 text-xs text-gray-600">
                {loadingProjects
                  ? "Loading..."
                  : `${filteredProjects.length} projects`}
              </div>
            </div>

            {loadingProjects && (
              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#070b14] px-6 py-16 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />

                <p className="mt-4 text-sm text-gray-400">
                  Loading projects...
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  Connecting to your TeamGate workspace.
                </p>
              </div>
            )}

            {!loadingProjects && projectError && (
              <div className="mt-5 rounded-2xl border border-red-500/10 bg-red-500/[0.04] px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  !
                </div>

                <h3 className="mt-4 text-sm font-medium text-gray-300">
                  Unable to load projects
                </h3>

                <p className="mx-auto mt-2 max-w-md text-xs text-gray-600">
                  {projectError}
                </p>

                <button
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-gray-400 transition hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingProjects &&
              !projectError &&
              filteredProjects.length > 0 && (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group rounded-2xl border border-white/[0.07] bg-[#070b14] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/20 hover:bg-[#090f1b]"
                    >

                      <div className="flex items-start justify-between">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/[0.07] text-blue-400">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 7h6l2 2h8v10H4V7z"
                            />
                          </svg>
                        </div>

                        <StatusBadge status={project.status} />
                      </div>

                      <div className="mt-5">
                        <h3 className="text-base font-semibold text-gray-100 transition group-hover:text-white">
                          {project.name}
                        </h3>

                        <p className="mt-2 min-h-[40px] text-xs leading-5 text-gray-600">
                          {project.description || "No description provided."}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">

                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-gray-400">
                            {project.owner.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-600">
                              Owner
                            </p>

                            <p className="max-w-[120px] truncate text-xs text-gray-400">
                              {project.owner}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-gray-600">
                            Members
                          </p>

                          <p className="text-xs text-gray-400">
                            {project.members}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">

                        <span className="text-[10px] text-gray-700">
                          Updated {project.updated}
                        </span>

                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/projects/${project.id}`
                            )
                          }
                          className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-[11px] font-medium text-gray-500 transition hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          View project
                        </button>

                      </div>
                    </div>
                  ))}

                </div>
              )}

            {!loadingProjects &&
              !projectError &&
              filteredProjects.length === 0 && (
                <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#070b14] px-6 py-16 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-gray-600">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 10l4 4m0-4l-4 4m10-2a8 8 0 11-16 0 8 8 0 0116 0z"
                      />
                    </svg>
                  </div>

                  <h3 className="mt-4 text-sm font-medium text-gray-300">
                    No projects found
                  </h3>

                  <p className="mt-1 text-xs text-gray-600">
                    {projects.length === 0
                      ? canCreateProject
                        ? "Create your first project to get started."
                        : "No projects are available yet."
                      : "Try changing your search or status filter."}
                  </p>

                  {/* ADMIN / MANAGER ONLY */}
                  {projects.length === 0 && canCreateProject && (
                    <button
                      onClick={() =>
                        router.push("/dashboard/projects/new")
                      }
                      className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                    >
                      Create project
                    </button>
                  )}
                </div>
              )}

          </div>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  const styles: Record<ProjectStatus, string> = {
    Active:
      "border-blue-500/15 bg-blue-500/10 text-blue-400",
    Planning:
      "border-amber-500/15 bg-amber-500/10 text-amber-400",
    Completed:
      "border-emerald-500/15 bg-emerald-500/10 text-emerald-400",
  };

  return (
    <span
      className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}