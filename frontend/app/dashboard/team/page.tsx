"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type UserRole = "employee" | "manager" | "admin";

type ApiUser = {
  userId?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  createdAt?: string;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Invited";
  joined: string;
};

type UsersResponse =
  | ApiUser[]
  | {
      users?: ApiUser[];
      items?: ApiUser[];
    };

const roleInfo: Record<
  UserRole,
  {
    label: string;
    description: string;
  }
> = {
  employee: {
    label: "Employee",
    description: "Can view projects and project information.",
  },
  manager: {
    label: "Manager",
    description: "Can view, create and edit projects.",
  },
  admin: {
    label: "Admin",
    description:
      "Full access including deleting projects and managing roles.",
  },
};

export default function TeamPage() {
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<"all" | UserRole>("all");

  const [selectedMember, setSelectedMember] =
    useState<TeamMember | null>(null);

  const [newRole, setNewRole] =
    useState<UserRole>("employee");

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] =
    useState<UserRole>("employee");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);

  // ---------------------------------------------------------
  // Load current user + team members
  // ---------------------------------------------------------

  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        setError("");
        setIsRestricted(false);

        const me = (await apiFetch("/me")) as ApiUser;

        const myId = me.userId || me.id || "";

        const myRole: UserRole =
          me.role === "admin" ||
          me.role === "manager" ||
          me.role === "employee"
            ? me.role
            : "employee";

        setCurrentUserId(myId);
        setCurrentUserRole(myRole);

        // Only Admin can view all users.
        if (myRole !== "admin") {
          setIsRestricted(true);
          setMembers([]);
          return;
        }

        const data = (await apiFetch("/users")) as UsersResponse;

        let apiUsers: ApiUser[] = [];

        if (Array.isArray(data)) {
          apiUsers = data;
        } else if (Array.isArray(data.users)) {
          apiUsers = data.users;
        } else if (Array.isArray(data.items)) {
          apiUsers = data.items;
        }

        console.log("Users API response:", data);
        console.log("Users received:", apiUsers);

        const formattedMembers: TeamMember[] = apiUsers
          .filter((user) => user.userId || user.id)
          .map((user) => {
            const id = user.userId || user.id || "";

            const email = user.email || "No email";

            const name =
              user.name ||
              email
                .split("@")[0]
                .replace(/[._-]/g, " ")
                .replace(/\b\w/g, (letter) =>
                  letter.toUpperCase()
                );

            const role: UserRole =
              user.role === "admin" ||
              user.role === "manager" ||
              user.role === "employee"
                ? user.role
                : "employee";

            let joined = "Recently";

            if (user.createdAt) {
              const date = new Date(user.createdAt);

              if (!Number.isNaN(date.getTime())) {
                joined = date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              }
            }

            return {
              id,
              name,
              email,
              role,
              status: "Active",
              joined,
            };
          });

        setMembers(formattedMembers);
      } catch (err) {
        console.error("Failed to load team:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load team members.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, []);

  // ---------------------------------------------------------
  // Filter members
  // ---------------------------------------------------------

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        member.name.toLowerCase().includes(searchText) ||
        member.email.toLowerCase().includes(searchText);

      const matchesRole =
        roleFilter === "all" ||
        member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  // ---------------------------------------------------------
  // Stats
  // ---------------------------------------------------------

  const totalMembers = members.length;

  const activeMembers = members.filter(
    (member) => member.status === "Active"
  ).length;

  const managerCount = members.filter(
    (member) => member.role === "manager"
  ).length;

  const adminCount = members.filter(
    (member) => member.role === "admin"
  ).length;

  // ---------------------------------------------------------
  // Role modal
  // ---------------------------------------------------------

  const openRoleModal = (member: TeamMember) => {
    if (currentUserRole !== "admin") return;

    setSelectedMember(member);
    setNewRole(member.role);
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    if (updating) return;

    setShowRoleModal(false);
    setSelectedMember(null);
  };

  // ---------------------------------------------------------
  // Change role
  // ---------------------------------------------------------

  const handleRoleChange = async () => {
    if (!selectedMember) return;

    if (currentUserRole !== "admin") {
      setError("Only administrators can change user roles.");
      return;
    }

    if (newRole === selectedMember.role) return;

    try {
      setUpdating(true);
      setError("");

      await apiFetch(
        `/users/${selectedMember.id}/role`,
        {
          method: "PUT",
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === selectedMember.id
            ? {
                ...member,
                role: newRole,
              }
            : member
        )
      );

      setShowRoleModal(false);
      setSelectedMember(null);
    } catch (err) {
      console.error("Role update failed:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update user role.");
      }
    } finally {
      setUpdating(false);
    }
  };

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#050914] text-white">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-[250px] border-r border-white/10 bg-[#070b17] lg:block">
        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-900/30">
              T
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                TeamGate
              </h1>

              <p className="text-[11px] text-slate-500">
                Project Tracker
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Workspace
            </p>

            <div className="space-y-1">

              {/* Dashboard */}
              <button
                onClick={() => router.push("/dashboard")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">⌂</span>
                Dashboard
              </button>

              {/* Projects */}
              <button
                onClick={() =>
                  router.push("/dashboard/projects")
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">▣</span>
                Projects
              </button>

              {/* Team */}
              <button
                className="flex w-full items-center gap-3 rounded-xl bg-blue-600/15 px-3 py-3 text-sm font-medium text-blue-400 ring-1 ring-blue-500/20"
              >
                <span className="text-lg">♙</span>
                Team
              </button>

              {/* Settings */}
              <button
                onClick={() =>
                  router.push("/dashboard/settings")
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">⚙</span>
                Settings
              </button>
            </div>
          </nav>

          {/* Current user */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-xs font-bold text-blue-400">
                SD
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  TeamGate User
                </p>

                <p className="text-xs capitalize text-slate-500">
                  {currentUserRole}
                </p>
              </div>

            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="lg:ml-[250px]">

        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-white/10 bg-[#050914]/90 px-4 py-3 backdrop-blur-xl sm:px-8">

          <div>
            <p className="text-xs font-medium text-blue-400">
              Workspace
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Team Management
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* Mobile Dashboard Button */}
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-sm font-medium text-blue-400 transition hover:border-blue-500/40 hover:bg-blue-500/15 hover:text-blue-300 lg:hidden"
            >
              <svg
                className="h-4 w-4"
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

              <span className="hidden sm:inline">
                Dashboard
              </span>
            </button>

            {/* Notifications */}
            <button
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white sm:flex"
              title="Notifications"
            >
              ◌
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-xs font-bold text-blue-400">
                SD
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-medium">
                  TeamGate User
                </p>

                <p className="text-[10px] capitalize text-slate-500">
                  {currentUserRole}
                </p>
              </div>

            </div>
          </div>
        </header>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div className="p-5 sm:p-8">

          {/* Page Header */}
          <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Team members
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage your team members and control what they
                can do inside TeamGate.
              </p>
            </div>

            {currentUserRole === "admin" && (
              <button
                onClick={() =>
                  alert(
                    "Invite feature will be connected later."
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 active:scale-[0.98]"
              >
                <span className="text-lg">+</span>
                Invite member
              </button>
            )}
          </section>

          {/* =================================================
              RESTRICTED ACCESS
          ================================================== */}

          {!loading && isRestricted && (
            <section className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-6 sm:p-8">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-400">
                  i
                </div>

                <div className="flex-1">

                  <h3 className="text-lg font-semibold">
                    Team management is restricted
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Your current role is{" "}
                    <span className="font-semibold capitalize text-blue-400">
                      {currentUserRole}
                    </span>
                    . Only administrators can view all
                    workspace members and change user roles.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        router.push("/dashboard")
                      }
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500"
                    >
                      Back to Dashboard
                    </button>

                    <button
                      onClick={() =>
                        router.push("/dashboard/projects")
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      View Projects
                    </button>

                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =================================================
              ADMIN TEAM CONTENT
          ================================================== */}

          {!isRestricted && (
            <>

              {/* Error */}
              {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Stats */}
              <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-2xl border border-white/10 bg-[#090f1d] p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Total members
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {totalMembers}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    People in workspace
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#090f1d] p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Active members
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {activeMembers}
                  </p>

                  <p className="mt-1 text-xs text-emerald-400">
                    Currently active
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#090f1d] p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Managers
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {managerCount}
                  </p>

                  <p className="mt-1 text-xs text-blue-400">
                    Project management access
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#090f1d] p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Administrators
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {adminCount}
                  </p>

                  <p className="mt-1 text-xs text-purple-400">
                    Full workspace access
                  </p>
                </div>

              </section>

              {/* Search + Filters */}
              <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div className="relative w-full lg:max-w-md">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                    ⌕
                  </span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search members..."
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#090f1d] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "all",
                      "employee",
                      "manager",
                      "admin",
                    ] as const
                  ).map((role) => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      className={`rounded-xl px-4 py-2.5 text-xs font-medium transition ${
                        roleFilter === role
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                          : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {role === "all"
                        ? "All"
                        : roleInfo[role].label}
                    </button>
                  ))}
                </div>

              </section>

              {/* Team Table */}
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#090f1d]">

                <div className="border-b border-white/10 px-5 py-4 sm:px-6">

                  <h3 className="text-sm font-semibold">
                    Workspace members
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    {loading
                      ? "Loading members..."
                      : `${filteredMembers.length} member${
                          filteredMembers.length !== 1
                            ? "s"
                            : ""
                        } shown`}
                  </p>

                </div>

                {loading ? (
                  <div className="px-6 py-20 text-center">

                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />

                    <p className="mt-4 text-sm text-slate-500">
                      Loading team members...
                    </p>

                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="px-6 py-16 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-xl text-slate-600">
                      ⌕
                    </div>

                    <h3 className="mt-4 text-sm font-semibold">
                      No members found
                    </h3>

                    <p className="mt-2 text-xs text-slate-600">
                      Try changing your search or role filter.
                    </p>

                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">

                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col gap-5 px-5 py-5 transition hover:bg-white/[0.02] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                      >

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-xs font-bold text-blue-400 ring-1 ring-blue-500/10">
                            {getInitials(member.name)}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h4 className="truncate text-sm font-semibold">
                                {member.name}
                              </h4>

                              {member.id === currentUserId && (
                                <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-400">
                                  You
                                </span>
                              )}

                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {member.email}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-700">
                              Joined {member.joined}
                            </p>

                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">

                          <span
                            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                              member.role === "admin"
                                ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                                : member.role === "manager"
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                  : "border-slate-500/20 bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {roleInfo[member.role].label}
                          </span>

                          <span className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">

                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                            Active
                          </span>

                          {currentUserRole === "admin" &&
                            member.id !== currentUserId && (
                              <button
                                onClick={() =>
                                  openRoleModal(member)
                                }
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 active:scale-[0.98]"
                              >
                                Change role
                              </button>
                            )}

                        </div>
                      </div>
                    ))}

                  </div>
                )}

              </section>
            </>
          )}

          {/* =================================================
              ROLE INFORMATION
          ================================================== */}

          <section className="mt-8">

            <div className="mb-4">

              <h3 className="text-sm font-semibold">
                Role permissions
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                TeamGate uses role-based access control.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              {(Object.keys(roleInfo) as UserRole[]).map(
                (role) => (
                  <div
                    key={role}
                    className="rounded-2xl border border-white/10 bg-[#090f1d] p-5"
                  >

                    <span
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        role === "admin"
                          ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                          : role === "manager"
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                            : "border-slate-500/20 bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {roleInfo[role].label}
                    </span>

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      {roleInfo[role].description}
                    </p>

                    <div className="mt-4 space-y-2">

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-emerald-400">
                          ✓
                        </span>
                        View projects
                      </div>

                      {role !== "employee" && (
                        <>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-emerald-400">
                              ✓
                            </span>
                            Create projects
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-emerald-400">
                              ✓
                            </span>
                            Edit projects
                          </div>
                        </>
                      )}

                      {role === "admin" && (
                        <>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-emerald-400">
                              ✓
                            </span>
                            Delete projects
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-emerald-400">
                              ✓
                            </span>
                            Change user roles
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                )
              )}

            </div>
          </section>

          {/* Security Note */}
          <div className="mt-8 rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-5">

            <div className="flex gap-4">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                !
              </div>

              <div>

                <h4 className="text-sm font-semibold">
                  Role-based access control
                </h4>

                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                  TeamGate follows the rule: the UI hides
                  restricted actions, while the backend denies
                  unauthorized requests.
                </p>

              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-10 border-t border-white/5 py-6 text-center text-[11px] text-slate-700">
            TeamGate · Internal Project Tracker
          </footer>

        </div>
      </main>

      {/* =====================================================
          ROLE CHANGE MODAL
      ====================================================== */}

      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl">

            {/* Modal Header */}
            <div className="border-b border-white/10 px-6 py-5">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="text-lg font-semibold">
                    Change member role
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Update permissions for{" "}
                    {selectedMember.name}.
                  </p>

                </div>

                <button
                  onClick={closeRoleModal}
                  disabled={updating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  ×
                </button>

              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6">

              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">

                <p className="text-sm font-medium">
                  {selectedMember.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedMember.email}
                </p>

              </div>

              <label className="mb-2 block text-xs font-medium text-slate-400">
                Select new role
              </label>

              <div className="space-y-2">

                {(
                  [
                    "employee",
                    "manager",
                    "admin",
                  ] as UserRole[]
                ).map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    disabled={updating}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      newRole === role
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-sm font-medium">
                          {roleInfo[role].label}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {roleInfo[role].description}
                        </p>

                      </div>

                      <div
                        className={`h-4 w-4 rounded-full border ${
                          newRole === role
                            ? "border-blue-400 bg-blue-500"
                            : "border-slate-700"
                        }`}
                      />

                    </div>

                  </button>
                ))}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-white/10 px-6 py-5">

              <button
                onClick={closeRoleModal}
                disabled={updating}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleRoleChange}
                disabled={
                  updating ||
                  newRole === selectedMember.role
                }
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {updating
                  ? "Updating..."
                  : "Update role"}
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}