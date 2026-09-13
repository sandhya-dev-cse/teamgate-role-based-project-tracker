"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify";

type AuthError = {
  name?: string;
  message?: string;
};

function getErrorMessage(error: unknown): AuthError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
    const possibleError = error as {
      name?: unknown;
      message?: unknown;
    };

    return {
      name:
        typeof possibleError.name === "string"
          ? possibleError.name
          : undefined,
      message:
        typeof possibleError.message === "string"
          ? possibleError.message
          : undefined,
    };
  }

  return {};
}

export default function ConfirmSignupPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("teamgate_signup_email");

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  async function handleResendCode() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      configureAmplify();

      await resendSignUpCode({
        username: email.trim().toLowerCase(),
      });

      setMessage("A new verification code has been sent to your email.");
    } catch (err: unknown) {
      console.error("Resend verification code failed:", err);

      const authError = getErrorMessage(err);

      setError(
        authError.message || "Unable to resend the verification code."
      );
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      configureAmplify();

      const result = await confirmSignUp({
        username: email.trim().toLowerCase(),
        confirmationCode: code.trim(),
      });

      if (result.isSignUpComplete) {
        sessionStorage.removeItem("teamgate_signup_email");

        setMessage("Email verified successfully. Redirecting to login...");

        setTimeout(() => {
          router.push("/login");
        }, 1200);
      }
    } catch (err: unknown) {
      console.error("Email verification failed:", err);

      const authError = getErrorMessage(err);

      if (authError.name === "CodeMismatchException") {
        setError("Incorrect verification code.");
      } else if (authError.name === "ExpiredCodeException") {
        setError("This verification code has expired.");
      } else if (authError.name === "NotAuthorizedException") {
        setError("This account is already confirmed.");
      } else {
        setError(
          authError.message || "Verification failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold shadow-lg shadow-blue-600/20">
            T
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Verify your email
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Enter the verification code sent to your email address.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b0f18] p-7 shadow-2xl">
          {message && (
            <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-[#070a11] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="verification-code"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Verification code
              </label>

              <input
                id="verification-code"
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Enter 6-digit code"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-[#070a11] px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resend verification code
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-5 w-full text-center text-sm text-slate-400 transition hover:text-white"
          >
            Back to login
          </button>
        </div>
      </div>
    </main>
  );
}