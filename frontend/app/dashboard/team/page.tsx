"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type UserRole = "employee" | "manager" | "admin";

type TeamUser = {
  userId: string;
  email: string;
  role: UserRole;
  orgId?: string;
  createdAt?: string;
};

const roleInfo: Record<
  UserRole,
  {
    label: string;
    description: string;
  }
> = {
  admin: {
    label: "Organization Owner",
    description: "Full access to projects, documents, members and roles.",
  },
  manager: {
    label: "Workspace Manager",
    description: "Can create and edit projects and manage documents.",
  },
  employee: {
    label: "Workspace Member",
    description: "Can view projects and ask questions about documents.",
  },
};

function getRoleLabel(role: UserRole) {
  return roleInfo[role]?.label || role;
}

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<UserRole>("employee");

  const [selectedUser, setSelectedUser] =
    useState<TeamUser | null>(null);

  const [newRole, setNewRole] =
    useState<UserRole>("employee");

  const [inviteLoading, setInviteLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  async function loadTeam() {
    try {
      setLoading(true);
      setError("");

      const me = await apiFetch("/me");

      const meUser: TeamUser = {
        userId: me.userId,
        email: me.email,
        role: me.role,
        orgId: me.orgId,
        createdAt: me.createdAt,
      };

      setCurrentUser(meUser);

      if (me.role !== "admin") {
        setUsers([meUser]);
        return;
      }

      const data = await apiFetch("/users");

      const teamUsers: TeamUser[] =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
          ? data.users
          : [];

      setUsers(teamUsers);
    } catch (err: unknown) {
      console.error("Failed to load team:", err);

      if (err instanceof Error) {
        setError(err.message || "Unable to load team.");
      } else {
        setError("Unable to load team.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  function openInviteModal() {
    setInviteEmail("");
    setInviteRole("employee");
    setSuccessMessage("");
    setError("");
    setShowInviteModal(true);
  }

  function closeInviteModal() {
    if (inviteLoading) return;

    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("employee");
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setError("Please enter the member's email address.");
      return;
    }

    try {
      setInviteLoading(true);
      setError("");
      setSuccessMessage("");

      await apiFetch("/invites", {
        method: "POST",
        body: JSON.stringify({
          email,
          role: inviteRole,
        }),
      });

      setSuccessMessage(
        `Invitation sent successfully to ${email}. The invited member can use the temporary password from the invitation email and set a new password when they first log in.`
      );

      setInviteEmail("");

      await loadTeam();
    } catch (err: unknown) {
      console.error("Invite failed:", err);

      if (err instanceof Error) {
        setError(err.message || "Unable to send invitation.");
      } else {
        setError("Unable to send invitation.");
      }
    } finally {
      setInviteLoading(false);
    }
  }

  function openRoleModal(user: TeamUser) {
    if (!currentUser) return;

    if (user.userId === currentUser.userId) {
      setError("You cannot change your own role.");
      return;
    }

    setSelectedUser(user);
    setNewRole(user.role);
    setError("");
    setSuccessMessage("");
    setShowRoleModal(true);
  }

  function closeRoleModal() {
    if (roleLoading) return;

    setShowRoleModal(false);
    setSelectedUser(null);
  }

  async function handleRoleChange() {
    if (!selectedUser) return;

    try {
      setRoleLoading(true);
      setError("");
      setSuccessMessage("");

      await apiFetch(
        `/users/${selectedUser.userId}/role`,
        {
          method: "PUT",
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      setSuccessMessage(
        `${selectedUser.email}'s role was updated to ${getRoleLabel(
          newRole
        )}.`
      );

      setShowRoleModal(false);
      setSelectedUser(null);

      await loadTeam();
    } catch (err: unknown) {
      console.error("Role change failed:", err);

      if (err instanceof Error) {
        setError(
          err.message || "Unable to update member role."
        );
      } else {
        setError("Unable to update member role.");
      }
    } finally {
      setRoleLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            <p className="text-sm text-slate-400">
              Loading team...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                TeamGate
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Team
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Manage your organization members and their access
              levels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={() => {
      window.location.href = "/dashboard";
    }}
    className="rounded-xl border border-slate-700 bg-[#0a1020] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-900 hover:text-white"
  >
    Dashboard
  </button>

  {isAdmin && (
    <button
      type="button"
      onClick={openInviteModal}
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 active:scale-[0.98]"
    >
      + Invite Member
    </button>
  )}
</div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Current user */}
        {currentUser && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Your account
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {currentUser.email}
                </p>
              </div>

              <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                {getRoleLabel(currentUser.role)}
              </span>
            </div>
          </div>
        )}

        {/* Team list */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Organization members
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {users.length} member
                  {users.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-400">
                No team members found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {users.map((user) => {
                const isCurrentUser =
                  currentUser?.userId === user.userId;

                return (
                  <div
                    key={user.userId}
                    className="flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-blue-400">
                        {user.email
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {user.email}
                          </p>

                          {isCurrentUser && (
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              You
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {roleInfo[user.role]?.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          user.role === "admin"
                            ? "border-purple-500/20 bg-purple-500/10 text-purple-300"
                            : user.role === "manager"
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                            : "border-slate-600 bg-slate-800/60 text-slate-300"
                        }`}
                      >
                        {getRoleLabel(user.role)}
                      </span>

                      {isAdmin && !isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => openRoleModal(user)}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                        >
                          Change role
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permission information */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              <h3 className="text-sm font-semibold">
                Organization Owner
              </h3>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Full access to projects, documents, invitations,
              members and role management.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <h3 className="text-sm font-semibold">
                Workspace Manager
              </h3>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Can create and edit projects, upload documents
              and ask questions about documents.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0a1020] p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              <h3 className="text-sm font-semibold">
                Workspace Member
              </h3>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Can view projects and documents and ask
              questions about available documents.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0a1020] p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Invite team member
              </h2>

              <p className="mt-2 text-sm leading-5 text-slate-400">
               Enter the member&apos;s email and assign their role.
                They will receive an invitation with a temporary
                password.
              </p>
            </div>

            <form onSubmit={handleInvite}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email address
              </label>

              <input
                type="email"
                value={inviteEmail}
                onChange={(event) =>
                  setInviteEmail(event.target.value)
                }
                placeholder="member@example.com"
                disabled={inviteLoading}
                className="w-full rounded-xl border border-slate-700 bg-[#050816] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                required
              />

              <label className="mb-3 mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Select role
              </label>

              <div className="grid gap-2">
                {/* ADMIN */}
                <button
                  type="button"
                  onClick={() => setInviteRole("admin")}
                  disabled={inviteLoading}
                  className={`rounded-xl border p-4 text-left transition ${
                    inviteRole === "admin"
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-slate-800 bg-[#050816] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Admin
                    </span>

                    {inviteRole === "admin" && (
                      <span className="text-xs text-purple-300">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Full organization access and role management.
                  </p>
                </button>

                {/* MANAGER */}
                <button
                  type="button"
                  onClick={() => setInviteRole("manager")}
                  disabled={inviteLoading}
                  className={`rounded-xl border p-4 text-left transition ${
                    inviteRole === "manager"
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-slate-800 bg-[#050816] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Manager
                    </span>

                    {inviteRole === "manager" && (
                      <span className="text-xs text-blue-300">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Can create and edit projects and upload documents.
                  </p>
                </button>

                {/* EMPLOYEE */}
                <button
                  type="button"
                  onClick={() => setInviteRole("employee")}
                  disabled={inviteLoading}
                  className={`rounded-xl border p-4 text-left transition ${
                    inviteRole === "employee"
                      ? "border-slate-500/50 bg-slate-800/60"
                      : "border-slate-800 bg-[#050816] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Employee
                    </span>

                    {inviteRole === "employee" && (
                      <span className="text-xs text-slate-300">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Can view projects and ask questions about documents.
                  </p>
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
                <p className="text-xs leading-5 text-slate-400">
                  No public sign-up is required. The invited member
                  will use the invitation email and temporary
                  password, then create a new password during their
                  first login.
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeInviteModal}
                  disabled={inviteLoading}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inviteLoading
                    ? "Sending..."
                    : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0a1020] p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Change member role
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Update the access level for{" "}
                <span className="font-medium text-slate-200">
                  {selectedUser.email}
                </span>
                .
              </p>
            </div>

            <div className="grid gap-2">
              {(
                ["admin", "manager", "employee"] as UserRole[]
              ).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewRole(role)}
                  disabled={roleLoading}
                  className={`rounded-xl border p-4 text-left transition ${
                    newRole === role
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-slate-800 bg-[#050816] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      {getRoleLabel(role)}
                    </span>

                    {newRole === role && (
                      <span className="text-xs text-blue-300">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {roleInfo[role].description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeRoleModal}
                disabled={roleLoading}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRoleChange}
                disabled={roleLoading}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roleLoading
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