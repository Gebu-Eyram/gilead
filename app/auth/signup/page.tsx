"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/utils/types";

type Step = "details" | "verify";

export default function SignUpPage() {
  const router = useRouter();

  // Step
  const [step, setStep] = useState<Step>("details");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [role, setRole] = useState<UserRole>("applicant");

  // OTP
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — create account, Supabase sends OTP email
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          linkedin_url: linkedinUrl || null,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Supabase sends a 6-digit OTP to the email
    setStep("verify");
  }

  // Step 2 — verify the OTP code from email
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // Resend OTP
  async function handleResend() {
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) setError(error.message);
  }

  // ── Verify step ──────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {email}
            </span>
            . Enter it below to verify your account.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="otp"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Verification code
            </label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              className="tracking-widest text-center text-lg"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || otp.length < 8}
            className="mt-2 w-full"
          >
            {loading ? "Verifying…" : "Verify email"}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
            >
              Resend
            </button>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setOtp("");
            }}
            className="text-zinc-400 hover:underline"
          >
            ← Back to sign up
          </button>
        </div>
      </div>
    );
  }

  // ── Details step ─────────────────────────────────────────
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fill in your details to get started
        </p>
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fullName"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Full name
          </label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="linkedin"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            LinkedIn URL{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <Input
            id="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            autoComplete="url"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
