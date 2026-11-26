import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass glass-strong glass-sheen w-full max-w-sm rounded-3xl p-6">
        <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
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
