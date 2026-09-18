"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type UserRole = "employee" | "manager" | "admin";

type ProjectStatus = "Active" | "Completed" | "Planning";

type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  members: number;
  updated: string;
};

type ApiProject = {
  projectId: string;
  name: string;
  description?: string;
  status?: string;
  members?: number;
  updatedAt?: string;
};

type ApiProjectsResponse = {
  projects?: ApiProject[];
};

type ApiMeResponse = {
  userId?: string;
  id?: string;
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

  return "Unable to load dashboard.";
}

function normalizeRole(role?: string): UserRole {
  if (
    role === "admin" ||
    role === "manager" ||
    role === "employee"
  ) {
    return role;
  }

  return "employee";
}

function formatRole(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
function getRoleLabel(role: UserRole): string {
  if (role === "admin") {
    return "Organization Owner";
  }

  if (role === "manager") {
    return "Workspace Manager";
  }

  return "Workspace Member";
}

export default function DashboardPage() {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");

  const [userRole, setUserRole] =
    useState<UserRole>("employee");
  const [loadingRole, setLoadingRole] = useState(true);

  const [userEmail, setUserEmail] =
    useState("TeamGate User");

  const canCreateProject =
    userRole === "manager" || userRole === "admin";

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoadingProjects(true);
        setLoadingRole(true);
        setProjectError("");

        const [meData, projectsData] =
          await Promise.all([
            apiFetch("/me") as Promise<ApiMeResponse>,

            apiFetch("/projects") as Promise<
              ApiProject[] | ApiProjectsResponse
            >,
          ]);

        /* USER ROLE */
        const realRole = normalizeRole(meData?.role);
        setUserRole(realRole);

        /* USER EMAIL */
        setUserEmail(
          meData?.email || "TeamGate User"
        );

        /* PROJECTS */
        const projectList = Array.isArray(projectsData)
          ? projectsData
          : projectsData.projects ?? [];

        const formattedProjects: Project[] =
          projectList.map(
            (project: ApiProject) => ({
              id: project.projectId,
              name: project.name,
              description:
                project.description || "",

              status:
                project.status?.toLowerCase() ===
                "completed"
                  ? "Completed"
                  : project.status?.toLowerCase() ===
                      "planning"
                    ? "Planning"
                    : "Active",

              members: project.members || 0,

              updated: project.updatedAt
                ? new Date(
                    project.updatedAt
                  ).toLocaleDateString()
                : "Recently",
            })
          );

        setProjects(formattedProjects);
      } catch (error: unknown) {
        console.error(
          "Failed to load dashboard:",
          error
        );

        setProjectError(
          getErrorMessage(error)
        );
      } finally {
        setLoadingProjects(false);
        setLoadingRole(false);
      }
    }

    loadDashboard();
  }, []);

  const filteredProjects = projects.filter(
    (project) =>
      project.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      project.description
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const welcomeName = userEmail.includes("@")
    ? userEmail.split("@")[0]
    : userEmail;

  const avatarLetter =
    userEmail !== "TeamGate User"
      ? userEmail.charAt(0).toUpperCase()
      : "T";

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

    /* DOCUMENTS */

    {
      name: "Documents",

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
            d="M6 3h8l4 4v14H6V3z"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 3v5h5M9 13h6M9 17h6"
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

    if (name === "Projects") {
      router.push("/dashboard/projects");
    }

    if (name === "Documents") {
      router.push("/dashboard/documents");
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

          {/* Logo */}

          <div className="flex h-[76px] items-center border-b border-white/[0.07] px-6">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 shadow-lg shadow-blue-950/20">
                <span className="text-lg font-bold text-blue-400">
                  T
                </span>
              </div>

              <div>
                <h1 className="text-[18px] font-bold tracking-tight">
                  Team
                  <span className="text-blue-500">
                    Gate
                  </span>
                </h1>

                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  Workspace
                </p>
              </div>

            </div>
          </div>

          {/* Navigation */}

          <div className="flex-1 px-4 py-7">

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
              Workspace
            </p>

            <nav className="space-y-1.5">

              {menuItems.map((item) => {
                const active =
                  activeMenu === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() =>
                      handleMenuClick(
                        item.name
                      )
                    }
                    className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-blue-600/12 text-blue-400 shadow-inner shadow-blue-500/5"
                        : "text-gray-500 hover:bg-white/[0.035] hover:text-gray-200"
                    }`}
                  >

                    <span
                      className={`transition ${
                        active
                          ? "text-blue-400"
                          : "text-gray-600 group-hover:text-gray-300"
                      }`}
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

            {/* Quick Action */}

            {!loadingRole &&
              canCreateProject && (
                <div className="mt-10">

                  <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                    Quick action
                  </p>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/projects/new"
                      )
                    }
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm text-gray-400 transition hover:border-blue-500/20 hover:bg-blue-500/[0.06] hover:text-white"
                  >

                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
                      +
                    </span>

                    New project

                  </button>

                </div>
              )}

          </div>

          {/* User profile */}

          <div className="border-t border-white/[0.07] p-4">

            <button
              onClick={() =>
                router.push(
                  "/dashboard/settings"
                )
              }
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.035]"
            >

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold shadow-lg shadow-blue-950/30">
                {avatarLetter}
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-medium text-gray-200">
                  {userEmail}
                </p>

                <p className="text-xs text-blue-400">
  {loadingRole
    ? "Loading..."
    : getRoleLabel(userRole)}
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

        {/* MAIN CONTENT */}

        <section className="ml-[250px] min-h-screen flex-1">

          {/* TOP BAR */}

          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#030712]/90 px-8 backdrop-blur-xl">

            {/* Search */}

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
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search projects..."
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-blue-500/30 focus:bg-white/[0.04]"
              />

            </div>

            {/* Header right */}

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

                  <p className="max-w-[180px] truncate text-sm font-medium text-gray-200">
                    {userEmail}
                  </p>

                  <p className="text-[11px] text-blue-400">
  {loadingRole
    ? "Loading..."
    : getRoleLabel(userRole)}
</p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                  {avatarLetter}
                </div>

              </div>

            </div>

          </header>

          {/* PAGE CONTENT */}

          <div className="px-8 py-9">

            {/* Heading */}

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <div>

                <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-blue-500">
                  Overview
                </p>

                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  Welcome back,{" "}
                  {welcomeName}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Here&apos;s what&apos;s happening in your workspace.
                </p>

              </div>

              {/* Only Manager/Admin */}

              {!loadingRole &&
                canCreateProject && (
                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/projects/new"
                      )
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 hover:shadow-blue-900/30 active:scale-[0.98]"
                  >
                    <span className="text-lg leading-none">
                      +
                    </span>

                    New project

                  </button>
                )}

            </div>

            {/* STAT CARDS */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <StatCard
                label="Total projects"
                value={String(
                  projects.length
                )}
                change="Workspace total"
                icon="projects"
              />

              <StatCard
                label="Active projects"
                value={String(
                  projects.filter(
                    (project) =>
                      project.status ===
                      "Active"
                  ).length
                )}
                change="Currently active"
                icon="active"
              />

              <StatCard
                label="Completed"
                value={String(
                  projects.filter(
                    (project) =>
                      project.status ===
                      "Completed"
                  ).length
                )}
                change="Completed projects"
                icon="completed"
              />

              <StatCard
                label="Team members"
                value="—"
                change="Available to admin"
                icon="team"
              />

            </div>

            {/* PROJECTS SECTION */}

            <div className="mt-8 rounded-2xl border border-white/[0.07] bg-[#070b14] shadow-xl shadow-black/10">

              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">

                <div>

                  <h3 className="text-base font-semibold text-gray-100">
                    Recent projects
                  </h3>

                  <p className="mt-1 text-xs text-gray-600">
                    Your latest workspace activity
                  </p>

                </div>

                <button
                  onClick={() =>
                    router.push(
                      "/dashboard/projects"
                    )
                  }
                  className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
                >
                  View all
                </button>

              </div>

              <div className="divide-y divide-white/[0.05]">

                {loadingProjects ? (

                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading projects...
                  </div>

                ) : projectError ? (

                  <div className="px-6 py-10 text-center">

                    <p className="text-sm text-red-400">
                      {projectError}
                    </p>

                    <button
                      onClick={() =>
                        window.location.reload()
                      }
                      className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
                    >
                      Try again
                    </button>

                  </div>

                ) : filteredProjects.length ===
                  0 ? (

                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No projects found.
                  </div>

                ) : (

                  filteredProjects.map(
                    (project) => (

                      <button
                        key={project.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${project.id}`
                          )
                        }
                        className="group flex w-full items-center gap-5 px-6 py-5 text-left transition hover:bg-white/[0.025]"
                      >

                        {/* Project icon */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/[0.07] text-blue-400">

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

                        {/* Name */}

                        <div className="min-w-0 flex-1">

                          <h4 className="truncate text-sm font-medium text-gray-200 transition group-hover:text-white">
                            {project.name}
                          </h4>

                          <p className="mt-1 truncate text-xs text-gray-600">
                            {project.description}
                          </p>

                        </div>

                        {/* Members */}

                        <div className="hidden w-24 text-sm text-gray-500 md:block">
                          {project.members}{" "}
                          members
                        </div>

                        {/* Status */}

                        <StatusBadge
                          status={
                            project.status
                          }
                        />

                        {/* Updated */}

                        <div className="hidden w-20 text-right text-xs text-gray-600 lg:block">
                          {project.updated}
                        </div>

                        {/* Arrow */}

                        <svg
                          className="h-4 w-4 text-gray-700 transition group-hover:translate-x-1 group-hover:text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>

                      </button>

                    )
                  )

                )}

              </div>

            </div>

            {/* BOTTOM INFO */}

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              {/* Role Card */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#070b14] p-6">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-wider text-gray-600">
                      Your role
                    </p>

                    <h3 className="mt-2 text-xl font-semibold text-white">
  {loadingRole
    ? "Loading..."
    : getRoleLabel(userRole)}
</h3>

                    <p className="mt-2 text-xs leading-5 text-gray-600">

                      {userRole ===
                      "admin"
                        ? "You can manage projects, delete projects, control workspace roles, and manage documents."
                        : userRole ===
                            "manager"
                          ? "You can view, create, and edit projects and manage workspace documents."
                          : "You can view projects and ask questions about workspace documents."}

                    </p>

                  </div>

                  <div className="rounded-lg border border-blue-500/15 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">

                    {loadingRole
                      ? "Loading"
                      : userRole ===
                          "admin"
                        ? "Full access"
                        : userRole ===
                            "manager"
                          ? "Manage projects"
                          : "View only"}

                  </div>

                </div>

              </div>

              {/* Access Control */}

              <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-blue-950/20 to-[#070b14] p-6">

                <p className="text-xs uppercase tracking-wider text-gray-600">
                  Access control
                </p>

                <h3 className="mt-2 text-xl font-semibold text-white">
                  Protected workspace
                </h3>

                <p className="mt-2 text-xs leading-5 text-gray-600">
                  TeamGate automatically
                  controls actions based on
                  your assigned role.
                </p>

              </div>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

/* STAT CARD */

function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-[#070b14] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/15 hover:bg-[#090f1b]">

      <div className="flex items-start justify-between">

        <p className="text-xs font-medium text-gray-500">
          {label}
        </p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
            icon === "completed"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/15"
              : "border-blue-500/15 bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/15"
          }`}
        >

          {icon === "projects" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 8h3M8 12h3M8 16h3M14 8h2M14 12h2M14 16h2"
              />
            </svg>
          )}

          {icon === "active" && (
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
                d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"
              />

              <circle
                cx="12"
                cy="12"
                r="4"
              />
            </svg>
          )}

          {icon === "completed" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12.5l4.5 4.5L19 7.5"
              />
            </svg>
          )}

          {icon === "team" && (
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
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
              />

              <circle
                cx="9"
                cy="7"
                r="4"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              />
            </svg>
          )}

        </div>

      </div>

      <div className="mt-5 flex items-end justify-between">

        <p className="text-3xl font-semibold tracking-tight text-white">
          {value}
        </p>

        <p className="text-[11px] text-gray-600">
          {change}
        </p>

      </div>

    </div>
  );
}

/* STATUS BADGE */

function StatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  const styles: Record<
    ProjectStatus,
    string
  > = {
    Active:
      "border-blue-500/15 bg-blue-500/10 text-blue-400",

    Completed:
      "border-emerald-500/15 bg-emerald-500/10 text-emerald-400",

    Planning:
      "border-amber-500/15 bg-amber-500/10 text-amber-400",
  };

  return (
    <span
      className={`hidden rounded-lg border px-2.5 py-1.5 text-[11px] font-medium sm:inline-flex ${styles[status]}`}
    >
      {status}
    </span>
  );
}