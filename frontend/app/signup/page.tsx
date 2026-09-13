"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    // Check empty fields
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // Check password length
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Configure AWS Cognito
      configureAmplify();

      // Create Cognito account
      const result = await signUp({
        username: email.trim().toLowerCase(),
        password,
        options: {
          userAttributes: {
            email: email.trim().toLowerCase(),
            name: name.trim(),
          },
        },
      });

      console.log("Cognito signup result:", result);

      // Save email temporarily for confirmation page
      sessionStorage.setItem(
        "teamgate_signup_email",
        email.trim().toLowerCase()
      );

      /*
       * Cognito may require email confirmation.
       * We will create the confirmation page next.
       */
      if (
        result.nextStep.signUpStep ===
        "CONFIRM_SIGN_UP"
      ) {
        router.push("/confirm-signup");
        return;
      }

      // If confirmation is not required
      router.push("/login");
    } catch (err: unknown) {
      console.error("Signup error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to create your account.";

      if (
        message.toLowerCase().includes("usernameexists")
      ) {
        setError(
          "An account with this email already exists."
        );
      } else if (
        message.toLowerCase().includes("invalidpassword")
      ) {
        setError(
          "Password does not meet the required security rules."
        );
      } else if (
        message.toLowerCase().includes("invalidparameter")
      ) {
        setError(
          "Please check your name, email and password."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-6 py-10 text-white">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/15">
            <span className="text-2xl font-bold text-blue-400">
              T
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Team<span className="text-blue-500">Gate</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Role-based access control
          </p>
        </div>

        {/* Signup Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0b1120] p-7 shadow-2xl shadow-black/30">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-semibold">
              Create your account
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Join your TeamGate workspace.
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >

            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Full name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-[#050a16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Email address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-[#050a16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-white/10 bg-[#050a16] px-4 py-3 pr-16 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-xs font-medium text-gray-400 transition hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Confirm password
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm your password"
                  className="w-full rounded-xl border border-white/10 bg-[#050a16] px-4 py-3 pr-16 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-xs font-medium text-gray-400 transition hover:text-white"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium text-blue-400 transition hover:text-blue-300"
            >
              Sign in
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          TeamGate • Secure role-based project management
        </p>
      </div>
    </main>
  );
}