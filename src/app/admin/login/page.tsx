import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
          Admin sign in
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Enter the admin password to view the dashboard.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
