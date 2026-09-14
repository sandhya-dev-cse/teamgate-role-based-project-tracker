"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signIn,
  signOut,
  getCurrentUser,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      configureAmplify();

      /*
       * Clear any existing Cognito session.
       * This allows switching between Admin, Manager and Employee
       * test accounts.
       */
      try {
        await getCurrentUser();
        await signOut();
      } catch {
        // No existing session.
      }

      const result = await signIn({
        username: email.trim().toLowerCase(),
        password,
      });

      console.log("Cognito sign-in result:", result);

      /*
       * Normal login.
       */
      if (result.isSignedIn) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      /*
       * User needs to complete the first-login password challenge.
       *
       * This happens for users created by the Admin through
       * Cognito admin_create_user().
       */
      if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        sessionStorage.setItem(
          "teamgate_new_password_email",
          email.trim().toLowerCase()
        );

        router.replace("/set-password");
        return;
      }

      /*
       * Signup confirmation.
       */
      if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_UP"
      ) {
        sessionStorage.setItem(
          "signup_email",
          email.trim().toLowerCase()
        );

        router.replace("/confirm-signup");
        return;
      }

      setError(
        "Additional verification is required. Please try again."
      );
    } catch (error: unknown) {
      console.error("Login failed:", error);

      if (error instanceof Error) {
        if (
          error.name ===
          "UserNotConfirmedException"
        ) {
          sessionStorage.setItem(
            "signup_email",
            email.trim().toLowerCase()
          );

          router.replace("/confirm-signup");
          return;
        }

        if (
          error.name ===
          "NotAuthorizedException"
        ) {
          setError(
            "Incorrect email or password."
          );
        } else if (
          error.name ===
          "UserNotFoundException"
        ) {
          setError(
            "No account found with this email."
          );
        } else {
          setError(
            error.message ||
              "Unable to sign in."
          );
        }
      } else {
        setError(
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <div className="flex min-h-screen">

        {/* Left side */}
        <section className="hidden w-1/2 flex-col justify-between border-r border-white/10 bg-[#07101f] p-12 lg:flex">

          <div>
            <h1 className="text-2xl font-bold">
              Team
              <span className="text-blue-500">
                Gate
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Internal Project Tracker
            </p>
          </div>

          <div className="max-w-md">

            <p className="text-sm font-medium text-blue-400">
              Secure workspace
            </p>

            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Manage projects with
              <span className="text-blue-500">
                {" "}role-based access.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-6 text-slate-400">
              TeamGate uses AWS Cognito authentication
              and server-side authorization to protect
              your workspace.
            </p>

          </div>

          <p className="text-xs text-slate-600">
            TeamGate · AWS powered project tracker
          </p>

        </section>

        {/* Login */}
        <section className="flex flex-1 items-center justify-center px-6 py-12">

          <div className="w-full max-w-md">

            <div className="mb-8 lg:hidden">

              <h1 className="text-2xl font-bold">
                Team
                <span className="text-blue-500">
                  Gate
                </span>
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Internal Project Tracker
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a1426] p-8 shadow-2xl">

              <div className="mb-8">

                <h2 className="text-2xl font-semibold">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Sign in to continue to your workspace.
                </p>

              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  />

                </div>

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-[#050914] px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>

              </form>

              <div className="mt-6 text-center text-sm text-slate-500">

                Don&apos;t have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    router.push("/signup")
                  }
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  Create account
                </button>

              </div>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}