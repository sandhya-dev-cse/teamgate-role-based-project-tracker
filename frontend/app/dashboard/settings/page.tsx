"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify";

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function goTo(path: string) {
    router.push(path);
  }

  async function handleSignOut() {
    try {
      setLoggingOut(true);

      configureAmplify();

      await signOut();

      router.replace("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-white/10 bg-[#07101f] p-5 md:block">

          {/* Logo */}
          <div className="mb-10">
            <button
              onClick={() => goTo("/dashboard")}
              className="text-left"
            >
              <h1 className="text-xl font-bold tracking-tight">
                Team<span className="text-blue-500">Gate</span>
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Internal Project Tracker
              </p>
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">

            {/* Dashboard */}
            <button
              type="button"
              onClick={() => goTo("/dashboard")}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </button>

            {/* Projects */}
            <button
              type="button"
              onClick={() => goTo("/dashboard/projects")}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Projects
            </button>

            {/* Documents */}
            <button
              type="button"
              onClick={() => goTo("/dashboard/documents")}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Documents
            </button>

            {/* Team */}
            <button
              type="button"
              onClick={() => goTo("/dashboard/team")}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Team
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => goTo("/dashboard/settings")}
              className="w-full rounded-xl bg-blue-600/15 px-4 py-3 text-left text-sm font-medium text-blue-400"
            >
              Settings
            </button>

          </nav>

          {/* Back to Dashboard */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => goTo("/dashboard")}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              ← Back to Dashboard
            </button>
          </div>

        </aside>

        {/* Main content */}
        <section className="flex-1">

          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/10 bg-[#07101f]/80 px-6 py-5 backdrop-blur">

            <div>
              <h2 className="text-2xl font-semibold">
                Settings
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Manage your TeamGate account.
              </p>
            </div>

            {/* Mobile Dashboard button */}
            <button
              type="button"
              onClick={() => goTo("/dashboard")}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 md:hidden"
            >
              Dashboard
            </button>

          </header>

          <div className="mx-auto max-w-4xl p-6">

            {/* Account */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1426] p-6 shadow-xl">

              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  Account
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Manage your current signed-in account.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-5">

                <p className="text-sm font-medium text-white">
                  TeamGate account
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Your account is authenticated using AWS Cognito.
                </p>

              </div>

            </div>

            {/* Security */}
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-[#0a1426] p-6 shadow-xl">

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Security
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Sign out from this TeamGate account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>

            </div>

            {/* Backend information */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1426] p-6">

              <h3 className="text-lg font-semibold">
                TeamGate
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Role-based internal project tracker powered by AWS
                Cognito, API Gateway, Lambda and DynamoDB.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Authentication connected
              </div>

            </div>

          </div>

        </section>
      </div>
    </main>
  );
}